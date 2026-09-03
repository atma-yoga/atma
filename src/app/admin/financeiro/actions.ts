"use server";

import { revalidatePath } from "next/cache";

import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormaPagamento } from "@/lib/tipos";

export type EstadoFinanceiro =
  | { erro: string }
  | { sucesso: string }
  | undefined;

async function ehAdmin() {
  const sessao = await getSessao();
  return Boolean(sessao?.papeis.includes("admin"));
}

const FORMAS: FormaPagamento[] = [
  "pix",
  "credit_card",
  "debit_card",
  "cash",
  "bank_transfer",
  "other",
];

/** Dá baixa numa cobrança. */
export async function receber(form: FormData): Promise<void> {
  if (!(await ehAdmin())) return;

  const id = String(form.get("id") ?? "");
  const metodo = String(form.get("metodo") ?? "pix") as FormaPagamento;
  if (!id) return;

  const supabase = await createClient();

  await supabase
    .from("payments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      method: FORMAS.includes(metodo) ? metodo : "other",
    })
    .eq("id", id);

  revalidatePath("/admin/financeiro");
  revalidatePath("/admin");
}

/** Desfaz a baixa, para quando alguém marca a linha errada. */
export async function estornar(form: FormData): Promise<void> {
  if (!(await ehAdmin())) return;

  const id = String(form.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();

  await supabase
    .from("payments")
    .update({ status: "pending", paid_at: null, method: null })
    .eq("id", id);

  revalidatePath("/admin/financeiro");
  revalidatePath("/admin");
}

/**
 * Gera as mensalidades de um mês para todos os alunos matriculados.
 *
 * Pode ser rodado quantas vezes quiser: a trava de aluno + turma + mês no
 * banco impede cobrar duas vezes.
 */
export async function gerarMensalidades(form: FormData): Promise<void> {
  if (!(await ehAdmin())) return;

  const mes = String(form.get("mes") ?? "");
  const supabase = await createClient();

  await supabase.rpc("gerar_mensalidades", {
    mes: mes ? `${mes}-01` : new Date().toISOString().slice(0, 10),
  });

  revalidatePath("/admin/financeiro");
  revalidatePath("/admin");
}
