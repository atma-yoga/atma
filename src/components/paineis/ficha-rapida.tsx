"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Etiqueta } from "@/components/ui";
import { nomeDaCondicao } from "@/lib/ficha";

/**
 * O que cabe numa ficha rápida.
 *
 * Os campos que o professor não pode ver são opcionais e simplesmente não são
 * enviados pela página dele — o corte acontece na consulta, não aqui. Esconder
 * no componente deixaria o dado viajar até o navegador.
 */
export type ResumoDoAluno = {
  id: string;
  nome: string;
  nomeCompleto: string;
  condicoes: string[];
  observacoes: string | null;

  /* frequência — professor e administração veem */
  presencas: number;
  faltas: number;
  /* o mês corrente, separado do acumulado */
  presencasNoMes: number;
  faltasNoMes: number;

  /* só a administração manda estes */
  email?: string | null;
  telefone?: string | null;
  cpf?: string | null;
  endereco?: string | null;
  turmas?: string[];
  mensalidade?: string | null;
  emAberto?: string | null;
  vencidoDesde?: string | null;
};

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 border-t border-[var(--color-border)] py-2 first:border-0">
      <span className="min-w-24 text-xs uppercase tracking-[0.1em] text-[var(--color-muted)]">
        {rotulo}
      </span>
      <span className="flex-1 text-sm">{valor}</span>
    </div>
  );
}

/**
 * Nome clicável que abre a ficha sem sair da tela.
 *
 * Existe porque a dúvida aparece no meio de outra tarefa — o professor
 * fazendo chamada, a adm olhando a turma. Mandar essa pessoa navegar até
 * Pessoas e voltar custa mais que a dúvida vale, e com cem alunos custa
 * ainda mais.
 */
export function FichaRapida({
  aluno,
  completa = false,
  className = "",
}: {
  aluno: ResumoDoAluno;
  /** true para a administração: acrescenta o link para a ficha inteira. */
  completa?: boolean;
  className?: string;
}) {
  const [aberta, setAberta] = useState(false);
  const dialogo = useRef<HTMLDialogElement>(null);

  const registrado = aluno.presencas + aluno.faltas;
  const percentual = registrado
    ? Math.round((aluno.presencas / registrado) * 100)
    : null;

  const noMes = aluno.presencasNoMes + aluno.faltasNoMes;
  const mesAtual = new Date().toLocaleDateString("pt-BR", { month: "long" });

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (aberta && !d.open) d.showModal();
    if (!aberta && d.open) d.close();
  }, [aberta]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        className={`text-left underline-offset-4 hover:underline ${className}`}
      >
        {aluno.nome}
      </button>

      <dialog
        ref={dialogo}
        onClose={() => setAberta(false)}
        // Clicar fora fecha: o alvo do clique é o próprio dialog quando o
        // ponteiro cai no backdrop.
        onClick={(e) => {
          if (e.target === dialogo.current) setAberta(false);
        }}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-0 text-[var(--color-foreground)] shadow-[var(--shadow-raised)] backdrop:bg-[rgb(58_42_32/0.45)]"
      >
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-light">{aluno.nome}</h2>
              {aluno.nomeCompleto !== aluno.nome ? (
                <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                  {aluno.nomeCompleto}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setAberta(false)}
              aria-label="fechar"
              className="text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            >
              ✕
            </button>
          </div>

          {/* Saúde primeiro: é o que muda a aula. */}
          <section className="mb-5">
            <h3 className="mb-2 text-xs uppercase tracking-[0.1em] text-[var(--color-muted)]">
              Ficha médica
            </h3>

            {aluno.condicoes.length ? (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {aluno.condicoes.map((c) => (
                  <Etiqueta
                    key={c}
                    fundo="var(--color-mel)"
                    letra="var(--color-on-mel)"
                  >
                    {nomeDaCondicao(c)}
                  </Etiqueta>
                ))}
              </div>
            ) : null}

            <p className="text-sm">
              {aluno.observacoes ??
                (aluno.condicoes.length
                  ? "Sem observações escritas."
                  : "Nada registrado.")}
            </p>
          </section>

          <section className="mb-5">
            <h3 className="mb-2 text-xs uppercase tracking-[0.1em] text-[var(--color-muted)]">
              Frequência
            </h3>

            {/* O mês primeiro: é o que responde "como ele está agora". */}
            <div className="mb-4 border-b border-[var(--color-border)] pb-4">
              <p className="mb-1 text-xs text-[var(--color-muted)]">
                Em {mesAtual}
              </p>
              {noMes ? (
                <p className="flex items-baseline gap-2">
                  <span className="text-lg tabular-nums">
                    {aluno.presencasNoMes}
                  </span>
                  <span className="text-sm text-[var(--color-muted)]">
                    {aluno.presencasNoMes === 1 ? "presença" : "presenças"}
                    {aluno.faltasNoMes
                      ? ` · ${aluno.faltasNoMes} ${
                          aluno.faltasNoMes === 1 ? "falta" : "faltas"
                        }`
                      : ""}
                    {" de "}
                    {noMes} {noMes === 1 ? "aula" : "aulas"}
                  </span>
                </p>
              ) : (
                <p className="text-sm text-[var(--color-muted)]">
                  Nenhuma chamada neste mês ainda.
                </p>
              )}
            </div>

            {registrado ? (
              <>
                <p className="mb-1 text-xs text-[var(--color-muted)]">
                  Desde que entrou
                </p>
                <p className="flex items-baseline gap-2">
                  <span className="text-2xl font-light tabular-nums">
                    {percentual}%
                  </span>
                  <span className="text-sm text-[var(--color-muted)]">
                    {aluno.presencas} de {registrado} aulas
                  </span>
                </p>

                <div className="mt-3 flex h-2 gap-[2px] overflow-hidden">
                  <span
                    className="rounded-l-[4px]"
                    style={{
                      width: `${(aluno.presencas / registrado) * 100}%`,
                      backgroundColor: "var(--color-verde)",
                    }}
                  />
                  {aluno.faltas ? (
                    <span
                      className="rounded-r-[4px]"
                      style={{
                        width: `${(aluno.faltas / registrado) * 100}%`,
                        backgroundColor: "var(--color-mel)",
                      }}
                    />
                  ) : null}
                </div>

                <p className="mt-2 text-xs text-[var(--color-muted)]">
                  {aluno.presencas} {aluno.presencas === 1 ? "presença" : "presenças"}
                  {" · "}
                  {aluno.faltas} {aluno.faltas === 1 ? "falta" : "faltas"}
                </p>
              </>
            ) : (
              <p className="text-sm text-[var(--color-muted)]">
                Ainda sem chamada registrada.
              </p>
            )}
          </section>

          {completa ? (
            <>
            <section className="mb-5">
              <h3 className="mb-1 text-xs uppercase tracking-[0.1em] text-[var(--color-muted)]">
                Cadastro
              </h3>

              {aluno.email ? <Linha rotulo="E-mail" valor={aluno.email} /> : null}
              {aluno.telefone ? (
                <Linha rotulo="WhatsApp" valor={aluno.telefone} />
              ) : null}
              {aluno.cpf ? <Linha rotulo="CPF" valor={aluno.cpf} /> : null}
              {aluno.endereco ? (
                <Linha rotulo="Endereço" valor={aluno.endereco} />
              ) : null}
              {aluno.turmas?.length ? (
                <Linha rotulo="Turmas" valor={aluno.turmas.join(", ")} />
              ) : null}
              {aluno.mensalidade ? (
                <Linha rotulo="Mensalidade" valor={aluno.mensalidade} />
              ) : null}
            </section>

            {aluno.emAberto ? (
              <section
                className="mb-5 rounded-[var(--radius-md)] px-4 py-3"
                style={{
                  backgroundColor: "var(--color-surface-sunken)",
                  borderLeft: "3px solid var(--color-mel)",
                }}
              >
                <p className="text-xs uppercase tracking-[0.1em] text-[var(--color-muted)]">
                  Mensalidade em aberto
                </p>
                <p className="mt-1 text-lg tabular-nums">{aluno.emAberto}</p>
                {aluno.vencidoDesde ? (
                  <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                    vencida desde {aluno.vencidoDesde}
                  </p>
                ) : null}
              </section>
            ) : null}
            </>
          ) : (
            <p className="mb-5 text-xs text-[var(--color-muted)]">
              Contato, endereço e financeiro ficam com a administração.
            </p>
          )}

          {completa ? (
            <Link
              href={`/admin/alunos/${aluno.id}`}
              className="inline-flex h-9 items-center rounded-[var(--radius-md)] bg-[var(--color-marrom)] px-4 text-xs font-medium text-[var(--color-on-marrom)]"
            >
              Abrir ficha completa
            </Link>
          ) : null}
        </div>
      </dialog>
    </>
  );
}
