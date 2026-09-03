"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { cpfValido, soDigitos } from "@/lib/ficha";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type EstadoForm = { erro?: string } | undefined;

/**
 * Traduz CPF ou nome de usuário em e-mail.
 *
 * Roda com a chave secreta e não é exposta como função do banco de propósito:
 * uma tradução pública deixaria qualquer pessoa descobrir o e-mail de um aluno
 * testando CPFs ou nomes até acertar.
 */
async function emailDoIdentificador(entrada: string): Promise<string | null> {
  const admin = createAdminClient();

  // Só dígitos: é CPF. O aluno digita com ou sem pontuação, e o banco guarda
  // sem — por isso comparamos pelo que sobra.
  const digitos = soDigitos(entrada);
  if (digitos.length === 11 && cpfValido(digitos)) {
    const { data } = await admin
      .from("profiles")
      .select("email")
      .eq("document_id", digitos)
      .maybeSingle();

    return data?.email ?? null;
  }

  const { data } = await admin
    .from("profiles")
    .select("email")
    .eq("username", entrada.toLowerCase())
    .maybeSingle();

  return data?.email ?? null;
}

export async function entrar(
  _anterior: EstadoForm,
  form: FormData,
): Promise<EstadoForm> {
  const identificador = String(form.get("identificador") ?? "").trim();
  const senha = String(form.get("senha") ?? "");
  const proximo = String(form.get("proximo") ?? "/");

  if (!identificador || !senha) {
    return { erro: "Preencha o acesso e a senha." };
  }

  // Com "@" é e-mail; sem, pode ser CPF ou nome de usuário.
  const email = identificador.includes("@")
    ? identificador.toLowerCase()
    : await emailDoIdentificador(identificador);

  // Mensagem única em todos os casos — inclusive quando a pessoa nem existe.
  // Diferenciar "não existe" de "senha errada" entrega metade da credencial.
  const generico = { erro: "Acesso ou senha incorretos." };

  if (!email) return generico;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) return generico;

  revalidatePath("/", "layout");
  redirect(proximo.startsWith("/") ? proximo : "/");
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/entrar");
}
