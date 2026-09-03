import Link from "next/link";
import type { ReactNode } from "react";

import { MarcaHorizontal } from "@/components/marca";
import { sair } from "@/app/entrar/actions";
import { PAPEL, type Papel } from "@/lib/tipos";

const NAV: Record<Papel, { href: string; texto: string }[]> = {
  admin: [
    { href: "/admin", texto: "Visão geral" },
    { href: "/admin/grade", texto: "Grade semanal" },
    { href: "/admin/pessoas", texto: "Pessoas" },
    { href: "/admin/financeiro", texto: "Financeiro" },
  ],
  teacher: [
    { href: "/professor", texto: "Hoje" },
    { href: "/professor/turmas", texto: "Minhas turmas" },
  ],
  student: [
    { href: "/aluno", texto: "Início" },
    { href: "/aluno/agenda", texto: "Agenda" },
    { href: "/aluno/plano", texto: "Meu plano" },
  ],
};

export function Shell({
  papel,
  nome,
  children,
}: {
  papel: Papel;
  nome: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
          <Link href="/" aria-label="ATMA yoga estúdio">
            <MarcaHorizontal />
          </Link>

          <nav className="hidden gap-6 md:flex">
            {NAV[papel].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-[var(--color-muted)] transition hover:text-[var(--color-foreground)]"
              >
                {item.texto}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <span className="hidden text-right sm:block">
              <span className="block text-sm leading-tight">{nome}</span>
              <span className="block text-[10px] uppercase tracking-[0.16em] text-[var(--color-subtle)]">
                {PAPEL[papel]}
              </span>
            </span>
            <form action={sair}>
              <button
                type="submit"
                className="text-xs text-[var(--color-muted)] underline underline-offset-4 transition hover:text-[var(--color-foreground)]"
              >
                Sair
              </button>
            </form>
          </div>
        </div>

        {/* filete mel — regra 3 da paleta */}
        <div className="h-px bg-[var(--color-rule)] opacity-60" />
      </header>

      {/* nav em telas pequenas */}
      <nav className="flex gap-5 overflow-x-auto border-b border-[var(--color-border)] px-6 py-3 md:hidden">
        {NAV[papel].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap text-sm text-[var(--color-muted)]"
          >
            {item.texto}
          </Link>
        ))}
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
