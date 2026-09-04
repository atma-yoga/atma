import { redirect } from "next/navigation";

import {
  MeuCadastro,
  type MeusDados,
} from "@/components/paineis/meu-cadastro";
import { Shell } from "@/components/shell";
import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Meu cadastro" };

export default async function MeuCadastroPage() {
  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");

  const supabase = await createClient();

  const { data: perfil } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", sessao.userId)
    .maybeSingle();

  if (!perfil) redirect("/");

  const dados: MeusDados = {
    nome: perfil.full_name ?? "",
    nomeSocial: perfil.social_name ?? "",
    email: perfil.email ?? "",
    telefone: perfil.phone ?? "",
    cpf: perfil.document_id ?? "",
    endereco: (perfil.address as Record<string, string>) ?? {},
    condicoes: perfil.health_conditions ?? [],
    observacoes: perfil.health_notes ?? "",
    senhaPadrao: perfil.must_change_password ?? false,
  };

  return (
    <Shell papel="student" nome={sessao.perfil?.full_name ?? ""}>
      <h1 className="mb-2 text-2xl font-light">Meu cadastro</h1>
      <p className="mb-8 text-sm text-[var(--color-muted)]">
        Mantenha seu contato e sua ficha de saúde em dia.
      </p>

      <MeuCadastro
        dados={dados}
        salvar={(await import("./actions")).salvarMeusDados}
        trocar={(await import("./actions")).trocarSenha}
      />
    </Shell>
  );
}
