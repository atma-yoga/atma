"use server";

import { revalidatePath } from "next/cache";

import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * As ações desta tela devolvem uma mensagem em vez de engolir o erro.
 *
 * Antes elas ignoravam a resposta do banco, e quando o gatilho de lotação
 * recusava a chamada o botão simplesmente não fazia nada — sem aviso, sem
 * pista, sem nada para o professor entender.
 */
export type EstadoChamada = { erro: string } | { sucesso: string } | undefined;

const falha = (e: { message: string } | null, quando: string): EstadoChamada =>
  e ? { erro: `${quando}: ${e.message}` } : undefined;

/**
 * Abre a chamada de uma turma num dia.
 *
 * A aula e a lista de presença nascem aqui, na primeira vez que o professor
 * abre — ele não depende de a administração ter gerado as aulas antes.
 * A permissão é conferida dentro da função do banco.
 */
export async function abrirChamada(
  _anterior: EstadoChamada,
  form: FormData,
): Promise<EstadoChamada> {
  const sessao = await getSessao();
  if (!sessao) return { erro: "Sessão expirada. Entre de novo." };

  const turma = String(form.get("turma") ?? "");
  const dia = String(form.get("dia") ?? "");
  if (!turma || !dia) return { erro: "Turma ou dia não informados." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("abrir_chamada", { turma, dia });

  revalidatePath(`/professor/turmas/${turma}`);
  return falha(error, "Não foi possível abrir a chamada");
}

/** Marca presença ou falta de um aluno. */
export async function marcarPresenca(form: FormData): Promise<void> {
  const sessao = await getSessao();
  if (!sessao) return;

  const booking = String(form.get("booking") ?? "");
  const turma = String(form.get("turma") ?? "");
  const presente = String(form.get("presente") ?? "") === "1";
  if (!booking) return;

  const supabase = await createClient();

  await supabase
    .from("bookings")
    .update({
      status: presente ? "attended" : "no_show",
      checked_in_at: presente ? new Date().toISOString() : null,
      checked_in_by: presente ? sessao.userId : null,
    })
    .eq("id", booking);

  revalidatePath(`/professor/turmas/${turma}`);
}

/** Desfaz a marcação, devolvendo o aluno para "sem registro". */
export async function limparPresenca(form: FormData): Promise<void> {
  const sessao = await getSessao();
  if (!sessao) return;

  const booking = String(form.get("booking") ?? "");
  const turma = String(form.get("turma") ?? "");
  if (!booking) return;

  const supabase = await createClient();

  await supabase
    .from("bookings")
    .update({ status: "booked", checked_in_at: null, checked_in_by: null })
    .eq("id", booking);

  revalidatePath(`/professor/turmas/${turma}`);
}

/**
 * Suspende uma aula. A permissão é conferida dentro da função do banco:
 * professor daquela turma ou administração.
 */
export async function suspenderAula(form: FormData): Promise<void> {
  const sessao = await getSessao();
  if (!sessao) return;

  const aula = String(form.get("aula") ?? "");
  const turma = String(form.get("turma") ?? "");
  const motivo = String(form.get("motivo") ?? "").trim();
  if (!aula) return;

  const supabase = await createClient();
  await supabase.rpc("suspender_aula", { aula, motivo: motivo || undefined });

  revalidatePath(`/professor/turmas/${turma}`);
  revalidatePath(`/admin/grade/${turma}`);
}

export async function reativarAula(form: FormData): Promise<void> {
  const sessao = await getSessao();
  if (!sessao) return;

  const aula = String(form.get("aula") ?? "");
  const turma = String(form.get("turma") ?? "");
  if (!aula) return;

  const supabase = await createClient();
  await supabase.rpc("reativar_aula", { aula });

  revalidatePath(`/professor/turmas/${turma}`);
  revalidatePath(`/admin/grade/${turma}`);
}

/** Cria uma aula fora dos dias da grade — reposição, workshop, extra. */
export async function criarAulaExtra(form: FormData): Promise<void> {
  const sessao = await getSessao();
  if (!sessao) return;

  const turma = String(form.get("turma") ?? "");
  const dia = String(form.get("dia") ?? "");
  const hora = String(form.get("hora") ?? "");
  const duracao = Number(form.get("duracao") || 60);
  const observacao = String(form.get("observacao") ?? "").trim();

  if (!turma || !dia || !hora) return;

  const supabase = await createClient();
  await supabase.rpc("criar_aula_extra", {
    turma,
    dia,
    hora: `${hora}:00`,
    duracao,
    observacao: observacao || undefined,
  });

  revalidatePath(`/professor/turmas/${turma}`);
  revalidatePath(`/admin/grade/${turma}`);
}

// -----------------------------------------------------------------------------
// Reposição
// -----------------------------------------------------------------------------

export type OpcaoDeReposicao = {
  /** Linha da falta, quando ela já existe. Nulo na aula que ainda vem. */
  origem: string | null;
  turma: string;
  turmaNome: string;
  dia: string;
  quando: string;
  tipo: "falta" | "futura";
};

/**
 * O que esse aluno tem para repor: faltas recentes e aulas que ainda vêm.
 *
 * Vai ao servidor só quando o professor escolhe a pessoa — a lista depende de
 * quem é, e carregá-la para todo mundo de antemão seria uma consulta por aluno
 * do estúdio para usar uma.
 */
export async function opcoesDeReposicao(
  aluno: string,
): Promise<OpcaoDeReposicao[]> {
  const sessao = await getSessao();
  if (!sessao) return [];

  const supabase = await createClient();
  const { data } = await supabase.rpc("aulas_para_repor", { aluno });

  return (data ?? [])
    // Turma, dia e horário são o que o professor lê para escolher; sem eles a
    // opção não diz nada e não deve aparecer na lista.
    .filter((o) => o.turma && o.dia && o.quando)
    .map((o) => ({
      origem: o.origem,
      turma: o.turma as string,
      turmaNome: o.turma_nome ?? "turma",
      dia: o.dia as string,
      quando: o.quando as string,
      tipo: o.tipo === "falta" ? ("falta" as const) : ("futura" as const),
    }));
}

/** Põe o visitante na chamada, amarrado à aula que ele está repondo. */
export async function registrarReposicao(
  _anterior: EstadoChamada,
  form: FormData,
): Promise<EstadoChamada> {
  const sessao = await getSessao();
  if (!sessao) return { erro: "Sessão expirada. Entre de novo." };

  const aula = String(form.get("aula") ?? "");
  const aluno = String(form.get("aluno") ?? "");
  const turma = String(form.get("turma") ?? "");
  const escolha = String(form.get("escolha") ?? "");

  if (!aula || !aluno) return { erro: "Falta a aula ou o aluno." };
  if (!escolha) return { erro: "Escolha qual aula está sendo reposta." };

  // A escolha vem como "origem:<id>" para falta já lançada, ou
  // "futura:<turma>:<dia>" para aula que ainda não aconteceu.
  const partes = escolha.split(":");
  const corpo =
    partes[0] === "origem"
      ? { aula, aluno, origem: partes[1] }
      : { aula, aluno, turma_origem: partes[1], dia_origem: partes[2] };

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_reposicao", corpo);

  revalidatePath(`/professor/turmas/${turma}`);
  if (error) return { erro: error.message };
  return { sucesso: "Reposição registrada." };
}

/** Tira o visitante da chamada. A falta dele volta a ser falta. */
export async function desfazerReposicao(form: FormData): Promise<void> {
  const sessao = await getSessao();
  if (!sessao) return;

  const visita = String(form.get("visita") ?? "");
  const turma = String(form.get("turma") ?? "");
  if (!visita) return;

  const supabase = await createClient();
  await supabase.rpc("desfazer_reposicao", { visita });

  revalidatePath(`/professor/turmas/${turma}`);
}
