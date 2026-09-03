import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Papel } from "@/lib/tipos";
import type { Tables } from "@/lib/database.types";

export type Sessao = {
  userId: string;
  email: string | null;
  perfil: Tables<"profiles"> | null;
  papeis: Papel[];
};

/**
 * Sessão atual com perfil e papéis. Memoizado por request — várias chamadas
 * no mesmo render batem no banco uma vez só.
 */
export const getSessao = cache(async (): Promise<Sessao | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: perfil }, { data: papeis }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  return {
    userId: user.id,
    email: user.email ?? null,
    perfil: perfil ?? null,
    papeis: (papeis ?? []).map((r) => r.role),
  };
});

export async function exigirSessao(): Promise<Sessao> {
  const sessao = await getSessao();
  if (!sessao) throw new Error("não autenticado");
  return sessao;
}

/** Barra a página se o usuário não tiver o papel. */
export async function exigirPapel(papel: Papel): Promise<Sessao> {
  const sessao = await exigirSessao();
  if (!sessao.papeis.includes(papel)) {
    throw new Error(`acesso negado: exige papel ${papel}`);
  }
  return sessao;
}

export function primeiroNome(nome: string | null | undefined): string {
  return (nome ?? "").trim().split(/\s+/)[0] ?? "";
}
