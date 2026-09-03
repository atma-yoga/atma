import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BuscarAluno, type AlunoBuscavel } from "@/components/paineis/buscar-aluno";
import { FormularioTurma } from "@/components/paineis/formulario-turma";
import { DIAS_CURTOS } from "@/components/paineis/grade-semanal";
import { Shell } from "@/components/shell";
import { Botao, Cartao, Etiqueta, TituloSecao, Vazio } from "@/components/ui";
import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { alternarTurma, desmatricular, matricular, salvarTurma } from "../actions";

export const metadata = { title: "Turma" };

export default async function TurmaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");
  if (!sessao.papeis.includes("admin")) redirect("/");

  const supabase = await createClient();

  const { data: turma } = await supabase
    .from("classes")
    .select("*, rooms(name, is_outdoor)")
    .eq("id", id)
    .maybeSingle();

  if (!turma) notFound();

  const [
    { data: encontros },
    { data: matriculas },
    { data: salas },
    { data: professores },
    { data: alunos },
  ] = await Promise.all([
    supabase
      .from("class_meetings")
      .select("*")
      .eq("class_id", id)
      .order("weekday"),

    supabase
      .from("class_enrollments")
      .select("id, enrolled_at, student_id, students(profiles(full_name, social_name, phone))")
      .eq("class_id", id)
      .eq("is_active", true),

    supabase.from("rooms").select("id, name").eq("is_active", true).order("name"),

    supabase
      .from("teachers")
      .select("profile_id, profiles(full_name, social_name)")
      .eq("is_active", true),

    supabase
      .from("students")
      .select("profile_id, profiles(full_name, social_name, email, document_id)")
      .eq("is_active", true),
  ]);

  const dias = (encontros ?? []).map((e) => e.weekday);
  const hora = String(encontros?.[0]?.start_time ?? "07:00").slice(0, 5);
  const duracao = encontros?.[0]?.duration_min ?? 60;

  const naTurma = new Set((matriculas ?? []).map((m) => m.student_id));

  const disponiveis: AlunoBuscavel[] = (alunos ?? [])
    .filter((a) => !naTurma.has(a.profile_id))
    .map((a) => ({
      id: a.profile_id,
      nome: a.profiles?.social_name || a.profiles?.full_name || "sem nome",
      email: a.profiles?.email ?? null,
      cpf: a.profiles?.document_id ?? null,
    }));

  const lotada = (matriculas?.length ?? 0) >= turma.capacity;

  return (
    <Shell papel="admin" nome={sessao.perfil?.full_name ?? ""}>
      <Link
        href="/admin/grade"
        className="text-xs text-[var(--color-muted)] underline underline-offset-4 hover:text-[var(--color-foreground)]"
      >
        ← grade semanal
      </Link>

      <div className="mt-4 mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light">{turma.name}</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {dias
              .slice()
              .sort()
              .map((d) => DIAS_CURTOS[d])
              .join(", ")}{" "}
            · {hora} · {turma.rooms?.name ?? "sem local"}
          </p>
        </div>

        <form action={alternarTurma}>
          <input type="hidden" name="id" value={turma.id} />
          <input type="hidden" name="ativar" value={turma.is_active ? "0" : "1"} />
          <button
            type="submit"
            className="text-xs text-[var(--color-muted)] underline underline-offset-4 hover:text-[var(--color-foreground)]"
          >
            {turma.is_active ? "tirar da grade" : "voltar para a grade"}
          </button>
        </form>
      </div>

      <div className="grid gap-10 xl:grid-cols-[1fr_24rem] xl:items-start">
        <section>
          <TituloSecao
            acao={
              <Etiqueta
                fundo={lotada ? "var(--color-mel)" : "var(--color-palha)"}
                letra={lotada ? "var(--color-on-mel)" : "var(--color-on-palha)"}
              >
                {matriculas?.length ?? 0}/{turma.capacity}
              </Etiqueta>
            }
          >
            Alunos da turma
          </TituloSecao>

          {matriculas?.length ? (
            <div className="mb-6 flex flex-col gap-2">
              {matriculas.map((m) => (
                <Cartao
                  key={m.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3"
                >
                  <span className="min-w-40 flex-1">
                    <span className="block text-sm">
                      {m.students?.profiles?.social_name ||
                        m.students?.profiles?.full_name}
                    </span>
                    {m.students?.profiles?.phone ? (
                      <span className="block text-xs text-[var(--color-muted)]">
                        {m.students.profiles.phone}
                      </span>
                    ) : null}
                  </span>

                  <form action={desmatricular}>
                    <input type="hidden" name="matricula" value={m.id} />
                    <input type="hidden" name="turma" value={turma.id} />
                    <button
                      type="submit"
                      className="text-xs text-[var(--color-muted)] underline underline-offset-4 hover:text-[var(--color-foreground)]"
                    >
                      tirar da turma
                    </button>
                  </form>
                </Cartao>
              ))}
            </div>
          ) : (
            <Vazio>Nenhum aluno nesta turma ainda.</Vazio>
          )}

          <TituloSecao>Colocar aluno</TituloSecao>

          {lotada ? (
            <Cartao
              className="px-5 py-4"
              style={{ borderLeft: "3px solid var(--color-mel)" }}
            >
              <p className="text-sm">
                Turma cheia: {turma.capacity} de {turma.capacity}.
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                Tire alguém, ou aumente as vagas ao lado.
              </p>
            </Cartao>
          ) : disponiveis.length ? (
            <BuscarAluno
              alunos={disponiveis}
              turmaId={turma.id}
              matricular={matricular}
            />
          ) : (
            <Vazio>
              Todos os alunos cadastrados já estão nesta turma. Cadastre mais
              gente em Pessoas.
            </Vazio>
          )}
        </section>

        <div className="xl:sticky xl:top-6">
          <TituloSecao>Dados da turma</TituloSecao>
          <FormularioTurma
            turma={{
              id: turma.id,
              nome: turma.name,
              professorId: turma.teacher_id,
              salaId: turma.room_id,
              capacidade: turma.capacity,
              hora,
              duracao,
              dias,
            }}
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
