import { Cartao, Numero, TituloSecao, Vazio, dataHora, hora } from "@/components/ui";
import { primeiroNome } from "@/lib/auth";
import { nomeDaAula, type AulaNaAgenda } from "./tipos";

export function PainelProfessor({
  nome,
  hoje,
  semana,
}: {
  nome: string;
  hoje: AulaNaAgenda[];
  semana: AulaNaAgenda[];
}) {
  const alunosHoje = hoje.reduce((soma, a) => soma + a.ocupadas, 0);

  return (
    <>
      <h1 className="mb-8 text-2xl font-light">
        Bom dia, {primeiroNome(nome) || "professor"}.
      </h1>

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <Numero rotulo="Aulas hoje" valor={hoje.length} />
        <Numero rotulo="Alunos hoje" valor={alunosHoje} />
        <Numero rotulo="Aulas na semana" valor={semana.length} />
      </div>

      <section className="mb-10">
        <TituloSecao>Hoje</TituloSecao>
        {hoje.length ? (
          <div className="flex flex-col gap-2">
            {hoje.map((a) => (
              <Cartao key={a.id} className="flex items-center gap-4 px-5 py-4">
                <span
                  className="h-10 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: "var(--color-mel)" }}
                />
                <span className="flex-1">
                  <span className="block text-sm">
                    {hora(a.inicio)} · {nomeDaAula(a.titulo)}
                  </span>
                  <span className="block text-xs text-[var(--color-muted)]">
                    {a.sala ?? "Sem sala"} · {a.ocupadas}/{a.capacidade} alunos
                    {a.naEspera > 0 ? ` · ${a.naEspera} na espera` : ""}
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
        {semana.length ? (
          <div className="flex flex-col gap-2">
            {semana.map((a) => (
              <Cartao
                key={a.id}
                className="flex items-center justify-between gap-4 px-5 py-3"
              >
                <span className="text-sm">
                  {dataHora(a.inicio)} · {nomeDaAula(a.titulo)}
                </span>
                <span className="text-xs text-[var(--color-muted)]">
                  {a.ocupadas}/{a.capacidade}
                </span>
              </Cartao>
            ))}
          </div>
        ) : (
          <Vazio>Nada agendado para os próximos sete dias.</Vazio>
        )}
      </section>
    </>
  );
}
