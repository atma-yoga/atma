import { redirect } from "next/navigation";

import { PainelProfessor } from "@/components/paineis/painel-professor";
import type { AulaNaAgenda } from "@/components/paineis/tipos";
import { Shell } from "@/components/shell";
import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Views } from "@/lib/database.types";

export const metadata = { title: "Minhas aulas" };

const paraAula = (s: Views<"v_session_availability">): AulaNaAgenda => ({
  id: s.session_id ?? crypto.randomUUID(),
  inicio: s.starts_at ?? new Date().toISOString(),
  titulo: s.title,
  professor: s.teacher_name,
  sala: s.room,
  ocupadas: s.booked_count ?? 0,
  capacidade: s.capacity ?? 0,
  naEspera: s.waitlist_count ?? 0,
});

export default async function ProfessorPage() {
  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");
  // A administração também entra: para dar suporte a um professor com
  // dúvida, ela precisa ver a mesma tela que ele vê.
  const ehProfessor = sessao.papeis.includes("teacher");
  if (!ehProfessor && !sessao.papeis.includes("admin")) redirect("/");

  const supabase = await createClient();

  const agora = new Date();
  const fimDoDia = new Date(agora);
  fimDoDia.setHours(23, 59, 59, 999);
  const emUmaSemana = new Date(agora.getTime() + 7 * 864e5);

  const [{ data: hoje }, { data: semana }] = await Promise.all([
    supabase
      .from("v_session_availability")
      .select("*")
      .eq("teacher_id", sessao.userId)
      .eq("status", "scheduled")
      .gte("starts_at", agora.toISOString())
      .lte("starts_at", fimDoDia.toISOString())
      .order("starts_at"),

    supabase
      .from("v_session_availability")
      .select("*")
      .eq("teacher_id", sessao.userId)
      .eq("status", "scheduled")
      .gt("starts_at", fimDoDia.toISOString())
      .lte("starts_at", emUmaSemana.toISOString())
      .order("starts_at"),
  ]);

  return (
    <Shell papel="teacher" nome={sessao.perfil?.full_name ?? ""}>
      <PainelProfessor
        nome={sessao.perfil?.full_name ?? ""}
        hoje={(hoje ?? []).map(paraAula)}
        semana={(semana ?? []).map(paraAula)}
      />
    </Shell>
  );
}
