import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

/**
 * Cliente com a chave secreta: ignora RLS e pode criar contas.
 *
 * O `server-only` acima faz o build falhar se algum componente de cliente
 * importar este arquivo — a chave nunca pode chegar ao navegador.
 *
 * Use apenas dentro de Server Actions que já confirmaram que quem chamou é
 * admin. Este cliente não tem sessão: ele é o próprio superusuário.
 */
export function createAdminClient() {
  const chave = process.env.SUPABASE_SECRET_KEY;

  if (!chave) {
    throw new Error(
      "SUPABASE_SECRET_KEY não configurada. Sem ela a administração não " +
        "consegue criar contas. Pegue em Supabase → Project Settings → API Keys " +
        "e coloque no .env.local (e nas variáveis de ambiente da Vercel).",
    );
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    chave,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
