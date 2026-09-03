import { redirect } from "next/navigation";

import { PainelAluno } from "@/components/paineis/painel-aluno";
import type { AgendamentoDoAluno, AulaNaAgenda } from "@/components/paineis/tipos";
import { Shell } from "@/components/shell";
import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Início" };

export default async function AlunoPage() {
  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");

  const supabase = await createClient();
  const agora = new Date().toISOString();

  const [{ data: resumo }, { data: agendados }, { data: sessoes }] =
    await Promise.all([
      supabase
        .from("v_student_overview")
        .select("*")
        .eq("profile_id", sessao.userId)
        .maybeSingle(),

      supabase
        .from("bookings")
        .select(
          // teacher_id aponta para teachers, então o nome vem de teachers → profiles.
          "id, status, waitlist_pos, class_sessions!inner(starts_at, modalities(name), teachers(profiles(full_name)))",
        )
        .eq("student_id", sessao.userId)
        .in("status", ["booked", "waitlisted"])
        .gte("class_sessions.starts_at", agora)
        .order("starts_at", { referencedTable: "class_sessions" })
        .limit(5),

      supabase
        .from("v_session_availability")
        .select("*")
        .eq("status", "scheduled")
        .gte("starts_at", agora)
        .order("starts_at")
        .limit(6),
    ]);

  const proximas: AgendamentoDoAluno[] = (agendados ?? []).map((b) => ({
    id: b.id,
    inicio: b.class_sessions?.starts_at ?? agora,
    modalidade: b.class_sessions?.modalities?.name ?? "Aula",
    professor: b.class_sessions?.teachers?.profiles?.full_name ?? null,
    status: b.status,
    posicaoNaEspera: b.waitlist_pos,
  }));

  const disponiveis: AulaNaAgenda[] = (sessoes ?? []).map((s) => ({
    id: s.session_id ?? crypto.randomUUID(),
    inicio: s.starts_at ?? agora,
    modalidade: s.modality ?? "Aula",
    cor: s.modality_color,
    professor: s.teacher_name,
    sala: s.room,
    ocupadas: s.booked_count ?? 0,
    capacidade: s.capacity ?? 0,
    naEspera: s.waitlist_count ?? 0,
  }));

  return (
    <Shell papel="student" nome={sessao.perfil?.full_name ?? ""}>
      <PainelAluno
        nome={sessao.perfil?.full_name ?? ""}
        resumo={{
          plano: resumo?.plan_name ?? null,
          creditosRestantes:
            resumo?.credits_total === null ? null : (resumo?.credits_left ?? 0),
          aulasFeitas: resumo?.total_attended ?? 0,
          planoVenceEm: resumo?.ends_on ?? null,
        }}
        proximas={proximas}
        disponiveis={disponiveis}
      />
    </Shell>
  );
}
