import { Cartao, Etiqueta, Vazio, brl } from "@/components/ui";
import { FORMA_PAGAMENTO, type FormaPagamento, type StatusPagamento } from "@/lib/tipos";

export type Cobranca = {
  id: string;
  aluno: string;
  turma: string | null;
  valor: number;
  proporcao: number | null;
  vencimento: string; // YYYY-MM-DD
  status: StatusPagamento;
  pagoEm: string | null;
  forma: FormaPagamento | null;
};

const data = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

/**
 * "Vencido" é calculado na hora, não lido do banco.
 *
 * O status gravado só mudaria se alguém rodasse uma rotina diária; sem isso a
 * cobrança de ontem apareceria como "a vencer" para sempre.
 */
export function estaVencida(c: Cobranca, hoje: string) {
  return c.status === "pending" && c.vencimento < hoje;
}

const ETIQUETA: Record<
  string,
  { texto: string; fundo: string; letra: string }
> = {
  paid: {
    texto: "Pago",
    fundo: "var(--color-verde)",
    letra: "var(--color-on-verde)",
  },
  vencido: {
    texto: "Vencido",
    fundo: "var(--color-danger)",
    letra: "var(--color-papel)",
  },
  pending: {
    texto: "A vencer",
    fundo: "var(--color-palha)",
    letra: "var(--color-on-palha)",
  },
  refunded: {
    texto: "Estornado",
    fundo: "var(--color-surface-sunken)",
    letra: "var(--color-muted)",
  },
  canceled: {
    texto: "Cancelado",
    fundo: "var(--color-surface-sunken)",
    letra: "var(--color-muted)",
  },
};

export function ListaDeCobrancas({
  cobrancas,
  hoje,
  receber,
  estornar,
  demo = false,
}: {
  cobrancas: Cobranca[];
  hoje: string;
  receber?: (form: FormData) => void | Promise<void>;
  estornar?: (form: FormData) => void | Promise<void>;
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

  return (
    <div className="flex flex-col gap-2">
      {cobrancas.map((c) => {
        const chave = estaVencida(c, hoje) ? "vencido" : c.status;
        const et = ETIQUETA[chave] ?? ETIQUETA.pending;

        return (
          <Cartao
            key={c.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-3"
            style={
              chave === "vencido"
                ? { borderLeft: "3px solid var(--color-danger)" }
                : undefined
            }
          >
            <span className="min-w-40 flex-1">
              <span className="block text-sm">{c.aluno}</span>
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
                vence {data(c.vencimento)}
              </span>
            </span>

            <Etiqueta fundo={et.fundo} letra={et.letra}>
              {et.texto}
            </Etiqueta>

            {c.status === "paid" ? (
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
            ) : (
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
            )}
          </Cartao>
        );
      })}
    </div>
  );
}
