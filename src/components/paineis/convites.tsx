"use client";

import { useState } from "react";

import { Botao, Cartao, Etiqueta, TituloSecao } from "@/components/ui";
import { PAPEL, type Papel } from "@/lib/tipos";

export type ConviteNaLista = {
  id: string;
  token: string;
  papel: Papel;
  expiraEm: string; // ISO
  usos: number;
  maxUsos: number | null;
  revogado: boolean;
};

function Copiar({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        } catch {
          // Alguns navegadores bloqueiam a área de transferência; o link
          // continua visível para copiar à mão.
          setCopiado(false);
        }
      }}
      className="shrink-0 text-xs text-[var(--color-muted)] underline underline-offset-4 transition hover:text-[var(--color-foreground)]"
    >
      {copiado ? "copiado" : "copiar"}
    </button>
  );
}

export function Convites({
  convites,
  base,
  gerar,
  revogar,
}: {
  convites: ConviteNaLista[];
  /** Origem do site, para montar o link completo. */
  base: string;
  gerar?: (form: FormData) => void | Promise<void>;
  revogar?: (form: FormData) => void | Promise<void>;
}) {
  const ativos = convites.filter(
    (c) =>
      !c.revogado &&
      new Date(c.expiraEm) > new Date() &&
      (c.maxUsos === null || c.usos < c.maxUsos),
  );

  return (
    <section className="mb-10">
      <TituloSecao>Cadastro por link</TituloSecao>

      <Cartao className="mb-3 p-5">
        <p className="mb-4 text-sm text-[var(--color-muted)]">
          Gere um link e mande pela pessoa preencher o próprio cadastro. Ela
          escolhe a senha e já entra no sistema.
        </p>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["student", "Aluno"],
              ["teacher", "Professor"],
            ] as const
          ).map(([papel, rotulo]) => (
            <form key={papel} action={gerar} className="contents">
              <input type="hidden" name="papel" value={papel} />
              <input type="hidden" name="dias" value="7" />
              <input type="hidden" name="uso_unico" value="0" />
              <Botao type="submit" variante="fantasma" disabled={!gerar}>
                Link de {rotulo.toLowerCase()}
              </Botao>
            </form>
          ))}
        </div>

        <p className="mt-3 text-xs text-[var(--color-muted)]">
          Vale 7 dias e serve para quantas pessoas você mandar. Cancele quando
          terminar de usar.
        </p>
      </Cartao>

      {ativos.length ? (
        <div className="flex flex-col gap-2">
          {ativos.map((c) => {
            const url = `${base}/convite/${c.token}`;
            const dias = Math.max(
              0,
              Math.ceil(
                (new Date(c.expiraEm).getTime() - Date.now()) / 864e5,
              ),
            );

            return (
              <Cartao
                key={c.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3"
              >
                <Etiqueta>{PAPEL[c.papel]}</Etiqueta>

                <code className="min-w-40 flex-1 truncate font-mono text-xs text-[var(--color-muted)]">
                  {url}
                </code>

                <Copiar url={url} />

                <span className="text-xs text-[var(--color-muted)]">
                  {c.usos} {c.usos === 1 ? "cadastro" : "cadastros"} · vence em{" "}
                  {dias} {dias === 1 ? "dia" : "dias"}
                </span>

                <form action={revogar}>
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    disabled={!revogar}
                    className="text-xs text-[var(--color-muted)] underline underline-offset-4 transition hover:text-[var(--color-danger)] disabled:opacity-50"
                  >
                    cancelar
                  </button>
                </form>
              </Cartao>
            );
          })}
        </div>
      ) : (
        <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-strong)] px-4 py-5 text-center text-xs text-[var(--color-muted)]">
          Nenhum link ativo.
        </p>
      )}
    </section>
  );
}
