import { redirect } from "next/navigation";

import { FormularioTurma } from "@/components/paineis/formulario-turma";
import {
  CartaoDaTurma,
  GradeSemanal,
  type EncontroNaGrade,
} from "@/components/paineis/grade-semanal";
import { Shell } from "@/components/shell";
import { Botao, Cartao, TituloSecao, Vazio } from "@/components/ui";
import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { gerarAulas, salvarTurma } from "./actions";

export const metadata = { title: "Grade semanal" };

export default async function GradePage() {
  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");
  if (!sessao.papeis.includes("admin")) redirect("/");

  const supabase = await createClient();

  const [{ data: grade }, { data: salas }, { data: professores }] =
    await Promise.all([
      supabase.from("v_grade_semanal").select("*").order("start_time"),

      supabase.from("rooms").select("id, name").eq("is_active", true).order("name"),

      supabase
        .from("teachers")
        .select("profile_id, profiles(full_name, social_name)")
        .eq("is_active", true),
    ]);

  const encontros: EncontroNaGrade[] = (grade ?? []).map((g) => ({
    meetingId: g.meeting_id ?? "",
    turmaId: g.class_id ?? "",
    turma: g.turma ?? "sem nome",
    weekday: g.weekday ?? 0,
    hora: String(g.start_time ?? "").slice(0, 5),
    duracao: g.duration_min ?? 60,
    capacidade: g.capacity ?? 0,
    matriculados: Number(g.matriculados ?? 0),
    sala: g.sala,
    aoArLivre: g.is_outdoor ?? false,
    cor: g.cor,
    professor: g.professor_chamado,
    ativa: g.is_active ?? true,
  }));

  // Uma linha por turma, juntando os dias que ela ocupa.
  const turmas = [
    ...new Map(
      encontros.map((e) => [
        e.turmaId,
        {
          ...e,
          dias: encontros.filter((x) => x.turmaId === e.turmaId).map((x) => x.weekday),
        },
      ]),
    ).values(),
  ].sort((a, b) => a.hora.localeCompare(b.hora));

  const semProfessor = turmas.filter((t) => t.ativa && !t.professor).length;

  return (
    <Shell papel="admin" nome={sessao.perfil?.full_name ?? ""}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light">Grade de aula semanal</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Cada turma tem professor, dias fixos e alunos matriculados.
          </p>
        </div>

        <form action={gerarAulas} className="flex items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-[0.12em] text-[var(--color-subtle)]">
              Gerar aulas por
            </span>
            <select
              name="dias"
              defaultValue="30"
              className="h-10 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-sm"
            >
              <option value="7">7 dias</option>
              <option value="30">30 dias</option>
              <option value="60">60 dias</option>
              <option value="90">90 dias</option>
            </select>
          </label>
          <Botao type="submit" variante="secundario">
            Gerar
          </Botao>
        </form>
      </div>

      {semProfessor > 0 ? (
        <Cartao
          className="mb-8 px-5 py-4"
          style={{ borderLeft: "3px solid var(--color-mel)" }}
        >
          <p className="text-sm">
            {semProfessor} {semProfessor === 1 ? "turma está" : "turmas estão"} sem
            professor.
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Cadastre os professores em Pessoas e escolha na turma.
          </p>
        </Cartao>
      ) : null}

      <section className="mb-12">
        <TituloSecao>A semana</TituloSecao>
        {encontros.length ? (
          <GradeSemanal encontros={encontros} />
        ) : (
          <Vazio>Nenhuma turma ainda. Crie a primeira ao lado.</Vazio>
        )}
      </section>

      <div className="grid gap-10 xl:grid-cols-[1fr_24rem] xl:items-start">
        <section>
          <TituloSecao
            acao={
              <span className="text-xs text-[var(--color-muted)]">
                {turmas.length}
              </span>
            }
          >
            Turmas
          </TituloSecao>

          {turmas.length ? (
            <div className="flex flex-col gap-2">
              {turmas.map((t) => (
                <CartaoDaTurma
                  key={t.turmaId}
                  id={t.turmaId}
                  nome={t.turma}
                  dias={t.dias}
                  hora={t.hora}
                  sala={t.sala}
                  aoArLivre={t.aoArLivre}
                  cor={t.cor}
                  professor={t.professor}
                  matriculados={t.matriculados}
                  capacidade={t.capacidade}
                  ativa={t.ativa}
                />
              ))}
            </div>
          ) : (
            <Vazio>Nenhuma turma cadastrada.</Vazio>
          )}
        </section>

        <div className="xl:sticky xl:top-6">
          <TituloSecao>Nova turma</TituloSecao>
          <FormularioTurma
            salas={(salas ?? []).map((s) => ({ valor: s.id, rotulo: s.name }))}
            professores={(professores ?? []).map((p) => ({
              valor: p.profile_id,
              rotulo:
                p.profiles?.social_name || p.profiles?.full_name || "sem nome",
            }))}
            salvar={salvarTurma}
          />
        </div>
      </div>
    </Shell>
  );
}
