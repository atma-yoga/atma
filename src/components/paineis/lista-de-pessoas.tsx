import { Cartao, Etiqueta, TituloSecao, Vazio } from "@/components/ui";

export type PessoaNaLista = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  ativo: boolean;
  desde: string | null; // YYYY-MM-DD
  detalhe?: string | null; // plano, para alunos
  senhaPadrao?: boolean; // ainda não trocou a senha inicial
};

const dataCurta = (iso: string | null) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR") : "—";

export function ListaDePessoas({
  titulo,
  pessoas,
  vazio,
  acaoDeLinha,
}: {
  titulo: string;
  pessoas: PessoaNaLista[];
  vazio: string;
  /** Botão de ativar/desativar; ausente na maquete. */
  acaoDeLinha?: (p: PessoaNaLista) => React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <TituloSecao
        acao={
          <span className="text-xs text-[var(--color-muted)]">
            {pessoas.length}
          </span>
        }
      >
        {titulo}
      </TituloSecao>

      {pessoas.length ? (
        <div className="flex flex-col gap-2">
          {pessoas.map((p) => (
            <Cartao
              key={p.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4"
            >
              <span className="min-w-45 flex-1">
                <span className="block text-sm">{p.nome}</span>
                <span className="block text-xs text-[var(--color-muted)]">
                  {p.email ?? "sem e-mail"}
                  {p.telefone ? ` · ${p.telefone}` : ""}
                </span>
              </span>

              {p.detalhe ? (
                <span className="text-xs text-[var(--color-muted)]">
                  {p.detalhe}
                </span>
              ) : null}

              <span className="text-xs text-[var(--color-muted)]">
                desde {dataCurta(p.desde)}
              </span>

              {p.senhaPadrao ? (
                <Etiqueta
                  fundo="var(--color-mel)"
                  letra="var(--color-on-mel)"
                >
                  senha padrão
                </Etiqueta>
              ) : null}

              {p.ativo ? (
                <Etiqueta>Ativo</Etiqueta>
              ) : (
                <Etiqueta
                  fundo="var(--color-surface-sunken)"
                  letra="var(--color-muted)"
                >
                  Inativo
                </Etiqueta>
              )}

              {acaoDeLinha?.(p)}
            </Cartao>
          ))}
        </div>
      ) : (
        <Vazio>{vazio}</Vazio>
      )}
    </section>
  );
}
