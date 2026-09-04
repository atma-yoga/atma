import { AvisoDeAula, type ProximaAula } from "@/components/paineis/aviso-de-aula";
import {
  GraficoDoAno,
  GraficoDoMes,
  GraficoGeral,
  type AulaDoMes,
  type MesDoAno,
} from "@/components/paineis/graficos-frequencia";
import { Cartao, TituloSecao, Vazio, dataHora } from "@/components/ui";
import { primeiroNome } from "@/lib/auth";
import { corDoLocal } from "@/lib/ficha";

export type AulaListada = {
  id: string;
  inicio: string;
  turma: string;
  professor: string | null;
  sala: string | null;
  cor: string | null;
  suspensa: boolean;
};

export function PainelAluno({
  nome,
  hoje,
  proxima,
  aulasDoMes,
  mesesDoAno,
  ano,
  presencasTotais,
  faltasTotais,
  desde,
  proximasAulas,
  turmas,
}: {
  nome: string;
  hoje: string;
  proxima: ProximaAula | null;
  aulasDoMes: AulaDoMes[];
  mesesDoAno: MesDoAno[];
  ano: number;
  presencasTotais: number;
  faltasTotais: number;
  desde: string | null;
  proximasAulas: AulaListada[];
  turmas: string[];
}) {
  return (
    <>
      <h1 className="mb-2 text-2xl font-light">
        Olá, {primeiroNome(nome) || "seja bem-vindo"}.
      </h1>
      <p className="mb-8 text-sm text-[var(--color-muted)]">
        {turmas.length
          ? `Você está em ${turmas.join(", ")}.`
          : "Você ainda não está em nenhuma turma."}
      </p>

      <AvisoDeAula aula={proxima} hoje={hoje} />

      <section className="mb-12">
        <TituloSecao>Sua frequência</TituloSecao>
        <div className="grid gap-4 lg:grid-cols-3">
          <GraficoDoMes aulas={aulasDoMes} />
          <GraficoDoAno meses={mesesDoAno} ano={ano} />
          <GraficoGeral
            presencas={presencasTotais}
            faltas={faltasTotais}
            desde={desde}
          />
        </div>
      </section>

      <section>
        <TituloSecao>Próximas aulas</TituloSecao>
        {proximasAulas.length ? (
          <div className="flex flex-col gap-2">
            {proximasAulas.map((a) => (
              <Cartao
                key={a.id}
                className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 ${
                  a.suspensa ? "opacity-55" : ""
                }`}
                style={{ borderLeft: `3px solid ${corDoLocal(a.cor)}` }}
              >
                <span className="min-w-40 flex-1">
                  <span className="block text-sm">
                    {a.turma}
                    {a.suspensa ? " · suspensa" : ""}
                  </span>
                  <span className="block text-xs text-[var(--color-muted)]">
                    {dataHora(a.inicio)}
                    {a.sala ? ` · ${a.sala}` : ""}
                    {a.professor ? ` · ${a.professor}` : ""}
                  </span>
                </span>
              </Cartao>
            ))}
          </div>
        ) : (
          <Vazio>
            Nenhuma aula à vista. A administração ainda não abriu as próximas
            aulas da sua turma.
          </Vazio>
        )}
      </section>
    </>
  );
}
