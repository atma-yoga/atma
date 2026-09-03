import { redirect } from "next/navigation";

import { PainelAdmin } from "@/components/paineis/painel-admin";
import type { AulaNaAgenda } from "@/components/paineis/tipos";
import { Shell } from "@/components/shell";
import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Visão geral" };

export default async function AdminPage() {
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
    { data: recebido },
    { data: sessoes },
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

  const proximas: AulaNaAgenda[] = (sessoes ?? []).map((s) => ({
    id: s.session_id ?? crypto.randomUUID(),
    inicio: s.starts_at ?? agora.toISOString(),
    titulo: s.title,
    professor: s.teacher_name,
    sala: s.room,
    ocupadas: s.booked_count ?? 0,
    capacidade: s.capacity ?? 0,
    naEspera: s.waitlist_count ?? 0,
  }));

  return (
    <Shell papel="admin" nome={sessao.perfil?.full_name ?? ""}>
      <PainelAdmin
        alunosAtivos={alunosAtivos ?? 0}
        matriculasAtivas={matriculasAtivas ?? 0}
        recebidoNoMes={soma(recebido)}
        totalEmAtraso={soma(vencidos)}
        cobrancasEmAtraso={vencidos?.length ?? 0}
        proximas={proximas}
      />
    </Shell>
  );
}
