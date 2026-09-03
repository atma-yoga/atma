"use server";

import { revalidatePath } from "next/cache";

import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type EstadoGrade = { erro: string } | { sucesso: string } | undefined;

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

async function exigirAdmin() {
  const sessao = await getSessao();
  if (!sessao?.papeis.includes("admin")) return null;
  return sessao;
}

/**
 * As políticas de RLS já barram quem não é admin em `class_schedules`, mas a
 * checagem aqui vem antes para devolver uma mensagem legível em vez de um
 * erro do Postgres.
 */
export async function salvarHorario(
  _anterior: EstadoGrade,
  form: FormData,
): Promise<EstadoGrade> {
  if (!(await exigirAdmin())) {
    return { erro: "Apenas a administração pode mexer na grade." };
  }

  const id = String(form.get("id") ?? "");
  const weekday = Number(form.get("weekday"));
  const hora = String(form.get("hora") ?? "").trim();
  const duracao = Number(form.get("duracao") || 60);
  const capacidade = Number(form.get("capacidade") || 0);
  const sala = String(form.get("sala") ?? "");
  const professor = String(form.get("professor") ?? "");
  const titulo = String(form.get("titulo") ?? "").trim();

  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return { erro: "Dia da semana inválido." };
  }
  if (!HORA.test(hora)) return { erro: "Horário deve estar no formato HH:MM." };
  if (duracao < 15 || duracao > 240) {
    return { erro: "Duração deve ficar entre 15 e 240 minutos." };
  }
  if (capacidade < 1) return { erro: "Capacidade precisa ser ao menos 1." };

  const supabase = await createClient();

  const campos = {
    weekday,
    start_time: `${hora}:00`,
    duration_min: duracao,
    capacity: capacidade,
    room_id: sala || null,
    teacher_id: professor || null,
    title: titulo || null,
  };

  const { error } = id
    ? await supabase.from("class_schedules").update(campos).eq("id", id)
    : await supabase.from("class_schedules").insert(campos);

  if (error) return { erro: `Não foi possível salvar: ${error.message}` };

  revalidatePath("/admin/agenda");
  return { sucesso: id ? "Horário atualizado." : "Horário adicionado." };
}

/**
 * Tira o horário da grade sem apagar a linha: as aulas já geradas e os
 * agendamentos feitos continuam apontando para ela. Desativar preserva o
 * histórico; remover de verdade o quebraria.
 */
export async function desativarHorario(form: FormData) {
  if (!(await exigirAdmin())) return;

  const id = String(form.get("id") ?? "");
  const ativar = String(form.get("ativar") ?? "") === "1";
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("class_schedules")
    .update({ is_active: ativar })
    .eq("id", id);

  revalidatePath("/admin/agenda");
}

/** Materializa a grade em aulas concretas para os próximos `dias`. */
export async function gerarAulas(form: FormData): Promise<void> {
  if (!(await exigirAdmin())) return;

  const dias = Math.min(Math.max(Number(form.get("dias") || 30), 1), 180);
  const hoje = new Date();
  const fim = new Date(hoje.getTime() + dias * 864e5);

  const supabase = await createClient();
  await supabase.rpc("generate_sessions", {
    range_start: hoje.toISOString().slice(0, 10),
    range_end: fim.toISOString().slice(0, 10),
  });

  revalidatePath("/admin/agenda");
  revalidatePath("/admin");
}
