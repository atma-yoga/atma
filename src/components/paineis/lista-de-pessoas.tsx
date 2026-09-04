import Link from "next/link";

import { ResetarSenha } from "@/components/paineis/resetar-senha";
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
  /** Ficha completa; ausente para quem não tem tela de detalhe. */
  href?: string;
};

const dataCurta = (iso: string | null) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR") : "—";

export function ListaDePessoas({
  titulo,
  pessoas,
  vazio,
  acaoDeLinha,
  resetar,
}: {
  titulo: string;
  pessoas: PessoaNaLista[];
  vazio: string;
  /** Botão de ativar/desativar; ausente na maquete. */
  acaoDeLinha?: (p: PessoaNaLista) => React.ReactNode;
  /** Devolve a senha à padrão do estúdio. */
  resetar?: (form: FormData) => void | Promise<void>;
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
                {p.href ? (
                  <Link
                    href={p.href}
                    className="block text-sm underline-offset-4 hover:underline"
                  >
                    {p.nome}
                  </Link>
                ) : (
                  <span className="block text-sm">{p.nome}</span>
                )}
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

              {resetar ? (
                <ResetarSenha id={p.id} nome={p.nome} acao={resetar} />
              ) : null}

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
