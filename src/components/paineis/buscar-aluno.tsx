"use client";

import { useMemo, useState } from "react";

import { Botao, Cartao } from "@/components/ui";
import { formatarCpf, soDigitos } from "@/lib/ficha";

export type AlunoBuscavel = {
  id: string;
  nome: string;
  email: string | null;
  cpf: string | null; // só dígitos
};

/**
 * Busca por nome, e-mail ou CPF antes de colocar o aluno na turma.
 *
 * A filtragem é local: a lista de alunos de um estúdio cabe folgada na
 * memória, e assim a busca responde a cada tecla sem ida ao servidor. Se um
 * dia forem milhares, isto vira consulta no banco.
 */
export function BuscarAluno({
  alunos,
  turmaId,
  matricular,
}: {
  alunos: AlunoBuscavel[];
  turmaId: string;
  matricular?: (form: FormData) => void | Promise<void>;
}) {
  const [busca, setBusca] = useState("");

  const achados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return alunos.slice(0, 8);

    const digitos = soDigitos(termo);

    return alunos
      .filter((a) => {
        if (a.nome.toLowerCase().includes(termo)) return true;
        if (a.email?.toLowerCase().includes(termo)) return true;
        if (digitos && a.cpf?.includes(digitos)) return true;
        return false;
      })
      .slice(0, 8);
  }, [busca, alunos]);

  return (
    <Cartao className="p-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-[0.1em] text-[var(--color-muted)]">
          Procurar aluno
        </span>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="nome, e-mail ou CPF"
          autoComplete="off"
          className="h-10 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-subtle)]"
        />
      </label>

      <div className="mt-4 flex flex-col gap-2">
        {achados.map((a) => (
          <form
            key={a.id}
            action={matricular}
            className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] pt-3 first:border-0 first:pt-0"
          >
            <input type="hidden" name="turma" value={turmaId} />
            <input type="hidden" name="aluno" value={a.id} />

            <span className="min-w-36 flex-1">
              <span className="block text-sm">{a.nome}</span>
              <span className="block text-xs text-[var(--color-muted)]">
                {a.email ?? "sem e-mail"}
                {a.cpf ? ` · ${formatarCpf(a.cpf)}` : ""}
              </span>
            </span>

            <Botao type="submit" variante="fantasma" disabled={!matricular}>
              Colocar
            </Botao>
          </form>
        ))}

        {!achados.length ? (
          <p className="py-4 text-center text-xs text-[var(--color-muted)]">
            {busca.trim()
              ? "Ninguém encontrado. Confira o CPF ou cadastre a pessoa em Pessoas."
              : "Nenhum aluno disponível para esta turma."}
          </p>
        ) : null}

        {!busca.trim() && alunos.length > 8 ? (
          <p className="pt-2 text-center text-xs text-[var(--color-subtle)]">
            mostrando 8 de {alunos.length} — digite para filtrar
          </p>
        ) : null}
      </div>
    </Cartao>
  );
}
