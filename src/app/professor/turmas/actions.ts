"use server";

import { revalidatePath } from "next/cache";

import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Abre a chamada de uma turma num dia.
 *
 * A aula e a lista de presença nascem aqui, na primeira vez que o professor
 * abre — ele não depende de a administração ter gerado as aulas antes.
 * A permissão é conferida dentro da função do banco.
 */
export async function abrirChamada(form: FormData): Promise<void> {
  const sessao = await getSessao();
  if (!sessao) return;

  const turma = String(form.get("turma") ?? "");
  const dia = String(form.get("dia") ?? "");
  if (!turma || !dia) return;

  const supabase = await createClient();
  await supabase.rpc("abrir_chamada", { turma, dia });

  revalidatePath(`/professor/turmas/${turma}`);
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
