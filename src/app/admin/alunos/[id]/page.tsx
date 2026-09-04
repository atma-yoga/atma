import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  FichaDoAluno,
  type FichaEditavel,
} from "@/components/paineis/ficha-do-aluno";
import { DIAS_CURTOS } from "@/components/paineis/grade-semanal";
import { Shell } from "@/components/shell";
import { Cartao, Etiqueta, Numero, TituloSecao, Vazio, brl } from "@/components/ui";
import { getSessao } from "@/lib/auth";
import { corDoLocal } from "@/lib/ficha";
import { createClient } from "@/lib/supabase/server";
import { definirValor, salvarFicha } from "./actions";

export const metadata = { title: "Ficha do aluno" };

const mesCurto = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
  });

export default async function FichaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");
  if (!sessao.papeis.includes("admin")) redirect("/");

  const supabase = await createClient();

  const { data: aluno } = await supabase
    .from("v_ficha_completa")
    .select("*")
    .eq("student_id", id)
    .maybeSingle();

  if (!aluno) notFound();

  const [{ data: matriculas }, { data: cobrancas }, { data: frequencia }] =
    await Promise.all([
      supabase
        .from("class_enrollments")
        .select(
          "id, custom_price, enrolled_at, is_active, classes(id, name, monthly_price, rooms(name, color), class_meetings(weekday, start_time))",
        )
        .eq("student_id", id)
        .eq("is_active", true),

      supabase
        .from("v_mensalidades")
        .select("*")
        .eq("student_id", id)
        .order("reference_month", { ascending: false })
        .limit(12),

      supabase.from("v_frequencia").select("*").eq("student_id", id),
    ]);

  const presencas = (frequencia ?? []).reduce(
    (s, f) => s + Number(f.presencas ?? 0),
    0,
  );
  const faltas = (frequencia ?? []).reduce(
    (s, f) => s + Number(f.faltas ?? 0),
    0,
  );
  const totalRegistrado = presencas + faltas;

  const ficha: FichaEditavel = {
    id,
    nome: aluno.full_name ?? "",
    nomeSocial: aluno.social_name ?? "",
    email: aluno.email ?? "",
    telefone: aluno.phone ?? "",
    cpf: aluno.document_id ?? "",
    genero: aluno.gender ?? "",
    nascimento: aluno.birth_date ?? "",
    endereco: (aluno.address as Record<string, string>) ?? {},
    condicoes: aluno.health_conditions ?? [],
    observacoes: aluno.health_notes ?? "",
  };

  return (
    <Shell papel="admin" nome={sessao.perfil?.full_name ?? ""}>
      <Link
        href="/admin/pessoas"
        className="text-xs text-[var(--color-muted)] underline underline-offset-4 hover:text-[var(--color-foreground)]"
      >
        ← pessoas
      </Link>

      <div className="mt-4 mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light">
            {aluno.social_name || aluno.full_name}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {aluno.social_name ? `${aluno.full_name} · ` : ""}
            aluno desde{" "}
            {aluno.start_date
              ? new Date(`${aluno.start_date}T12:00:00`).toLocaleDateString("pt-BR")
              : "—"}
          </p>
        </div>

        {aluno.must_change_password ? (
          <Etiqueta fundo="var(--color-mel)" letra="var(--color-on-mel)">
            ainda usa a senha padrão
          </Etiqueta>
        ) : null}
      </div>

      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Numero rotulo="Turmas" valor={Number(aluno.turmas ?? 0)} />
        <Numero
          rotulo="Presença"
          valor={
            totalRegistrado
              ? `${Math.round((presencas / totalRegistrado) * 100)}%`
              : "—"
          }
          detalhe={
            totalRegistrado ? `${presencas} de ${totalRegistrado}` : undefined
          }
        />
        <Numero rotulo="Já pagou" valor={brl(Number(aluno.ja_pagou ?? 0))} />
        <Numero
          rotulo="Em aberto"
          valor={brl(Number(aluno.em_aberto ?? 0))}
        />
      </div>

      <div className="grid gap-10 xl:grid-cols-[1fr_28rem] xl:items-start">
        <div>
          <section className="mb-10">
            <TituloSecao>Turmas e mensalidade</TituloSecao>

            {matriculas?.length ? (
              <div className="flex flex-col gap-2">
                {matriculas.map((m) => {
                  const turma = m.classes;
                  const padrao = Number(turma?.monthly_price ?? 0);
                  const combinado =
                    m.custom_price === null ? null : Number(m.custom_price);

                  return (
                    <Cartao
                      key={m.id}
                      className="px-5 py-4"
                      style={{
                        borderLeft: `3px solid ${corDoLocal(turma?.rooms?.color)}`,
                      }}
                    >
                      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <Link
                          href={`/admin/grade/${turma?.id}`}
                          className="min-w-36 flex-1 text-sm underline-offset-4 hover:underline"
                        >
                          {turma?.name}
                        </Link>
                        <span className="text-xs text-[var(--color-muted)]">
                          {(turma?.class_meetings ?? [])
                            .map((d) => DIAS_CURTOS[d.weekday])
                            .join(", ")}{" "}
                          · {String(turma?.class_meetings?.[0]?.start_time ?? "").slice(0, 5)}
                        </span>
                      </div>

                      <form
                        action={definirValor}
                        className="flex flex-wrap items-end gap-3"
                      >
                        <input type="hidden" name="matricula" value={m.id} />
                        <input type="hidden" name="aluno" value={id} />

                        <label className="flex flex-col gap-1">
                          <span className="text-xs uppercase tracking-[0.1em] text-[var(--color-muted)]">
                            Mensalidade deste aluno
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="text-sm text-[var(--color-muted)]">
                              R$
                            </span>
                            <input
                              name="valor"
                              type="number"
                              step="0.01"
                              min={0}
                              defaultValue={combinado ?? ""}
                              placeholder={padrao.toFixed(2)}
                              className="h-9 w-28 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-sm tabular-nums"
                            />
                          </span>
                        </label>

                        <button
                          type="submit"
                          className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] px-4 text-xs transition hover:bg-[var(--color-surface-sunken)]"
                        >
                          Salvar valor
                        </button>

                        <span className="text-xs text-[var(--color-muted)]">
                          {combinado === null
                            ? `usando o preço da turma, ${brl(padrao)}`
                            : `combinado · a turma cobra ${brl(padrao)}`}
                        </span>
                      </form>
                    </Cartao>
                  );
                })}
              </div>
            ) : (
              <Vazio>
                Este aluno não está em nenhuma turma. Coloque-o numa turma pela{" "}
                <Link
                  href="/admin/grade"
                  className="underline underline-offset-4"
                >
                  grade semanal
                </Link>
                .
              </Vazio>
            )}

            <p className="mt-3 text-xs text-[var(--color-muted)]">
              Deixe em branco para voltar ao preço da turma. O valor combinado
              vale para as próximas cobranças — as já emitidas não mudam.
            </p>
          </section>

          <section>
            <TituloSecao>Mensalidades</TituloSecao>
            {cobrancas?.length ? (
              <div className="flex flex-col gap-2">
                {cobrancas.map((c) => (
                  <Cartao
                    key={c.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3"
                  >
                    <span className="min-w-32 flex-1 text-sm">
                      {c.reference_month ? mesCurto(c.reference_month) : "—"}
                      <span className="ml-2 text-xs text-[var(--color-muted)]">
                        {c.turma}
                      </span>
                    </span>

                    {c.proportion !== null && Number(c.proportion) < 1 ? (
                      <span className="text-xs text-[var(--color-muted)]">
                        {Math.round(Number(c.proportion) * 100)}% do mês
                      </span>
                    ) : null}

                    <span className="text-sm tabular-nums">
                      {brl(Number(c.amount ?? 0))}
                    </span>

                    <Etiqueta
                      fundo={
                        c.status === "paid"
                          ? "var(--color-verde)"
                          : "var(--color-palha)"
                      }
                      letra={
                        c.status === "paid"
                          ? "var(--color-on-verde)"
                          : "var(--color-on-palha)"
                      }
                    >
                      {c.status === "paid" ? "pago" : "em aberto"}
                    </Etiqueta>
                  </Cartao>
                ))}
              </div>
            ) : (
              <Vazio>Nenhuma cobrança ainda.</Vazio>
            )}
          </section>
        </div>

        <div className="xl:sticky xl:top-6">
          <TituloSecao>Dados e ficha médica</TituloSecao>
          <FichaDoAluno ficha={ficha} salvar={salvarFicha} />
        </div>
      </div>
    </Shell>
  );
}
