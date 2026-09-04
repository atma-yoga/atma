"use client";

import Link from "next/link";

import { Cartao, Etiqueta, TituloSecao, Vazio, brl } from "@/components/ui";
import {
  FORMA_PAGAMENTO,
  type FormaPagamento,
  type StatusPagamento,
} from "@/lib/tipos";
import {
  linkDaConversa,
  mensagemDeCobranca,
  telefoneParaWhatsapp,
} from "@/lib/whatsapp";

export type Cobranca = {
  id: string;
  alunoId: string;
  aluno: string;
  telefone: string | null;
  turma: string | null;
  valor: number;
  proporcao: number | null;
  mesReferencia: string; // YYYY-MM-DD
  vencimento: string; // YYYY-MM-DD
  status: StatusPagamento;
  pagoEm: string | null;
  forma: FormaPagamento | null;
  avisadoEm: string | null;
};

/**
 * "Vencido" é calculado na hora, não lido do banco.
 *
 * O status gravado só mudaria se alguém rodasse uma rotina diária; sem isso a
 * cobrança de ontem apareceria como "a vencer" para sempre.
 */
export const estaVencida = (c: Cobranca, hoje: string) =>
  c.status !== "paid" && c.vencimento < hoje;

const data = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

function Linha({
  c,
  hoje,
  receber,
  estornar,
  avisar,
  demo,
}: {
  c: Cobranca;
  hoje: string;
  receber?: (form: FormData) => void | Promise<void>;
  estornar?: (form: FormData) => void | Promise<void>;
  avisar?: (form: FormData) => void | Promise<void>;
  demo?: boolean;
}) {
  const vencida = estaVencida(c, hoje);
  const paga = c.status === "paid";

  // O aviso só existe depois do vencimento: o estúdio não cobra quem ainda
  // está no prazo.
  const zap = vencida ? telefoneParaWhatsapp(c.telefone) : null;
  const texto = mensagemDeCobranca({
    nome: c.aluno,
    mesReferencia: c.mesReferencia,
    valor: c.valor,
    vencimento: c.vencimento,
  });

  return (
    <Cartao
      className={`flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-3 ${
        paga ? "opacity-70" : ""
      }`}
      style={
        vencida ? { borderLeft: "3px solid var(--color-danger)" } : undefined
      }
    >
      <span className="min-w-40 flex-1">
        <Link
          href={`/admin/alunos/${c.alunoId}`}
          className="block text-sm underline-offset-4 hover:underline"
        >
          {c.aluno}
        </Link>
        <span className="block text-xs text-[var(--color-muted)]">
          {c.turma ?? "avulso"}
          {c.proporcao !== null && c.proporcao < 1
            ? ` · ${Math.round(c.proporcao * 100)}% do mês`
            : ""}
        </span>
      </span>

      <span className="text-right">
        <span className="block text-sm tabular-nums">{brl(c.valor)}</span>
        <span className="block text-xs text-[var(--color-muted)]">
          {paga && c.pagoEm
            ? `pago ${data(c.pagoEm.slice(0, 10))}`
            : `vence ${data(c.vencimento)}`}
        </span>
      </span>

      {paga ? (
        <Etiqueta fundo="var(--color-verde)" letra="var(--color-on-verde)">
          Pago
        </Etiqueta>
      ) : vencida ? (
        <Etiqueta fundo="var(--color-danger)" letra="var(--color-papel)">
          Vencido
        </Etiqueta>
      ) : (
        <Etiqueta>A vencer</Etiqueta>
      )}

      {!paga ? (
        <span className="flex flex-wrap items-center gap-2">
          {zap ? (
            <form action={demo ? undefined : avisar} className="contents">
              <input type="hidden" name="id" value={c.id} />
              <a
                href={linkDaConversa(zap, texto)}
                target="_blank"
                rel="noopener noreferrer"
                // O clique abre a conversa e, ao mesmo tempo, registra o
                // aviso — sem isso a adm perde a conta de quem já chamou.
                onClick={(e) => {
                  // <a> não tem .form; o formulário é o ancestral.
                  if (!demo) {
                    e.currentTarget.closest("form")?.requestSubmit();
                  }
                }}
                className={`inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] px-3 text-xs transition ${
                  c.avisadoEm
                    ? "border border-[var(--color-border-strong)] text-[var(--color-muted)]"
                    : "bg-[var(--color-verde)] font-medium text-[var(--color-on-verde)]"
                }`}
              >
                {c.avisadoEm ? "avisado" : "avisar"}
              </a>
            </form>
          ) : vencida ? (
            <span
              className="text-xs text-[var(--color-muted)]"
              title="cadastre o WhatsApp na ficha do aluno"
            >
              sem WhatsApp
            </span>
          ) : null}

          <form
            action={demo ? undefined : receber}
            className="flex items-center gap-2"
          >
            <input type="hidden" name="id" value={c.id} />
            <select
              name="metodo"
              defaultValue="pix"
              disabled={demo}
              className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-xs"
            >
              {(
                Object.entries(FORMA_PAGAMENTO) as [FormaPagamento, string][]
              ).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={demo}
              className="h-9 rounded-[var(--radius-md)] bg-[var(--color-marrom)] px-4 text-xs font-medium text-[var(--color-on-marrom)] transition hover:opacity-90 disabled:opacity-55"
            >
              Receber
            </button>
          </form>
        </span>
      ) : (
        <span className="flex items-center gap-3">
          <span className="text-xs text-[var(--color-muted)]">
            {c.forma ? FORMA_PAGAMENTO[c.forma] : "—"}
          </span>
          <form action={demo ? undefined : estornar}>
            <input type="hidden" name="id" value={c.id} />
            <button
              type="submit"
              disabled={demo}
              className="text-xs text-[var(--color-muted)] underline underline-offset-4 hover:text-[var(--color-foreground)]"
            >
              desfazer
            </button>
          </form>
        </span>
      )}
    </Cartao>
  );
}

/**
 * O financeiro do mês, em duas pilhas.
 *
 * Em cima o que falta receber, vencidos primeiro; embaixo o que já entrou.
 * Quem paga sai do caminho — a lista existe para trabalhar o que resta, não
 * para admirar o que já foi feito.
 */
export function ListaDeCobrancas({
  cobrancas,
  hoje,
  receber,
  estornar,
  avisar,
  demo = false,
}: {
  cobrancas: Cobranca[];
  hoje: string;
  receber?: (form: FormData) => void | Promise<void>;
  estornar?: (form: FormData) => void | Promise<void>;
  avisar?: (form: FormData) => void | Promise<void>;
  demo?: boolean;
}) {
  if (!cobrancas.length) {
    return (
      <Vazio>
        Nenhuma cobrança neste mês. Use “Gerar mensalidades” acima, ou matricule
        alguém numa turma com valor.
      </Vazio>
    );
  }

  const aberto = cobrancas
    .filter((c) => c.status !== "paid")
    .sort((a, b) => {
      const va = estaVencida(a, hoje) ? 0 : 1;
      const vb = estaVencida(b, hoje) ? 0 : 1;
      if (va !== vb) return va - vb;
      return a.vencimento.localeCompare(b.vencimento);
    });

  const pagas = cobrancas
    .filter((c) => c.status === "paid")
    .sort((a, b) => (b.pagoEm ?? "").localeCompare(a.pagoEm ?? ""));

  const vencidas = aberto.filter((c) => estaVencida(c, hoje));
  const semAviso = vencidas.filter((c) => !c.avisadoEm).length;

  return (
    <>
      <section className="mb-10">
        <TituloSecao
          acao={
            <span className="text-xs text-[var(--color-muted)]">
              {aberto.length}{" "}
              {aberto.length === 1 ? "cobrança" : "cobranças"}
              {vencidas.length ? ` · ${vencidas.length} vencida${vencidas.length === 1 ? "" : "s"}` : ""}
            </span>
          }
        >
          A receber
        </TituloSecao>

        {semAviso > 0 ? (
          <Cartao
            className="mb-3 px-5 py-3"
            style={{ borderLeft: "3px solid var(--color-mel)" }}
          >
            <p className="text-sm">
              {semAviso} {semAviso === 1 ? "aluno vencido" : "alunos vencidos"}{" "}
              ainda sem aviso.
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              O botão verde abre a conversa no WhatsApp com a mensagem pronta.
              Um por vez — não existe envio em massa sem a API paga.
            </p>
          </Cartao>
        ) : null}

        {aberto.length ? (
          <div className="flex flex-col gap-2">
            {aberto.map((c) => (
              <Linha
                key={c.id}
                c={c}
                hoje={hoje}
                receber={receber}
                estornar={estornar}
                avisar={avisar}
                demo={demo}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-strong)] px-4 py-6 text-center text-sm text-[var(--color-muted)]">
            Tudo recebido neste mês.
          </p>
        )}
      </section>

      {pagas.length ? (
        <section>
          <TituloSecao
            acao={
              <span className="text-xs text-[var(--color-muted)]">
                {pagas.length}
              </span>
            }
          >
            Recebidas
          </TituloSecao>

          <div className="flex flex-col gap-2">
            {pagas.map((c) => (
              <Linha
                key={c.id}
                c={c}
                hoje={hoje}
                receber={receber}
                estornar={estornar}
                avisar={avisar}
                demo={demo}
              />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
