import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BuscarAluno, type AlunoBuscavel } from "@/components/paineis/buscar-aluno";
import { FichaRapida } from "@/components/paineis/ficha-rapida";
import { FormularioTurma } from "@/components/paineis/formulario-turma";
import { DIAS_CURTOS } from "@/components/paineis/grade-semanal";
import { Shell } from "@/components/shell";
import { Botao, Cartao, Etiqueta, TituloSecao, Vazio, brl } from "@/components/ui";
import { getSessao } from "@/lib/auth";
import { formatarCpf } from "@/lib/ficha";
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
      .select("id, enrolled_at, student_id, custom_price")
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

  // Ficha e frequência dos matriculados, para o nome abrir sem sair da tela.
  const idsNaTurma = (matriculas ?? []).map((m) => m.student_id);

  const mesCorrente = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  })
    .format(new Date())
    .slice(0, 7);

  const [{ data: fichas }, { data: frequencias }, { data: mensal }, { data: vencidas }] =
    idsNaTurma.length
      ? await Promise.all([
          supabase.from("v_ficha_completa").select("*").in("student_id", idsNaTurma),
          supabase.from("v_frequencia").select("*").eq("class_id", id),
          supabase
            .from("v_presenca_mensal")
            .select("*")
            .eq("mes", `${mesCorrente}-01`),
          supabase
            .from("v_mensalidades")
            .select("student_id, due_date, status")
            .in("student_id", idsNaTurma)
            .neq("status", "paid")
            .order("due_date"),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const fichaPor = new Map((fichas ?? []).map((f) => [f.student_id, f]));
  const freqPor = new Map((frequencias ?? []).map((f) => [f.student_id, f]));
  const mesPor = new Map((mensal ?? []).map((m) => [m.student_id, m]));

  // A cobrança em aberto mais antiga de cada aluno, se já venceu.
  const hojeIso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

  const vencidaPor = new Map<string, string>();
  for (const v of vencidas ?? []) {
    if (!v.student_id || !v.due_date) continue;
    if (v.due_date >= hojeIso) continue;
    if (!vencidaPor.has(v.student_id)) {
      vencidaPor.set(
        v.student_id,
        new Date(`${v.due_date}T12:00:00`).toLocaleDateString("pt-BR"),
      );
    }
  }

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

        <span className="flex items-center gap-4">
          <Link
            href={`/professor/turmas/${turma.id}`}
            className="text-xs text-[var(--color-muted)] underline underline-offset-4 hover:text-[var(--color-foreground)]"
          >
            chamada e aulas
          </Link>

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
        </span>
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
                    {(() => {
                      const f = fichaPor.get(m.student_id);
                      const fr = freqPor.get(m.student_id);
                      const e = (f?.address ?? null) as Record<string, string> | null;

                      return (
                        <FichaRapida
                          completa
                          className="block text-sm"
                          aluno={{
                            id: m.student_id,
                            nome: f?.social_name || f?.full_name || "sem nome",
                            nomeCompleto: f?.full_name ?? "",
                            condicoes: f?.health_conditions ?? [],
                            observacoes: f?.health_notes ?? null,
                            presencas: Number(fr?.presencas ?? 0),
                            faltas: Number(fr?.faltas ?? 0),
                            presencasNoMes: Number(
                              mesPor.get(m.student_id)?.presencas ?? 0,
                            ),
                            faltasNoMes: Number(
                              mesPor.get(m.student_id)?.faltas ?? 0,
                            ),
                            vencidoDesde: vencidaPor.get(m.student_id) ?? null,
                            email: f?.email,
                            telefone: f?.phone,
                            cpf: f?.document_id ? formatarCpf(f.document_id) : null,
                            endereco: e
                              ? [e.logradouro, e.numero, e.bairro, e.cidade]
                                  .filter(Boolean)
                                  .join(", ")
                              : null,
                            mensalidade:
                              m.custom_price !== null
                                ? `${brl(Number(m.custom_price))} (combinado)`
                                : `${brl(Number(turma.monthly_price))} (preço da turma)`,
                            emAberto: Number(f?.em_aberto ?? 0)
                              ? brl(Number(f?.em_aberto))
                              : null,
                          }}
                        />
                      );
                    })()}
                    {fichaPor.get(m.student_id)?.phone ? (
                      <span className="block text-xs text-[var(--color-muted)]">
                        {fichaPor.get(m.student_id)?.phone}
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
              mensalidade: Number(turma.monthly_price),
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
