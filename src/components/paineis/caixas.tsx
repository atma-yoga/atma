"use client";

import type { Opcao } from "@/lib/ficha";

/**
 * Grupo de caixas de marcar. Todas usam o mesmo `name`, então o FormData
 * devolve um array com os valores marcados via `getAll(name)`.
 */
export function Caixas({
  name,
  opcoes,
  marcados = [],
  colunas = 2,
}: {
  name: string;
  opcoes: Opcao[];
  marcados?: string[];
  colunas?: 1 | 2 | 3;
}) {
  const grade =
    colunas === 3
      ? "sm:grid-cols-3"
      : colunas === 2
        ? "sm:grid-cols-2"
        : "grid-cols-1";

  return (
    <div className={`grid gap-x-4 gap-y-2 ${grade}`}>
      {opcoes.map((o) => (
        <label
          key={o.valor}
          className="flex cursor-pointer items-start gap-2 text-sm"
        >
          <input
            type="checkbox"
            name={name}
            value={o.valor}
            defaultChecked={marcados.includes(o.valor)}
            className="mt-0.5 size-4 shrink-0 accent-[var(--color-verde)]"
          />
          <span>
            {o.rotulo}
            {o.nota ? (
              <span className="block text-xs text-[var(--color-muted)]">
                {o.nota}
              </span>
            ) : null}
          </span>
        </label>
      ))}
    </div>
  );
}
