import {
  Cartao,
  Etiqueta,
  Numero,
  TituloSecao,
  Vazio,
  dataHora,
} from "@/components/ui";
import { COR_STATUS_AGENDAMENTO, STATUS_AGENDAMENTO } from "@/lib/tipos";
import { primeiroNome } from "@/lib/auth";
import {
  vagasLivres,
  type AgendamentoDoAluno,
  type AulaNaAgenda,
  type ResumoDoAluno,
} from "./tipos";

export function PainelAluno({
  nome,
  resumo,
  proximas,
  disponiveis,
}: {
  nome: string;
  resumo: ResumoDoAluno;
  proximas: AgendamentoDoAluno[];
  disponiveis: AulaNaAgenda[];
}) {
  return (
    <>
      <h1 className="mb-8 text-2xl font-light">
        Olá, {primeiroNome(nome) || "seja bem-vindo"}.
      </h1>

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <Numero
          rotulo="Aulas restantes"
          valor={resumo.creditosRestantes ?? "Ilimitado"}
          detalhe={resumo.plano ?? "Sem plano ativo"}
        />
        <Numero rotulo="Aulas feitas" valor={resumo.aulasFeitas} />
        <Numero
          rotulo="Plano vence em"
          valor={
            resumo.planoVenceEm
              ? new Date(`${resumo.planoVenceEm}T12:00:00`).toLocaleDateString(
                  "pt-BR",
                )
              : "—"
          }
        />
      </div>

      <section className="mb-10">
        <TituloSecao>Suas próximas aulas</TituloSecao>
        {proximas.length ? (
          <div className="flex flex-col gap-2">
            {proximas.map((a) => {
              const cor = COR_STATUS_AGENDAMENTO[a.status];
              return (
                <Cartao
                  key={a.id}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <span>
                    <span className="block text-sm">{a.modalidade}</span>
                    <span className="block text-xs text-[var(--color-muted)]">
                      {dataHora(a.inicio)}
                      {a.professor ? ` · ${a.professor}` : ""}
                    </span>
                  </span>
                  <Etiqueta fundo={cor.fundo} letra={cor.letra}>
                    {STATUS_AGENDAMENTO[a.status]}
                    {a.posicaoNaEspera ? ` · ${a.posicaoNaEspera}º` : ""}
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
        {disponiveis.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {disponiveis.map((a) => {
              const livres = vagasLivres(a);
              return (
                <Cartao key={a.id} className="p-5">
                  <span
                    className="mb-3 block h-1 w-10 rounded-full"
                    style={{ backgroundColor: a.cor ?? "var(--color-mel)" }}
                  />
                  <p className="text-sm">{a.modalidade}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {dataHora(a.inicio)}
                    {a.professor ? ` · ${a.professor}` : ""}
                  </p>
                  <p className="mt-3 text-xs text-[var(--color-muted)]">
                    {livres > 0
                      ? `${livres} vaga${livres === 1 ? "" : "s"}`
                      : `Lotada · ${a.naEspera} na espera`}
                  </p>
                </Cartao>
              );
            })}
          </div>
        ) : (
          <Vazio>
            Nenhuma aula na agenda ainda. A administração precisa gerar as
            sessões da grade.
          </Vazio>
        )}
      </section>
    </>
  );
}
