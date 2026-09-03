import { redirect } from "next/navigation";

import { Shell } from "@/components/shell";
import {
  Cartao,
  Numero,
  TituloSecao,
  Vazio,
  brl,
  dataHora,
} from "@/components/ui";
import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Visão geral" };

export default async function PainelAdmin() {
  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");
  if (!sessao.papeis.includes("admin")) redirect("/");

  const supabase = await createClient();

  const agora = new Date();
  const emSeteDias = new Date(agora.getTime() + 7 * 864e5);
  const inicioDoMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

  const [
    { count: alunosAtivos },
    { count: matriculasAtivas },
    { data: vencidos },
    { data: recebidoNoMes },
    { data: proximas },
  ] = await Promise.all([
    supabase
      .from("students")
      .select("profile_id", { count: "exact", head: true })
      .eq("is_active", true),

    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),

    supabase.from("payments").select("amount").eq("status", "overdue"),

    supabase
      .from("payments")
      .select("amount")
      .eq("status", "paid")
      .gte("paid_at", inicioDoMes.toISOString()),

    supabase
      .from("v_session_availability")
      .select("*")
      .eq("status", "scheduled")
      .gte("starts_at", agora.toISOString())
      .lte("starts_at", emSeteDias.toISOString())
      .order("starts_at")
      .limit(8),
  ]);

  const soma = (linhas: { amount: number }[] | null) =>
    (linhas ?? []).reduce((t, l) => t + Number(l.amount), 0);

  return (
    <Shell papel="admin" nome={sessao.perfil?.full_name ?? ""}>
      <h1 className="mb-8 text-2xl font-light">Visão geral do estúdio</h1>

      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Numero rotulo="Alunos ativos" valor={alunosAtivos ?? 0} />
        <Numero rotulo="Matrículas ativas" valor={matriculasAtivas ?? 0} />
        <Numero
          rotulo="Recebido no mês"
          valor={brl(soma(recebidoNoMes))}
          detalhe={inicioDoMes.toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
          })}
        />
        <Numero
          rotulo="Em atraso"
          valor={brl(soma(vencidos))}
          detalhe={`${vencidos?.length ?? 0} cobrança${
            vencidos?.length === 1 ? "" : "s"
          }`}
        />
      </div>

      <section>
        <TituloSecao>Agenda dos próximos sete dias</TituloSecao>
        {proximas?.length ? (
          <div className="flex flex-col gap-2">
            {proximas.map((s) => {
              const lotacao =
                (s.capacity ?? 0) > 0
                  ? (s.booked_count ?? 0) / (s.capacity ?? 1)
                  : 0;
              return (
                <Cartao
                  key={s.session_id}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <span
                    className="h-10 w-1 shrink-0 rounded-full"
                    style={{
                      backgroundColor: s.modality_color ?? "var(--color-mel)",
                    }}
                  />
                  <span className="flex-1">
                    <span className="block text-sm">
                      {s.modality} · {s.teacher_name}
                    </span>
                    <span className="block text-xs text-[var(--color-muted)]">
                      {s.starts_at ? dataHora(s.starts_at) : ""} ·{" "}
                      {s.room ?? "Sem sala"}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm tabular-nums">
                      {s.booked_count}/{s.capacity}
                    </span>
                    <span className="block text-[10px] uppercase tracking-[0.14em] text-[var(--color-subtle)]">
                      {Math.round(lotacao * 100)}%
                    </span>
                  </span>
                </Cartao>
              );
            })}
          </div>
        ) : (
          <Vazio>
            Nenhuma sessão gerada. Rode{" "}
            <code className="font-mono text-xs">
              select generate_sessions(current_date, current_date + 30);
            </code>{" "}
            no SQL Editor para materializar a grade.
          </Vazio>
        )}
      </section>
    </Shell>
  );
}
