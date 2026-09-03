import { redirect } from "next/navigation";

import { FormularioPessoa } from "@/components/paineis/formulario-pessoa";
import {
  ListaDePessoas,
  type PessoaNaLista,
} from "@/components/paineis/lista-de-pessoas";
import { Shell } from "@/components/shell";
import { TituloSecao } from "@/components/ui";
import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { alternarAtivo, cadastrarPessoa } from "./actions";

export const metadata = { title: "Pessoas" };

export default async function PessoasPage() {
  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");
  if (!sessao.papeis.includes("admin")) redirect("/");

  const supabase = await createClient();

  const [{ data: professores }, { data: alunos }] = await Promise.all([
    supabase
      .from("teachers")
      .select("profile_id, is_active, hired_at, profiles(full_name, email, phone)")
      .order("hired_at", { ascending: false }),

    supabase
      .from("students")
      .select("profile_id, is_active, start_date, profiles(full_name, email, phone)")
      .order("start_date", { ascending: false }),
  ]);

  const listaProfessores: PessoaNaLista[] = (professores ?? []).map((t) => ({
    id: t.profile_id,
    nome: t.profiles?.full_name || "sem nome",
    email: t.profiles?.email ?? null,
    telefone: t.profiles?.phone ?? null,
    ativo: t.is_active,
    desde: t.hired_at,
  }));

  const listaAlunos: PessoaNaLista[] = (alunos ?? []).map((a) => ({
    id: a.profile_id,
    nome: a.profiles?.full_name || "sem nome",
    email: a.profiles?.email ?? null,
    telefone: a.profiles?.phone ?? null,
    ativo: a.is_active,
    desde: a.start_date,
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

      <div className="grid gap-10 lg:grid-cols-[1fr_20rem] lg:items-start">
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

        <div className="lg:sticky lg:top-6">
          <TituloSecao>Cadastrar</TituloSecao>
          <FormularioPessoa acao={cadastrarPessoa} />
        </div>
      </div>
    </Shell>
  );
}
