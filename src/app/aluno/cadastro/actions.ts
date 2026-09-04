"use server";

import { revalidatePath } from "next/cache";

import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type EstadoMeuCadastro =
  | { erro: string }
  | { sucesso: string }
  | undefined;

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

/**
 * O aluno atualiza os próprios dados.
 *
 * Nome completo, e-mail e CPF ficam de fora: são o que identifica a pessoa
 * no estúdio e servem de login, então mudam pela administração. O que a
 * pessoa mexe aqui é o que só ela sabe — como quer ser chamada, telefone,
 * onde mora e como está de saúde.
 */
export async function salvarMeusDados(
  _anterior: EstadoMeuCadastro,
  form: FormData,
): Promise<EstadoMeuCadastro> {
  const sessao = await getSessao();
  if (!sessao) return { erro: "Sessão expirada. Entre de novo." };

  const nomeSocial = String(form.get("nome_social") ?? "").trim();
  const telefone = String(form.get("telefone") ?? "").trim();
  const observacoes = String(form.get("observacoes_saude") ?? "").trim();

  const supabase = await createClient();

  // Sem chave secreta: o RLS já limita a atualização ao próprio perfil.
  const { error } = await supabase
    .from("profiles")
    .update({
      social_name: nomeSocial || null,
      phone: telefone || null,
      address: montarEndereco(form),
      health_conditions: marcados(form, "saude"),
      health_notes: observacoes || null,
    })
    .eq("id", sessao.userId);

  if (error) return { erro: `Não foi possível salvar: ${error.message}` };

  revalidatePath("/aluno/cadastro");
  return { sucesso: "Dados atualizados." };
}

/** Troca a própria senha. */
export async function trocarSenha(
  _anterior: EstadoMeuCadastro,
  form: FormData,
): Promise<EstadoMeuCadastro> {
  const sessao = await getSessao();
  if (!sessao) return { erro: "Sessão expirada. Entre de novo." };

  const nova = String(form.get("senha") ?? "");
  const confirma = String(form.get("senha_confirma") ?? "");

  if (nova.length < 6) {
    return { erro: "A senha precisa de ao menos 6 caracteres." };
  }
  if (nova !== confirma) return { erro: "As senhas não conferem." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: nova });

  if (error) return { erro: `Não foi possível trocar: ${error.message}` };

  // Some o aviso de senha padrão, na lista da adm e no topo desta tela.
  await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", sessao.userId);

  revalidatePath("/aluno/cadastro");
  revalidatePath("/admin/pessoas");

  return { sucesso: "Senha trocada." };
}
