"use server";

import { revalidatePath } from "next/cache";

import { getSessao } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Papel } from "@/lib/tipos";

export type EstadoCadastro =
  | { erro: string }
  | { sucesso: string }
  | undefined;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USUARIO = /^[a-z0-9._-]{3,30}$/;

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

/**
 * Cadastra professor ou aluno. Só a administração pode chamar — a checagem
 * é feita aqui, no servidor, porque esconder o botão não é segurança.
 *
 * A conta nasce com uma senha temporária que a adm entrega pessoalmente, e
 * com `must_change_password`, para a aplicação exigir a troca no primeiro
 * acesso.
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
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  const telefone = String(form.get("telefone") ?? "").trim();
  const usuario = String(form.get("usuario") ?? "")
    .trim()
    .toLowerCase();
  const senha = String(form.get("senha") ?? "");
  const papel = String(form.get("papel") ?? "") as Papel;

  if (!nome) return { erro: "Informe o nome completo." };
  if (!EMAIL.test(email)) return { erro: "E-mail inválido." };
  if (usuario && !USUARIO.test(usuario)) {
    return {
      erro:
        "Usuário: 3 a 30 caracteres, só letras, números, ponto, hífen e _.",
    };
  }
  if (senha.length < 8) {
    return { erro: "A senha temporária precisa de ao menos 8 caracteres." };
  }
  if (papel !== "teacher" && papel !== "student") {
    return { erro: "Escolha professor ou aluno." };
  }

  const admin = createAdminClient();

  // O gatilho handle_new_user lê este metadata para montar profile,
  // user_roles e a linha em teachers ou students.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: {
      full_name: nome,
      phone: telefone || null,
      username: usuario || null,
      role: papel,
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered")) {
      return { erro: "Já existe uma conta com esse e-mail." };
    }
    if (msg.includes("profiles_username_uniq") || msg.includes("username")) {
      return { erro: "Esse nome de usuário já está em uso." };
    }
    return { erro: `Não foi possível cadastrar: ${error.message}` };
  }

  if (data.user) {
    // Guardamos só o que foi preenchido: um endereço com todos os campos
    // vazios vira NULL em vez de um objeto de strings em branco.
    const endereco = montarEndereco(form);
    const saude = String(form.get("saude") ?? "").trim();

    await admin
      .from("profiles")
      .update({
        must_change_password: true,
        address: endereco,
        health_notes: saude || null,
      })
      .eq("id", data.user.id);
  }

  revalidatePath("/admin/pessoas");

  return {
    sucesso: `${
      papel === "teacher" ? "Professor" : "Aluno"
    } ${nome} cadastrado. Entregue a senha temporária.`,
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
