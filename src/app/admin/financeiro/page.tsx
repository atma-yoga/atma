import Link from "next/link";
import { redirect } from "next/navigation";

import { ListaDeCobrancas } from "@/components/paineis/cobrancas";
import { estaVencida, type Cobranca } from "@/lib/cobranca";
import { Shell } from "@/components/shell";
import { Botao, Numero } from "@/components/ui";
import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  estornar,
  gerarMensalidades,
  marcarAvisado,
  receber,
} from "./actions";

export const metadata = { title: "Financeiro" };

const FUSO = "America/Sao_Paulo";

/** Hoje no fuso do estúdio — o servidor roda em UTC. */
const hojeNoEstudio = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const nomeDoMes = (mes: string) =>
  new Date(`${mes}-01T12:00:00`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes: mesPedido } = await searchParams;

  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");
  if (!sessao.papeis.includes("admin")) redirect("/");

  const hoje = hojeNoEstudio();
  const mes = mesPedido ?? hoje.slice(0, 7);

  const supabase = await createClient();

  const { data: linhas } = await supabase
    .from("v_mensalidades")
    .select("*")
    .eq("reference_month", `${mes}-01`)
    .order("due_date");

  const cobrancas: Cobranca[] = (linhas ?? []).map((l) => ({
    id: l.id ?? "",
    alunoId: l.student_id ?? "",
    aluno: l.aluno ?? "sem nome",
    telefone: l.phone,
    turma: l.turma,
    valor: Number(l.amount ?? 0),
    proporcao: l.proportion === null ? null : Number(l.proportion),
    mesReferencia: l.reference_month ?? `${mes}-01`,
    vencimento: l.due_date ?? hoje,
    status: l.status ?? "pending",
    pagoEm: l.paid_at,
    forma: l.method,
    avisadoEm: l.reminded_at,
  }));

  const total = cobrancas.reduce((s, c) => s + c.valor, 0);
  const recebido = cobrancas
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + c.valor, 0);
  const vencidas = cobrancas.filter((c) => estaVencida(c, hoje));
  const emAtraso = vencidas.reduce((s, c) => s + c.valor, 0);
  const aVencer = total - recebido - emAtraso;

  // Meses vizinhos, para navegar sem digitar.
  const passo = (n: number) => {
    const d = new Date(`${mes}-01T12:00:00`);
    d.setMonth(d.getMonth() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  return (
    <Shell papel="admin" nome={sessao.perfil?.full_name ?? ""}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light">Financeiro</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Mensalidades das turmas, com vencimento no dia 5.
          </p>
        </div>

        <form action={gerarMensalidades} className="flex items-end gap-2">
          <input type="hidden" name="mes" value={mes} />
          <Botao type="submit" variante="secundario">
            Gerar mensalidades de {nomeDoMes(mes).split(" de ")[0]}
          </Botao>
        </form>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href={`/admin/financeiro?mes=${passo(-1)}`}
          className="text-xs text-[var(--color-muted)] underline underline-offset-4 hover:text-[var(--color-foreground)]"
        >
          ← {nomeDoMes(passo(-1))}
        </Link>
        <span className="text-sm">{nomeDoMes(mes)}</span>
        <Link
          href={`/admin/financeiro?mes=${passo(1)}`}
          className="text-xs text-[var(--color-muted)] underline underline-offset-4 hover:text-[var(--color-foreground)]"
        >
          {nomeDoMes(passo(1))} →
        </Link>
      </div>

      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Numero
          rotulo="Previsto"
          valor={total.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
          detalhe={`${cobrancas.length} ${
            cobrancas.length === 1 ? "cobrança" : "cobranças"
          }`}
        />
        <Numero
          rotulo="Recebido"
          valor={recebido.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        />
        <Numero
          rotulo="A vencer"
          valor={aVencer.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        />
        <Numero
          rotulo="Em atraso"
          valor={emAtraso.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
          detalhe={
            vencidas.length
              ? `${vencidas.length} ${
                  vencidas.length === 1 ? "aluno" : "alunos"
                }`
              : undefined
          }
        />
      </div>

      <ListaDeCobrancas
        cobrancas={cobrancas}
        hoje={hoje}
        receber={receber}
        estornar={estornar}
        avisar={marcarAvisado}
      />
    </Shell>
  );
}
