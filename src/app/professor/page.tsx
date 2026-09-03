import { redirect } from "next/navigation";

import { Shell } from "@/components/shell";
import { Cartao, Numero, TituloSecao, Vazio, dataHora, hora } from "@/components/ui";
import { getSessao, primeiroNome } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Minhas aulas" };

export default async function PainelProfessor() {
  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");
  if (!sessao.papeis.includes("teacher")) redirect("/");

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

  const alunosHoje = (hoje ?? []).reduce(
    (soma, s) => soma + (s.booked_count ?? 0),
    0,
  );

  return (
    <Shell papel="teacher" nome={sessao.perfil?.full_name ?? ""}>
      <h1 className="mb-8 text-2xl font-light">
        Bom dia, {primeiroNome(sessao.perfil?.full_name) || "professor"}.
      </h1>

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <Numero rotulo="Aulas hoje" valor={hoje?.length ?? 0} />
        <Numero rotulo="Alunos hoje" valor={alunosHoje} />
        <Numero rotulo="Aulas na semana" valor={semana?.length ?? 0} />
      </div>

      <section className="mb-10">
        <TituloSecao>Hoje</TituloSecao>
        {hoje?.length ? (
          <div className="flex flex-col gap-2">
            {hoje.map((s) => (
              <Cartao
                key={s.session_id}
                className="flex items-center gap-4 px-5 py-4"
              >
                <span
                  className="h-10 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: s.modality_color ?? "var(--color-mel)" }}
                />
                <span className="flex-1">
                  <span className="block text-sm">
                    {s.starts_at ? hora(s.starts_at) : ""} · {s.modality}
                  </span>
                  <span className="block text-xs text-[var(--color-muted)]">
                    {s.room ?? "Sem sala"} · {s.booked_count}/{s.capacity} alunos
                    {(s.waitlist_count ?? 0) > 0
                      ? ` · ${s.waitlist_count} na espera`
                      : ""}
                  </span>
                </span>
              </Cartao>
            ))}
          </div>
        ) : (
          <Vazio>Nenhuma aula sua hoje.</Vazio>
        )}
      </section>

      <section>
        <TituloSecao>Próximos sete dias</TituloSecao>
        {semana?.length ? (
          <div className="flex flex-col gap-2">
            {semana.map((s) => (
              <Cartao
                key={s.session_id}
                className="flex items-center justify-between gap-4 px-5 py-3"
              >
                <span className="text-sm">
                  {s.starts_at ? dataHora(s.starts_at) : ""} · {s.modality}
                </span>
                <span className="text-xs text-[var(--color-muted)]">
                  {s.booked_count}/{s.capacity}
                </span>
              </Cartao>
            ))}
          </div>
        ) : (
          <Vazio>Nada agendado para os próximos sete dias.</Vazio>
        )}
      </section>
    </Shell>
  );
}
