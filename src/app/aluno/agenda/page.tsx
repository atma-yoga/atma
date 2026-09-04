import { redirect } from "next/navigation";

import { Shell } from "@/components/shell";
import { Cartao, Etiqueta, TituloSecao, Vazio } from "@/components/ui";
import { getSessao } from "@/lib/auth";
import { corDoLocal } from "@/lib/ficha";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Minhas aulas" };

const FUSO = "America/Sao_Paulo";

const quando = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: FUSO,
  }).format(new Date(iso));

const mesDe = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: FUSO,
  }).format(new Date(iso));

export default async function AgendaDoAlunoPage() {
  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");

  const supabase = await createClient();
  const agora = new Date().toISOString();

  const { data: aulas } = await supabase
    .from("v_aulas_do_aluno")
    .select("*")
    .eq("student_id", sessao.userId)
    .order("starts_at", { ascending: false });

  const todas = aulas ?? [];
  const proximas = todas
    .filter((a) => (a.starts_at ?? "") >= agora)
    .sort((a, b) => (a.starts_at ?? "").localeCompare(b.starts_at ?? ""));
  const passadas = todas.filter((a) => (a.starts_at ?? "") < agora);

  // As passadas viram grupos por mês: uma lista corrida de cem aulas não se
  // lê, e o mês é como a pessoa lembra da própria frequência.
  const porMes = new Map<string, typeof passadas>();
  for (const a of passadas) {
    const chave = mesDe(a.starts_at ?? agora);
    porMes.set(chave, [...(porMes.get(chave) ?? []), a]);
  }

  return (
    <Shell papel="student" nome={sessao.perfil?.full_name ?? ""}>
      <h1 className="mb-2 text-2xl font-light">Minhas aulas</h1>
      <p className="mb-8 text-sm text-[var(--color-muted)]">
        Tudo que você já fez e o que vem por aí.
      </p>

      <section className="mb-12">
        <TituloSecao
          acao={
            <span className="text-xs text-[var(--color-muted)]">
              {proximas.length}
            </span>
          }
        >
          Próximas
        </TituloSecao>

        {proximas.length ? (
          <div className="flex flex-col gap-2">
            {proximas.map((a) => {
              const suspensa = a.status_aula === "canceled";

              return (
                <Cartao
                  key={a.booking_id ?? a.session_id}
                  className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 ${
                    suspensa ? "opacity-60" : ""
                  }`}
                  style={{ borderLeft: `3px solid ${corDoLocal(a.cor)}` }}
                >
                  <span className="min-w-48 flex-1">
                    <span
                      className={`block text-sm ${
                        suspensa ? "line-through" : ""
                      }`}
                    >
                      {quando(a.starts_at ?? agora)}
                    </span>
                    <span className="block text-xs text-[var(--color-muted)]">
                      {a.turma ?? "Yoga"}
                      {a.sala ? ` · ${a.sala}` : ""}
                      {a.professor ? ` · ${a.professor}` : ""}
                    </span>
                  </span>

                  {suspensa ? (
                    <Etiqueta
                      fundo="var(--color-danger)"
                      letra="var(--color-papel)"
                    >
                      suspensa
                    </Etiqueta>
                  ) : a.is_outdoor ? (
                    <Etiqueta
                      fundo="var(--color-azul)"
                      letra="var(--color-on-azul)"
                    >
                      ao ar livre
                    </Etiqueta>
                  ) : null}

                  {suspensa && a.cancel_reason ? (
                    <span className="w-full text-xs text-[var(--color-muted)]">
                      {a.cancel_reason}
                    </span>
                  ) : null}
                </Cartao>
              );
            })}
          </div>
        ) : (
          <Vazio>
            Nenhuma aula marcada. Fale com a recepção se isso não parece certo.
          </Vazio>
        )}
      </section>

      <section>
        <TituloSecao
          acao={
            <span className="text-xs text-[var(--color-muted)]">
              {passadas.length}
            </span>
          }
        >
          Já aconteceram
        </TituloSecao>

        {porMes.size ? (
          <div className="flex flex-col gap-8">
            {[...porMes.entries()].map(([mes, doMes]) => {
              const veio = doMes.filter((a) => a.presenca === "attended").length;
              const faltou = doMes.filter((a) => a.presenca === "no_show").length;

              return (
                <div key={mes}>
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-sm">{mes}</h3>
                    <span className="text-xs text-[var(--color-muted)]">
                      {veio} {veio === 1 ? "presença" : "presenças"}
                      {faltou
                        ? ` · ${faltou} ${faltou === 1 ? "falta" : "faltas"}`
                        : ""}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {doMes.map((a) => (
                      <Cartao
                        key={a.booking_id ?? a.session_id}
                        className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3"
                        style={{
                          borderLeft: `3px solid ${
                            a.presenca === "attended"
                              ? "var(--color-verde)"
                              : a.presenca === "no_show"
                                ? "var(--color-mel)"
                                : "transparent"
                          }`,
                        }}
                      >
                        <span className="min-w-40 flex-1 text-sm">
                          {quando(a.starts_at ?? agora)}
                        </span>

                        <span className="text-xs text-[var(--color-muted)]">
                          {a.turma ?? "Yoga"}
                        </span>

                        {a.presenca === "attended" ? (
                          <Etiqueta
                            fundo="var(--color-verde)"
                            letra="var(--color-on-verde)"
                          >
                            presente
                          </Etiqueta>
                        ) : a.presenca === "no_show" ? (
                          <Etiqueta
                            fundo="var(--color-mel)"
                            letra="var(--color-on-mel)"
                          >
                            faltou
                          </Etiqueta>
                        ) : (
                          <Etiqueta
                            fundo="var(--color-surface-sunken)"
                            letra="var(--color-muted)"
                          >
                            sem chamada
                          </Etiqueta>
                        )}
                      </Cartao>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Vazio>Nenhuma aula registrada ainda.</Vazio>
        )}
      </section>
    </Shell>
  );
}
