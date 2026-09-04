"use client";

import { useState } from "react";

import { SENHA_PADRAO } from "@/lib/ficha";

/**
 * Devolve a senha da pessoa à padrão do estúdio.
 *
 * Pede confirmação porque a senha atual deixa de valer na hora: se a adm
 * clicar sem querer, a pessoa é derrubada do sistema sem entender por quê.
 * A confirmação mostra qual senha vai valer, para a adm poder ditá-la ali
 * mesmo, com a pessoa do outro lado do balcão ou do telefone.
 */
export function ResetarSenha({
  id,
  nome,
  acao,
  className = "",
}: {
  id: string;
  nome: string;
  acao?: (form: FormData) => void | Promise<void>;
  className?: string;
}) {
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        disabled={!acao}
        className={`text-xs text-[var(--color-muted)] underline underline-offset-4 transition hover:text-[var(--color-foreground)] disabled:opacity-50 ${className}`}
      >
        resetar senha
      </button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-[var(--color-muted)]">
        Nova senha de {nome.split(" ")[0]}:{" "}
        <code className="font-mono text-[var(--color-foreground)]">
          {SENHA_PADRAO}
        </code>
        ?
      </span>

      <form action={acao}>
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          onClick={() => setConfirmando(false)}
          className="h-8 rounded-[var(--radius-md)] bg-[var(--color-marrom)] px-3 text-xs font-medium text-[var(--color-on-marrom)]"
        >
          Resetar
        </button>
      </form>

      <button
        type="button"
        onClick={() => setConfirmando(false)}
        className="text-xs text-[var(--color-muted)] underline underline-offset-4"
      >
        cancelar
      </button>
    </span>
  );
}
