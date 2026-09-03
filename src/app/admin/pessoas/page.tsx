import { redirect } from "next/navigation";

import { Convites, type ConviteNaLista } from "@/components/paineis/convites";
import { FormularioPessoa } from "@/components/paineis/formulario-pessoa";
import {
  ListaDePessoas,
  type PessoaNaLista,
} from "@/components/paineis/lista-de-pessoas";
import { Shell } from "@/components/shell";
import { TituloSecao } from "@/components/ui";
import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import {
  alternarAtivo,
  cadastrarPessoa,
  gerarConvite,
  revogarConvite,
} from "./actions";

export const metadata = { title: "Pessoas" };

export default async function PessoasPage() {
  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");
  if (!sessao.papeis.includes("admin")) redirect("/");

  const supabase = await createClient();

  const [{ data: professores }, { data: alunos }, { data: convites }] =
    await Promise.all([
    supabase
      .from("teachers")
      .select("profile_id, is_active, hired_at, profiles(full_name, social_name, email, phone, must_change_password)")
      .order("hired_at", { ascending: false }),

    supabase
      .from("students")
      .select("profile_id, is_active, start_date, profiles(full_name, social_name, email, phone, must_change_password)")
      .order("start_date", { ascending: false }),

      supabase
        .from("invites")
        .select("id, token, role, expires_at, uses, max_uses, revoked_at")
        .is("revoked_at", null)
        .order("created_at", { ascending: false }),
    ]);

  // O link precisa ser absoluto para a pessoa abrir de outro aparelho.
  const cabecalhos = await headers();
  const host = cabecalhos.get("host") ?? "localhost:3000";
  const protocolo = host.startsWith("localhost") ? "http" : "https";
  const base = `${protocolo}://${host}`;

  const listaConvites: ConviteNaLista[] = (convites ?? []).map((c) => ({
    id: c.id,
    token: c.token,
    papel: c.role,
    expiraEm: c.expires_at,
    usos: c.uses,
    maxUsos: c.max_uses,
    revogado: Boolean(c.revoked_at),
  }));

  const listaProfessores: PessoaNaLista[] = (professores ?? []).map((t) => ({
    id: t.profile_id,
    nome: t.profiles?.social_name || t.profiles?.full_name || "sem nome",
    email: t.profiles?.email ?? null,
    telefone: t.profiles?.phone ?? null,
    ativo: t.is_active,
    desde: t.hired_at,
    senhaPadrao: t.profiles?.must_change_password ?? false,
  }));

  const listaAlunos: PessoaNaLista[] = (alunos ?? []).map((a) => ({
    id: a.profile_id,
    nome: a.profiles?.social_name || a.profiles?.full_name || "sem nome",
    email: a.profiles?.email ?? null,
    telefone: a.profiles?.phone ?? null,
    ativo: a.is_active,
    desde: a.start_date,
    senhaPadrao: a.profiles?.must_change_password ?? false,
  }));

  const botaoAtivar = (papel: "teacher" | "student") =>
    function Botao(p: PessoaNaLista) {
      return (
        <form action={alternarAtivo}>
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="papel" value={papel} />
          <input type="hidden" name="ativar" value={p.ativo ? "0" : "1"} />
          <button
            type="submit"
            className="text-xs text-[var(--color-muted)] underline underline-offset-4 transition hover:text-[var(--color-foreground)]"
          >
            {p.ativo ? "Desativar" : "Reativar"}
          </button>
        </form>
      );
    };

  return (
    <Shell papel="admin" nome={sessao.perfil?.full_name ?? ""}>
      <h1 className="mb-8 text-2xl font-light">Pessoas</h1>

      <Convites
        convites={listaConvites}
        base={base}
        gerar={gerarConvite}
        revogar={revogarConvite}
      />

      <div className="grid gap-10 xl:grid-cols-[1fr_30rem] xl:items-start">
        <div>
          <ListaDePessoas
            titulo="Professores"
            pessoas={listaProfessores}
            vazio="Nenhum professor cadastrado ainda."
            acaoDeLinha={botaoAtivar("teacher")}
          />
          <ListaDePessoas
            titulo="Alunos"
            pessoas={listaAlunos}
            vazio="Nenhum aluno cadastrado ainda."
            acaoDeLinha={botaoAtivar("student")}
          />
        </div>

        <div className="xl:sticky xl:top-6">
          <TituloSecao>Cadastrar</TituloSecao>
          <FormularioPessoa acao={cadastrarPessoa} />
        </div>
      </div>
    </Shell>
  );
}
