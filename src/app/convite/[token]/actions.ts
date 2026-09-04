"use server";

import { redirect } from "next/navigation";

import { cpfValido, soDigitos } from "@/lib/ficha";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Papel } from "@/lib/tipos";

export type EstadoConvite = { erro: string } | undefined;

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

/**
 * Cadastro feito pela própria pessoa, a partir de um link.
 *
 * O papel vem do convite, nunca do formulário: quem recebeu um link de aluno
 * não vira professor mexendo no HTML. O convite é conferido e consumido numa
 * chamada só, para dois envios simultâneos não passarem pelo mesmo link de
 * uso único.
 */
export async function cadastrarPeloConvite(
  _anterior: EstadoConvite,
  form: FormData,
): Promise<EstadoConvite> {
  const token = String(form.get("token") ?? "");
  const nome = String(form.get("nome") ?? "").trim();
  const nomeSocial = String(form.get("nome_social") ?? "").trim();
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  const telefone = String(form.get("telefone") ?? "").trim();
  const cpf = soDigitos(String(form.get("cpf") ?? ""));
  const genero = String(form.get("genero") ?? "").trim();
  const nascimento = String(form.get("nascimento") ?? "").trim();
  const senha = String(form.get("senha") ?? "");
  const confirmacao = String(form.get("senha_confirma") ?? "");

  if (!token) return { erro: "Link inválido." };
  if (!nome) return { erro: "Informe o nome completo." };
  if (!EMAIL.test(email)) return { erro: "E-mail inválido." };
  if (cpf && !cpfValido(cpf)) return { erro: "CPF inválido." };
  if (senha.length < 6) {
    return { erro: "A senha precisa de ao menos 6 caracteres." };
  }
  if (senha !== confirmacao) return { erro: "As senhas não conferem." };

  const admin = createAdminClient();

  if (cpf) {
    const { data: jaTem } = await admin
      .from("profiles")
      .select("id")
      .eq("document_id", cpf)
      .maybeSingle();

    if (jaTem) return { erro: "Já existe um cadastro com esse CPF." };
  }

  // Consome o convite antes de criar a conta. Se a criação falhar depois, o
  // custo é um uso perdido — melhor que o contrário, em que uma falha aqui
  // deixaria a conta criada e o convite intacto para ser usado de novo.
  const { data: papel, error: erroConvite } = await admin.rpc(
    "consumir_convite",
    { token_convite: token },
  );

  if (erroConvite || !papel) {
    return {
      erro: "Este link não vale mais. Peça um novo à administração do estúdio.",
    };
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
      role: papel as Papel,
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered")) {
      return { erro: "Já existe uma conta com esse e-mail." };
    }
    return { erro: `Não foi possível concluir: ${error.message}` };
  }

  if (data.user) {
    const observacoes = String(form.get("observacoes_saude") ?? "").trim();

    // Quem se cadastra escolhe a própria senha, então não fica pendente.
    await admin
      .from("profiles")
      .update({
        must_change_password: false,
        gender: genero || null,
        birth_date: nascimento || null,
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

  // Já entra logado: a pessoa acabou de definir a senha.
  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email, password: senha });

  redirect("/");
}
