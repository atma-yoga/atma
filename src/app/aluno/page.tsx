import { redirect } from "next/navigation";

import { Shell } from "@/components/shell";
import {
  Cartao,
  Etiqueta,
  Numero,
  TituloSecao,
  Vazio,
  dataHora,
} from "@/components/ui";
import { getSessao, primeiroNome } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { COR_STATUS_AGENDAMENTO, STATUS_AGENDAMENTO } from "@/lib/tipos";

export const metadata = { title: "Início" };

export default async function PainelAluno() {
  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");

  const supabase = await createClient();
  const agora = new Date().toISOString();

  const [{ data: resumo }, { data: proximas }, { data: disponiveis }] =
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

  const creditos =
    resumo?.credits_total === null
      ? "Ilimitado"
      : `${resumo?.credits_left ?? 0}`;

  return (
    <Shell papel="student" nome={sessao.perfil?.full_name ?? ""}>
      <h1 className="mb-8 text-2xl font-light">
        Olá, {primeiroNome(sessao.perfil?.full_name) || "seja bem-vindo"}.
      </h1>

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <Numero
          rotulo="Aulas restantes"
          valor={creditos}
          detalhe={resumo?.plan_name ?? "Sem plano ativo"}
        />
        <Numero rotulo="Aulas feitas" valor={resumo?.total_attended ?? 0} />
        <Numero
          rotulo="Plano vence em"
          valor={
            resumo?.ends_on
              ? new Date(`${resumo.ends_on}T12:00:00`).toLocaleDateString("pt-BR")
              : "—"
          }
        />
      </div>

      <section className="mb-10">
        <TituloSecao>Suas próximas aulas</TituloSecao>
        {proximas?.length ? (
          <div className="flex flex-col gap-2">
            {proximas.map((b) => {
              const s = b.class_sessions;
              const professor = s?.teachers?.profiles?.full_name;
              const cor = COR_STATUS_AGENDAMENTO[b.status];
              return (
                <Cartao
                  key={b.id}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <span>
                    <span className="block text-sm">
                      {s?.modalities?.name ?? "Aula"}
                    </span>
                    <span className="block text-xs text-[var(--color-muted)]">
                      {s?.starts_at ? dataHora(s.starts_at) : ""}
                      {professor ? ` · ${professor}` : ""}
                    </span>
                  </span>
                  <Etiqueta fundo={cor.fundo} letra={cor.letra}>
                    {STATUS_AGENDAMENTO[b.status]}
                    {b.waitlist_pos ? ` · ${b.waitlist_pos}º` : ""}
                  </Etiqueta>
                </Cartao>
              );
            })}
          </div>
        ) : (
          <Vazio>Nenhuma aula agendada. Escolha uma abaixo.</Vazio>
        )}
      </section>

      <section>
        <TituloSecao>Vagas abertas</TituloSecao>
        {disponiveis?.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {disponiveis.map((s) => (
              <Cartao key={s.session_id} className="p-5">
                <span
                  className="mb-3 block h-1 w-10 rounded-full"
                  style={{ backgroundColor: s.modality_color ?? "var(--color-mel)" }}
                />
                <p className="text-sm">{s.modality}</p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  {s.starts_at ? dataHora(s.starts_at) : ""} · {s.teacher_name}
                </p>
                <p className="mt-3 text-xs text-[var(--color-muted)]">
                  {(s.spots_left ?? 0) > 0
                    ? `${s.spots_left} vaga${s.spots_left === 1 ? "" : "s"}`
                    : `Lotada · ${s.waitlist_count ?? 0} na espera`}
                </p>
              </Cartao>
            ))}
          </div>
        ) : (
          <Vazio>
            Nenhuma aula na agenda ainda. A administração precisa gerar as
            sessões da grade.
          </Vazio>
        )}
      </section>
    </Shell>
  );
}
