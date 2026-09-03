import Link from "next/link";
import { redirect } from "next/navigation";

import { DIAS_CURTOS } from "@/components/paineis/grade-semanal";
import { Shell } from "@/components/shell";
import { Cartao, Etiqueta, TituloSecao, Vazio } from "@/components/ui";
import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Minhas turmas" };

export default async function TurmasDoProfessorPage() {
  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");
  if (!sessao.papeis.includes("teacher")) redirect("/");

  const supabase = await createClient();

  const { data: turmas } = await supabase
    .from("classes")
    .select(
      "id, name, capacity, is_active, rooms(name, is_outdoor), class_meetings(weekday, start_time), class_enrollments(id, is_active)",
    )
    .eq("teacher_id", sessao.userId)
    .order("name");

  const lista = (turmas ?? []).map((t) => ({
    id: t.id,
    nome: t.name,
    capacidade: t.capacity,
    ativa: t.is_active,
    sala: t.rooms?.name ?? null,
    aoArLivre: t.rooms?.is_outdoor ?? false,
    dias: (t.class_meetings ?? []).map((m) => m.weekday).sort(),
    hora: String(t.class_meetings?.[0]?.start_time ?? "").slice(0, 5),
    alunos: (t.class_enrollments ?? []).filter((e) => e.is_active).length,
  }));

  return (
    <Shell papel="teacher" nome={sessao.perfil?.full_name ?? ""}>
      <h1 className="mb-2 text-2xl font-light">Minhas turmas</h1>
      <p className="mb-8 text-sm text-[var(--color-muted)]">
        Abra uma turma para fazer a chamada e ver a frequência.
      </p>

      <TituloSecao
        acao={
          <span className="text-xs text-[var(--color-muted)]">
            {lista.length}
          </span>
        }
      >
        Turmas
      </TituloSecao>

      {lista.length ? (
        <div className="flex flex-col gap-2">
          {lista.map((t) => (
            <Link key={t.id} href={`/professor/turmas/${t.id}`} className="block">
              <Cartao
                className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition hover:shadow-[var(--shadow-raised)] ${
                  t.ativa ? "" : "opacity-55"
                }`}
                style={{
                  borderLeft: `3px solid ${
                    t.aoArLivre ? "var(--color-azul)" : "var(--color-verde)"
                  }`,
                }}
              >
                <span className="min-w-40 flex-1">
                  <span className="block text-sm">{t.nome}</span>
                  <span className="block text-xs text-[var(--color-muted)]">
                    {t.dias.map((d) => DIAS_CURTOS[d]).join(", ")} · {t.hora} ·{" "}
                    {t.sala ?? "sem local"}
                  </span>
                </span>

                <Etiqueta>
                  {t.alunos}/{t.capacidade}
                </Etiqueta>
              </Cartao>
            </Link>
          ))}
        </div>
      ) : (
        <Vazio>
          Nenhuma turma sua ainda. A administração precisa designar você como
          professor de uma turma.
        </Vazio>
      )}
    </Shell>
  );
}
