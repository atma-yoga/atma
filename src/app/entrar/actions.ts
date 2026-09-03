"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type EstadoForm = { erro?: string } | undefined;

/**
 * Traduz nome de usuário em e-mail.
 *
 * Roda com a chave secreta e não é exposta como função do banco de propósito:
 * uma tradução pública deixaria qualquer pessoa descobrir o e-mail de um aluno
 * testando nomes até acertar.
 */
async function emailDoUsuario(usuario: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("email")
    .eq("username", usuario.toLowerCase())
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
    return { erro: "Preencha usuário e senha." };
  }

  // Com "@" tratamos como e-mail; sem, procuramos o nome de usuário.
  const email = identificador.includes("@")
    ? identificador.toLowerCase()
    : await emailDoUsuario(identificador);

  // Mensagem única em todos os casos — inclusive quando o usuário nem existe.
  // Diferenciar "não existe" de "senha errada" entrega metade da credencial.
  const generico = { erro: "Usuário ou senha incorretos." };

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
