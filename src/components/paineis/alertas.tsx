"use client";

import Link from "next/link";
import { useState } from "react";

import { Cartao, brl } from "@/components/ui";
import {
  linkDaConversa,
  mensagemDeCobranca,
  mensagemDeFalta,
  telefoneParaWhatsapp,
} from "@/lib/whatsapp";

export type QuemFaltou = {
  alunoId: string;
  nome: string;
  telefone: string | null;
  turma: string | null;
  quando: string;
};

export type QuemDeve = {
  alunoId: string;
  nome: string;
  telefone: string | null;
  turma: string | null;
  valor: number;
  vencimento: string;
  mesReferencia: string;
};

const FUSO = "America/Sao_Paulo";

const dataCurta = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: FUSO,
  }).format(new Date(iso.length === 10 ? `${iso}T12:00:00` : iso));

/**
 * Os três números que abrem a tela da administração.
 *
 * Antes eram quatro, e dois deles eram retrato: "recebido no mês" e "em
 * turma" não pediam nada de ninguém. Quem precisa de uma lista de tarefas ao
 * abrir o sistema são as faltas da semana e o dinheiro atrasado — e número
 * sozinho não resolve nenhum dos dois: "3 faltaram" não diz com quem falar.
 * Por isso os dois quadros abrem, ali mesmo, com os nomes e o WhatsApp de
 * cada um.
 */
export function Alertas({
  alunosAtivos,
  faltaram,
  devendo,
}: {
  alunosAtivos: number;
  faltaram: QuemFaltou[];
  devendo: QuemDeve[];
}) {
  const [aberto, setAberto] = useState<"faltas" | "atraso" | null>(null);

  const totalEmAtraso = devendo.reduce((s, d) => s + d.valor, 0);
  const devedores = new Set(devendo.map((d) => d.alunoId)).size;

  return (
    <div className="mb-12">
      <div className="grid gap-4 sm:grid-cols-3">
        <Cartao className="p-5">
          <p className="text-xs uppercase tracking-[0.11em] text-[var(--color-muted)]">
            Alunos ativos
          </p>
          <p className="mt-2 text-3xl font-light tabular-nums">
            {alunosAtivos}
          </p>
        </Cartao>

        <Quadro
          rotulo="Faltaram na semana"
          valor={faltaram.length}
          detalhe={
            faltaram.length
              ? `${new Set(faltaram.map((f) => f.alunoId)).size} ${
                  new Set(faltaram.map((f) => f.alunoId)).size === 1
                    ? "aluno"
                    : "alunos"
                } · últimos 7 dias`
              : "ninguém nos últimos 7 dias"
          }
          cor="var(--color-mel)"
          aberto={aberto === "faltas"}
          vazio={!faltaram.length}
          aoClicar={() => setAberto(aberto === "faltas" ? null : "faltas")}
        />

        <Quadro
          rotulo="Em atraso"
          valor={brl(totalEmAtraso)}
          detalhe={
            devendo.length
              ? `${devedores} ${devedores === 1 ? "aluno" : "alunos"} · ${
                  devendo.length
                } ${devendo.length === 1 ? "cobrança" : "cobranças"}`
              : "ninguém devendo"
          }
          cor="var(--color-danger)"
          aberto={aberto === "atraso"}
          vazio={!devendo.length}
          aoClicar={() => setAberto(aberto === "atraso" ? null : "atraso")}
        />
      </div>

      {aberto === "faltas" && faltaram.length ? (
        <Lista>
          {faltaram.map((f) => {
            const zap = telefoneParaWhatsapp(f.telefone);
            return (
              <Linha
                key={`${f.alunoId}-${f.quando}`}
                alunoId={f.alunoId}
                nome={f.nome}
                abaixo={`${f.turma ?? "sem turma"} · ${dataCurta(f.quando)}`}
                zap={
                  zap
                    ? linkDaConversa(
                        zap,
                        mensagemDeFalta({
                          nome: f.nome,
                          turma: f.turma,
                          quando: f.quando,
                        }),
                      )
                    : null
                }
              />
            );
          })}
        </Lista>
      ) : null}

      {aberto === "atraso" && devendo.length ? (
        <Lista>
          {devendo.map((d) => {
            const zap = telefoneParaWhatsapp(d.telefone);
            return (
              <Linha
                key={`${d.alunoId}-${d.mesReferencia}-${d.turma}`}
                alunoId={d.alunoId}
                nome={d.nome}
                abaixo={`${brl(d.valor)} · venceu ${dataCurta(d.vencimento)}${
                  d.turma ? ` · ${d.turma}` : ""
                }`}
                zap={
                  zap
                    ? linkDaConversa(
                        zap,
                        mensagemDeCobranca({
                          nome: d.nome,
                          mesReferencia: d.mesReferencia,
                          valor: d.valor,
                          vencimento: d.vencimento,
                        }),
                      )
                    : null
                }
              />
            );
          })}
        </Lista>
      ) : null}
    </div>
  );
}

/** Um número que abre. Vazio não abre: não há lista para mostrar. */
function Quadro({
  rotulo,
  valor,
  detalhe,
  cor,
  aberto,
  vazio,
  aoClicar,
}: {
  rotulo: string;
  valor: number | string;
  detalhe: string;
  cor: string;
  aberto: boolean;
  vazio: boolean;
  aoClicar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      disabled={vazio}
      aria-expanded={aberto}
      className="text-left disabled:cursor-default"
    >
      <Cartao
        className="h-full p-5 transition"
        style={{
          borderLeft: vazio ? undefined : `3px solid ${cor}`,
          boxShadow: aberto ? "var(--shadow-raised)" : undefined,
        }}
      >
        <p className="flex items-center justify-between gap-2 text-xs uppercase tracking-[0.11em] text-[var(--color-muted)]">
          {rotulo}
          {!vazio ? (
            <span
              aria-hidden="true"
              className="text-[0.7rem] normal-case tracking-normal"
            >
              {aberto ? "fechar ▴" : "ver quem ▾"}
            </span>
          ) : null}
        </p>
        <p className="mt-2 text-3xl font-light tabular-nums">{valor}</p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">{detalhe}</p>
      </Cartao>
    </button>
  );
}

function Lista({ children }: { children: React.ReactNode }) {
  return <div className="mt-3 flex flex-col gap-1.5">{children}</div>;
}

/**
 * Uma pessoa da lista.
 *
 * O nome leva à ficha dela, e o botão abre a conversa no WhatsApp com o texto
 * pronto — a mesma ponte do Financeiro, porque disparo em massa não existe
 * sem a API oficial e quem aperta enviar tem que ser gente.
 */
function Linha({
  alunoId,
  nome,
  abaixo,
  zap,
}: {
  alunoId: string;
  nome: string;
  abaixo: string;
  zap: string | null;
}) {
  return (
    <Cartao className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
      <Link
        href={`/admin/alunos/${alunoId}`}
        className="min-w-36 flex-1 hover:underline hover:underline-offset-4"
      >
        <span className="block text-sm">{nome}</span>
        <span className="block text-xs text-[var(--color-muted)]">
          {abaixo}
        </span>
      </Link>

      {zap ? (
        <a
          href={zap}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center rounded-[var(--radius-md)] border border-[var(--color-border-strong)] px-3 text-xs text-[var(--color-muted)] transition hover:text-[var(--color-foreground)]"
        >
          WhatsApp
        </a>
      ) : (
        <span className="text-xs text-[var(--color-subtle)]">sem telefone</span>
      )}
    </Cartao>
  );
}
