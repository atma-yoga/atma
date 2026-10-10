import Link from "next/link";
import { redirect } from "next/navigation";

import { Shell } from "@/components/shell";
import { Cartao, Etiqueta, TituloSecao, Vazio } from "@/components/ui";
import { getSessao } from "@/lib/auth";
import { corDoLocal } from "@/lib/ficha";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Chamada" };

const FUSO = "America/Sao_Paulo";

const emIso = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(d);

/** Hoje no fuso do estúdio — o servidor roda em UTC. */
const hojeNoEstudio = () => emIso(new Date());

const porExtenso = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: FUSO,
  }).format(new Date(`${iso}T12:00:00`));

const diaCurto = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: FUSO,
  }).format(new Date(`${iso}T12:00:00`));

/** O mesmo dia, deslocado. Em ISO, para não cair no fuso do servidor. */
function deslocar(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return emIso(d);
}

/**
 * A porta de entrada da chamada.
 *
 * A chamada acontece na sala, na hora, com o celular na mão: a pergunta
 * daquele instante é "quem está aqui agora". Antes desta tela o sistema
 * obrigava a responder outra pergunta primeiro — qual turma da semana —, e o
 * caminho até a lista tinha três paradas, a última num link miúdo dentro da
 * página da turma. Ninguém achava.
 *
 * Por isso ela abre no dia de hoje, com uma linha por aula, cada uma dizendo
 * em que pé está. A administração vê o estúdio inteiro; o professor, só as
 * turmas dele.
 */
export default async function ChamadaDoDiaPage({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string }>;
}) {
  const { dia: diaPedido } = await searchParams;

  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");

  const ehAdmin = sessao.papeis.includes("admin");
  const ehProfessor = sessao.papeis.includes("teacher");
  if (!ehAdmin && !ehProfessor) redirect("/");

  const hoje = hojeNoEstudio();
  const dia = diaPedido ?? hoje;
  const diaDaSemana = new Date(`${dia}T12:00:00`).getDay();

  const supabase = await createClient();

  const { data: turmas } = await supabase
    .from("classes")
    // Numa string só: o tipo da resposta é inferido do literal, e juntar
    // pedaços com `+` devolve um `string` qualquer — o TypeScript perde a
    // forma das colunas e reclama de propriedade inexistente.
    .select(
      "id, name, capacity, is_active, teacher_id, rooms(name, is_outdoor, color), class_meetings(weekday, start_time), teachers(profiles(full_name, social_name))",
    )
    .eq("is_active", true)
    .order("name");

  // O professor só enxerga as turmas dele; a adm, todas.
  const minhas = (turmas ?? []).filter(
    (t) => ehAdmin || t.teacher_id === sessao.userId,
  );

  // As aulas do dia escolhido, em ordem de horário.
  const doDia = minhas
    .flatMap((t) =>
      (t.class_meetings ?? [])
        .filter((m) => m.weekday === diaDaSemana)
        .map((m) => ({ turma: t, hora: String(m.start_time).slice(0, 5) })),
    )
    .sort((a, b) => a.hora.localeCompare(b.hora));

  // Quais dessas já têm chamada aberta, e quantos foram marcados.
  const { data: aulas } = await supabase
    .from("class_sessions")
    .select("id, class_id, starts_at, status")
    .gte("starts_at", `${dia}T00:00:00-03:00`)
    .lte("starts_at", `${dia}T23:59:59-03:00`);

  const idsDasAulas = (aulas ?? []).map((a) => a.id);

  const { data: marcacoes } = idsDasAulas.length
    ? await supabase
        .from("bookings")
        .select("session_id, status")
        .in("session_id", idsDasAulas)
    : { data: null };

  const estadoPorTurma = new Map(
    (aulas ?? [])
      .filter((a) => a.class_id)
      .map((a) => {
        const linhas = (marcacoes ?? []).filter((b) => b.session_id === a.id);
        return [
          a.class_id as string,
          {
            suspensa: a.status === "canceled",
            total: linhas.length,
            marcados: linhas.filter(
              (b) => b.status === "attended" || b.status === "no_show",
            ).length,
          },
        ];
      }),
  );

  // Os próximos dias que têm aula, para quem abre a tela num domingo ou
  // precisa preparar a semana. Sete dias bastam: é o ciclo da grade.
  const adiante = Array.from({ length: 7 }, (_, i) => deslocar(dia, i + 1))
    .map((d) => {
      const dow = new Date(`${d}T12:00:00`).getDay();
      const quantas = minhas.filter((t) =>
        (t.class_meetings ?? []).some((m) => m.weekday === dow),
      ).length;
      return { dia: d, quantas };
    })
    .filter((d) => d.quantas > 0);

  const papel = ehAdmin ? ("admin" as const) : ("teacher" as const);

  return (
    <Shell papel={papel} nome={sessao.perfil?.full_name ?? ""}>
      <h1 className="mb-2 text-2xl font-light">Chamada</h1>
      <p className="mb-8 text-sm text-[var(--color-muted)]">
        {ehAdmin
          ? "Toque na aula para marcar quem veio."
          : "Suas aulas. Toque para marcar quem veio."}
      </p>

      {/* Ontem, hoje e amanhã à mão: a chamada esquecida é a de ontem. */}
      <div className="mb-6 flex flex-wrap gap-2">
        {[deslocar(hoje, -2), deslocar(hoje, -1), hoje, deslocar(hoje, 1)].map(
          (d) => {
            const atual = d === dia;
            return (
              <Link
                key={d}
                href={d === hoje ? "/chamada" : `/chamada?dia=${d}`}
                className={`rounded-[var(--radius-md)] px-3 py-2 text-xs transition ${
                  atual
                    ? "bg-[var(--color-palha)] font-medium text-[var(--color-on-palha)]"
                    : "border border-[var(--color-border-strong)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                }`}
              >
                {d === hoje
                  ? "hoje"
                  : d === deslocar(hoje, -1)
                    ? "ontem"
                    : d === deslocar(hoje, 1)
                      ? "amanhã"
                      : diaCurto(d)}
              </Link>
            );
          },
        )}
      </div>

      <TituloSecao>{porExtenso(dia)}</TituloSecao>

      {!doDia.length ? (
        <Vazio>
          {ehAdmin
            ? "Nenhuma turma tem aula neste dia."
            : "Você não tem aula neste dia."}
        </Vazio>
      ) : (
        <div className="flex flex-col gap-2">
          {doDia.map(({ turma, hora }) => {
            const estado = estadoPorTurma.get(turma.id);
            const professor =
              turma.teachers?.profiles?.social_name ??
              turma.teachers?.profiles?.full_name ??
              "sem professor";

            return (
              <Link
                key={`${turma.id}-${hora}`}
                href={`/professor/turmas/${turma.id}?dia=${dia}`}
                className="block"
              >
                <Cartao
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition hover:shadow-[var(--shadow-raised)]"
                  style={{
                    borderLeft: `3px solid ${corDoLocal(turma.rooms?.color)}`,
                  }}
                >
                  <span className="w-14 shrink-0 font-mono text-sm">
                    {hora}
                  </span>

                  <span className="min-w-40 flex-1">
                    <span className="block text-sm">{turma.name}</span>
                    <span className="block text-xs text-[var(--color-muted)]">
                      {professor} · {turma.rooms?.name ?? "sem local"}
                    </span>
                  </span>

                  {estado?.suspensa ? (
                    <Etiqueta
                      fundo="var(--color-danger)"
                      letra="var(--color-papel)"
                    >
                      aula suspensa
                    </Etiqueta>
                  ) : !estado ? (
                    <Etiqueta>chamada não aberta</Etiqueta>
                  ) : estado.marcados === 0 ? (
                    <Etiqueta>aberta, ninguém marcado</Etiqueta>
                  ) : estado.marcados < estado.total ? (
                    <Etiqueta fundo="var(--color-mel)" letra="var(--color-on-mel)">
                      {estado.marcados} de {estado.total} marcados
                    </Etiqueta>
                  ) : (
                    <Etiqueta
                      fundo="var(--color-verde)"
                      letra="var(--color-on-verde)"
                    >
                      chamada feita
                    </Etiqueta>
                  )}
                </Cartao>
              </Link>
            );
          })}
        </div>
      )}

      {adiante.length ? (
        <>
          <TituloSecao>Próximos dias</TituloSecao>
          <div className="flex flex-wrap gap-2">
            {adiante.map((d) => (
              <Link
                key={d.dia}
                href={`/chamada?dia=${d.dia}`}
                className="rounded-[var(--radius-md)] border border-[var(--color-border-strong)] px-3 py-2 text-xs text-[var(--color-muted)] transition hover:text-[var(--color-foreground)]"
              >
                {diaCurto(d.dia)} · {d.quantas}{" "}
                {d.quantas === 1 ? "aula" : "aulas"}
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </Shell>
  );
}
