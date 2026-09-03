"use server";

import { revalidatePath } from "next/cache";

import { getSessao } from "@/lib/auth";
import { cpfValido, soDigitos } from "@/lib/ficha";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Papel } from "@/lib/tipos";

export type EstadoCadastro =
  | { erro: string }
  | { sucesso: string }
  | undefined;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Campos do endereço, na ordem em que aparecem no formulário. */
const CAMPOS_ENDERECO = [
  "cep",
  "logradouro",
  "numero",
  "complemento",
  "bairro",
  "cidade",
  "uf",
] as const;

/**
 * Monta o endereço a partir do formulário, ou devolve null quando nada foi
 * preenchido — evita gravar um objeto de strings vazias que depois passa por
 * "tem endereço" em qualquer verificação ingênua.
 */
function montarEndereco(form: FormData): Record<string, string> | null {
  const endereco: Record<string, string> = {};

  for (const campo of CAMPOS_ENDERECO) {
    const valor = String(form.get(campo) ?? "").trim();
    if (valor) endereco[campo] = campo === "uf" ? valor.toUpperCase() : valor;
  }

  return Object.keys(endereco).length ? endereco : null;
}

/** Valores marcados num grupo de caixas, sem duplicatas nem vazios. */
const marcados = (form: FormData, campo: string) => [
  ...new Set(
    form
      .getAll(campo)
      .map((v) => String(v).trim())
      .filter(Boolean),
  ),
];

/**
 * Cadastra professor ou aluno. Só a administração pode chamar — a checagem
 * é feita aqui, no servidor, porque esconder o botão não é segurança.
 */
export async function cadastrarPessoa(
  _anterior: EstadoCadastro,
  form: FormData,
): Promise<EstadoCadastro> {
  const sessao = await getSessao();
  if (!sessao?.papeis.includes("admin")) {
    return { erro: "Apenas a administração pode cadastrar pessoas." };
  }

  const nome = String(form.get("nome") ?? "").trim();
  const nomeSocial = String(form.get("nome_social") ?? "").trim();
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  const telefone = String(form.get("telefone") ?? "").trim();
  const cpf = soDigitos(String(form.get("cpf") ?? ""));
  const senha = String(form.get("senha") ?? "");
  const papel = String(form.get("papel") ?? "") as Papel;

  if (!nome) return { erro: "Informe o nome completo." };
  if (!EMAIL.test(email)) return { erro: "E-mail inválido." };
  if (cpf && !cpfValido(cpf)) return { erro: "CPF inválido." };
  if (senha.length < 6) {
    return { erro: "A senha precisa de ao menos 6 caracteres." };
  }
  if (papel !== "teacher" && papel !== "student") {
    return { erro: "Escolha professor ou aluno." };
  }

  const admin = createAdminClient();

  // O CPF é login do aluno, então precisa ser único. Checamos antes de criar
  // a conta: sem isto, o usuário nasceria no Auth e o gatilho estouraria ao
  // gravar o perfil, deixando uma conta órfã sem perfil.
  if (cpf) {
    const { data: jaTem } = await admin
      .from("profiles")
      .select("id")
      .eq("document_id", cpf)
      .maybeSingle();

    if (jaTem) return { erro: "Já existe alguém cadastrado com esse CPF." };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: {
      full_name: nome,
      social_name: nomeSocial || null,
      phone: telefone || null,
      document_id: cpf || null,
      role: papel,
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered")) {
      return { erro: "Já existe uma conta com esse e-mail." };
    }
    return { erro: `Não foi possível cadastrar: ${error.message}` };
  }

  if (data.user) {
    const observacoes = String(form.get("observacoes_saude") ?? "").trim();

    await admin
      .from("profiles")
      .update({
        must_change_password: true,
        address: montarEndereco(form),
        health_conditions: marcados(form, "saude"),
        health_notes: observacoes || null,
      })
      .eq("id", data.user.id);

    if (papel === "teacher") {
      await admin
        .from("teachers")
        .update({ specialties: marcados(form, "tecnicas") })
        .eq("profile_id", data.user.id);
    }
  }

  revalidatePath("/admin/pessoas");

  const comoEntra = papel === "student" && cpf ? "e-mail ou CPF" : "e-mail";

  return {
    sucesso: `${
      papel === "teacher" ? "Professor" : "Aluno"
    } ${nomeSocial || nome} cadastrado. Entra com ${comoEntra} e a senha informada.`,
  };
}

/** Ativa ou desativa alguém sem apagar o histórico de aulas e pagamentos. */
export async function alternarAtivo(form: FormData) {
  const sessao = await getSessao();
  if (!sessao?.papeis.includes("admin")) return;

  const id = String(form.get("id") ?? "");
  const papel = String(form.get("papel") ?? "");
  const ativar = String(form.get("ativar") ?? "") === "1";
  if (!id) return;

  const admin = createAdminClient();

  if (papel === "teacher") {
    await admin.from("teachers").update({ is_active: ativar }).eq("profile_id", id);
  } else {
    await admin.from("students").update({ is_active: ativar }).eq("profile_id", id);
  }
  await admin.from("profiles").update({ is_active: ativar }).eq("id", id);

  revalidatePath("/admin/pessoas");
}

/* ===========================================================================
   Convites por link
   =========================================================================== */

/**
 * Token do link. `randomUUID` duas vezes dá 256 bits de aleatoriedade —
 * o link é a única credencial que protege o cadastro, então precisa ser
 * grande o bastante para não se adivinhar.
 */
function gerarToken() {
  return (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
}

export async function gerarConvite(form: FormData): Promise<void> {
  const sessao = await getSessao();
  if (!sessao?.papeis.includes("admin")) return;

  const papel = String(form.get("papel") ?? "");
  if (papel !== "student" && papel !== "teacher") return;

  const dias = Math.min(Math.max(Number(form.get("dias") || 7), 1), 90);
  const usoUnico = String(form.get("uso_unico") ?? "") === "1";

  const expira = new Date(Date.now() + dias * 864e5);

  const admin = createAdminClient();
  await admin.from("invites").insert({
    token: gerarToken(),
    role: papel,
    created_by: sessao.userId,
    expires_at: expira.toISOString(),
    max_uses: usoUnico ? 1 : null,
    label: usoUnico ? "uma pessoa" : "aberto",
  });

  revalidatePath("/admin/pessoas");
}

/** Cancela um link. O que já foi cadastrado por ele continua valendo. */
export async function revogarConvite(form: FormData): Promise<void> {
  const sessao = await getSessao();
  if (!sessao?.papeis.includes("admin")) return;

  const id = String(form.get("id") ?? "");
  if (!id) return;

  const admin = createAdminClient();
  await admin
    .from("invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/admin/pessoas");
}
