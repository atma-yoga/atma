"use server";

import { revalidatePath } from "next/cache";

import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type EstadoTurma = { erro: string } | { sucesso: string } | undefined;

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

async function ehAdmin() {
  const sessao = await getSessao();
  return Boolean(sessao?.papeis.includes("admin"));
}

/**
 * Cria ou atualiza uma turma junto com os dias em que ela se encontra.
 *
 * Os dias são regravados por completo a cada salvamento: é mais simples de
 * raciocinar do que tentar casar o que mudou, e a turma tem poucos dias.
 * Os encontros removidos levam junto nada — as aulas já geradas apontam para
 * a turma, não para o encontro.
 */
export async function salvarTurma(
  _anterior: EstadoTurma,
  form: FormData,
): Promise<EstadoTurma> {
  if (!(await ehAdmin())) {
    return { erro: "Apenas a administração pode mexer nas turmas." };
  }

  const id = String(form.get("id") ?? "");
  const nome = String(form.get("nome") ?? "").trim();
  const professor = String(form.get("professor") ?? "");
  const sala = String(form.get("sala") ?? "");
  const capacidade = Number(form.get("capacidade") || 12);
  const hora = String(form.get("hora") ?? "").trim();
  const duracao = Number(form.get("duracao") || 60);
  const dias = form.getAll("dias").map((d) => Number(d));

  if (!nome) return { erro: "Dê um nome à turma." };
  if (!HORA.test(hora)) return { erro: "Horário deve estar no formato HH:MM." };
  if (duracao < 15 || duracao > 240) {
    return { erro: "Duração deve ficar entre 15 e 240 minutos." };
  }
  if (capacidade < 1 || capacidade > 99) {
    return { erro: "Capacidade deve ficar entre 1 e 99." };
  }
  if (!dias.length) {
    return { erro: "Escolha ao menos um dia da semana." };
  }
  if (dias.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
    return { erro: "Dia da semana inválido." };
  }

  const supabase = await createClient();

  const campos = {
    name: nome,
    teacher_id: professor || null,
    room_id: sala || null,
    capacity: capacidade,
  };

  let turmaId = id;

  if (id) {
    const { error } = await supabase.from("classes").update(campos).eq("id", id);
    if (error) return { erro: `Não foi possível salvar: ${error.message}` };
  } else {
    const { data, error } = await supabase
      .from("classes")
      .insert(campos)
      .select("id")
      .single();

    if (error || !data) {
      return { erro: `Não foi possível criar: ${error?.message ?? "erro"}` };
    }
    turmaId = data.id;
  }

  // Reduzir a capacidade abaixo do número de matriculados deixaria a turma
  // acima do limite sem ninguém perceber, então avisamos em vez de aceitar.
  const { count: matriculados } = await supabase
    .from("class_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("class_id", turmaId)
    .eq("is_active", true);

  if ((matriculados ?? 0) > capacidade) {
    return {
      erro: `A turma já tem ${matriculados} alunos; a capacidade não pode ser ${capacidade}.`,
    };
  }

  await supabase.from("class_meetings").delete().eq("class_id", turmaId);

  const { error: erroDias } = await supabase.from("class_meetings").insert(
    dias.map((weekday) => ({
      class_id: turmaId,
      weekday,
      start_time: `${hora}:00`,
      duration_min: duracao,
    })),
  );

  if (erroDias) return { erro: `Dias não salvos: ${erroDias.message}` };

  revalidatePath("/admin/grade");
  return { sucesso: id ? "Turma atualizada." : `Turma "${nome}" criada.` };
}

/** Tira a turma da grade sem apagar histórico de aulas e matrículas. */
export async function alternarTurma(form: FormData) {
  if (!(await ehAdmin())) return;

  const id = String(form.get("id") ?? "");
  const ativar = String(form.get("ativar") ?? "") === "1";
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("classes").update({ is_active: ativar }).eq("id", id);

  revalidatePath("/admin/grade");
}

/** Coloca um aluno na turma. O limite é imposto pelo banco. */
export async function matricular(form: FormData): Promise<void> {
  if (!(await ehAdmin())) return;

  const classId = String(form.get("turma") ?? "");
  const studentId = String(form.get("aluno") ?? "");
  if (!classId || !studentId) return;

  const supabase = await createClient();

  // Se a pessoa já esteve na turma e saiu, reativamos em vez de duplicar.
  const { data: antiga } = await supabase
    .from("class_enrollments")
    .select("id")
    .eq("class_id", classId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (antiga) {
    await supabase
      .from("class_enrollments")
      .update({ is_active: true })
      .eq("id", antiga.id);
  } else {
    await supabase
      .from("class_enrollments")
      .insert({ class_id: classId, student_id: studentId });
  }

  revalidatePath(`/admin/grade/${classId}`);
  revalidatePath("/admin/grade");
}

export async function desmatricular(form: FormData): Promise<void> {
  if (!(await ehAdmin())) return;

  const id = String(form.get("matricula") ?? "");
  const classId = String(form.get("turma") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("class_enrollments")
    .update({ is_active: false })
    .eq("id", id);

  revalidatePath(`/admin/grade/${classId}`);
  revalidatePath("/admin/grade");
}

/** Materializa as turmas em aulas concretas para os próximos `dias`. */
export async function gerarAulas(form: FormData): Promise<void> {
  if (!(await ehAdmin())) return;

  const dias = Math.min(Math.max(Number(form.get("dias") || 30), 1), 180);
  const hoje = new Date();
  const fim = new Date(hoje.getTime() + dias * 864e5);

  const supabase = await createClient();
  await supabase.rpc("generate_sessions", {
    range_start: hoje.toISOString().slice(0, 10),
    range_end: fim.toISOString().slice(0, 10),
  });

  revalidatePath("/admin/grade");
  revalidatePath("/admin");
}
