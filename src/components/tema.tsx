"use client";

import { useEffect, useState } from "react";

type Tema = "claro" | "escuro";

/**
 * Qual tema está valendo agora.
 *
 * Pode vir de uma escolha guardada — que o script do `layout` já aplicou no
 * `<html>` antes da página pintar — ou, se ninguém escolheu nada, do que o
 * aparelho pede.
 */
function temaAtual(): Tema {
  const marcado = document.documentElement.dataset.theme;
  if (marcado === "light") return "claro";
  if (marcado === "dark") return "escuro";

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "escuro"
    : "claro";
}

/**
 * Troca entre o claro e o escuro.
 *
 * A marca manda nos dois: papel com letra marrom, ou marrom com letra papel.
 * Nunca preto — e a assinatura troca de versão junto, pelo CSS.
 *
 * A escolha fica no navegador de quem clicou, não no cadastro: é preferência
 * daquele aparelho, e o estúdio usa o mesmo login no celular da recepção e no
 * computador da sala.
 */
export function BotaoDeTema({ className = "" }: { className?: string }) {
  // Nulo até montar: no servidor não há como saber o que o aparelho pede, e
  // chutar aqui faria o ícone piscar errado no primeiro quadro.
  const [tema, setTema] = useState<Tema | null>(null);

  useEffect(() => setTema(temaAtual()), []);

  function trocar() {
    const novo: Tema = (tema ?? temaAtual()) === "escuro" ? "claro" : "escuro";

    document.documentElement.dataset.theme =
      novo === "escuro" ? "dark" : "light";

    try {
      localStorage.setItem("tema", novo);
    } catch {
      // Navegador anônimo ou armazenamento bloqueado: vale só desta vez.
    }

    setTema(novo);
  }

  const vaiPara = tema === "escuro" ? "claro" : "escuro";

  return (
    <button
      type="button"
      onClick={trocar}
      title={tema ? `Mudar para o tema ${vaiPara}` : "Mudar o tema"}
      aria-label={tema ? `Mudar para o tema ${vaiPara}` : "Mudar o tema"}
      className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-muted)] transition hover:text-[var(--color-foreground)] ${className}`}
    >
      {tema === "escuro" ? (
        // Sol: clicando, clareia.
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
        </svg>
      ) : (
        // Lua: clicando, escurece.
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.2 8.2 0 1 0 10.2 10.2Z" />
        </svg>
      )}
    </button>
  );
}
