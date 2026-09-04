"use server";

import { revalidatePath } from "next/cache";

import { getSessao } from "@/lib/auth";
import { cpfValido, soDigitos } from "@/lib/ficha";
import { createAdminClient } from "@/lib/supabase/admin";

export type EstadoFicha = { erro: string } | { sucesso: string } | undefined;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CAMPOS_ENDERECO = [
  "cep",
  "logradouro",
  "numero",
  "complemento",
  "bairro",
  "cidade",
  "uf",
] as const;

function montarEndereco(form: FormData): Record<string, string> | null {
  const endereco: Record<string, string> = {};
  for (const campo of CAMPOS_ENDERECO) {
    const valor = String(form.get(campo) ?? "").trim();
    if (valor) endereco[campo] = campo === "uf" ? valor.toUpperCase() : valor;
  }
  return Object.keys(endereco).length ? endereco : null;
}

const marcados = (form: FormData, campo: string) => [
  ...new Set(
    form
      .getAll(campo)
      .map((v) => String(v).trim())
      .filter(Boolean),
  ),
];

async function ehAdmin() {
  const sessao = await getSessao();
  return Boolean(sessao?.papeis.includes("admin"));
}

/** Salva a ficha inteira do aluno. Só a administração. */
export async function salvarFicha(
  _anterior: EstadoFicha,
  form: FormData,
): Promise<EstadoFicha> {
  if (!(await ehAdmin())) {
    return { erro: "Apenas a administração pode editar a ficha." };
  }

  const id = String(form.get("id") ?? "");
  const nome = String(form.get("nome") ?? "").trim();
  const nomeSocial = String(form.get("nome_social") ?? "").trim();
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  const telefone = String(form.get("telefone") ?? "").trim();
  const cpf = soDigitos(String(form.get("cpf") ?? ""));
  const observacoes = String(form.get("observacoes_saude") ?? "").trim();

  if (!id) return { erro: "Aluno não identificado." };
  if (!nome) return { erro: "Informe o nome completo." };
  if (email && !EMAIL.test(email)) return { erro: "E-mail inválido." };
  if (cpf && !cpfValido(cpf)) return { erro: "CPF inválido." };

  const admin = createAdminClient();

  // O CPF é login: se dois alunos tiverem o mesmo, um deles deixa de entrar.
  if (cpf) {
    const { data: outro } = await admin
      .from("profiles")
      .select("id")
      .eq("document_id", cpf)
      .neq("id", id)
      .maybeSingle();

    if (outro) return { erro: "Esse CPF já pertence a outra pessoa." };
  }

  const { error } = await admin
    .from("profiles")
    .update({
      full_name: nome,
      social_name: nomeSocial || null,
      email: email || null,
      phone: telefone || null,
      document_id: cpf || null,
      address: montarEndereco(form),
      health_conditions: marcados(form, "saude"),
      health_notes: observacoes || null,
    })
    .eq("id", id);

  if (error) return { erro: `Não foi possível salvar: ${error.message}` };

  // O e-mail também é login, então precisa mudar no Auth junto — senão a
  // pessoa continuaria entrando pelo antigo e a ficha mostraria outro.
  if (email) {
    await admin.auth.admin.updateUserById(id, { email });
  }

  revalidatePath(`/admin/alunos/${id}`);
  revalidatePath("/admin/pessoas");

  return { sucesso: "Ficha salva." };
}

/**
 * Define o valor que este aluno paga nesta turma.
 *
 * Vazio devolve ao preço da turma. O valor combinado não altera cobranças já
 * emitidas: mexer no passado bagunçaria o financeiro fechado.
 */
export async function definirValor(form: FormData): Promise<void> {
  if (!(await ehAdmin())) return;

  const matricula = String(form.get("matricula") ?? "");
  const aluno = String(form.get("aluno") ?? "");
  const bruto = String(form.get("valor") ?? "").trim();
  if (!matricula) return;

  const valor = bruto === "" ? null : Number(bruto.replace(",", "."));
  if (valor !== null && (!Number.isFinite(valor) || valor < 0)) return;

  const admin = createAdminClient();
  await admin
    .from("class_enrollments")
    .update({ custom_price: valor })
    .eq("id", matricula);

  revalidatePath(`/admin/alunos/${aluno}`);
}
