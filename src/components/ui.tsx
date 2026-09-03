import type { ComponentProps, ReactNode } from "react";

/* =============================================================================
   Primitivos ATMA. Toda cor sai dos tokens de globals.css — nunca hex solto.
   Letra é sempre marrom ou papel (regra 1 da marca).
   ============================================================================= */

export function Cartao({
  children,
  className = "",
  ...rest
}: ComponentProps<"div">) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function TituloSecao({
  children,
  acao,
}: {
  children: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2 className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
        {children}
      </h2>
      {acao}
    </div>
  );
}

type VarianteBotao = "primario" | "secundario" | "fantasma" | "acento";

const ESTILO_BOTAO: Record<VarianteBotao, string> = {
  // marrom sobre papel = 12,2:1
  primario:
    "bg-[var(--color-marrom)] text-[var(--color-on-marrom)] hover:opacity-90",
  // palha com letra marrom = 8,5:1
  secundario:
    "bg-[var(--color-palha)] text-[var(--color-on-palha)] hover:brightness-97",
  fantasma:
    "border border-[var(--color-border-strong)] text-[var(--color-foreground)] hover:bg-[var(--color-surface-sunken)]",
  // azul ganesha, acento raro = 4,8:1
  acento: "bg-[var(--color-azul)] text-[var(--color-on-azul)] hover:opacity-90",
};

export function Botao({
  variante = "primario",
  className = "",
  ...rest
}: ComponentProps<"button"> & { variante?: VarianteBotao }) {
  return (
    <button
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-55 ${ESTILO_BOTAO[variante]} ${className}`}
      {...rest}
    />
  );
}

export function Campo({
  rotulo,
  className = "",
  classeExterna = "",
  ...rest
}: ComponentProps<"input"> & {
  rotulo: string;
  /** Vai no <label>, que é o item do grid — use para col-span. */
  classeExterna?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${classeExterna}`}>
      <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
        {rotulo}
      </span>
      <input
        className={`h-10 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-subtle)] ${className}`}
        {...rest}
      />
    </label>
  );
}

export function AreaDeTexto({
  rotulo,
  dica,
  className = "",
  classeExterna = "",
  ...rest
}: ComponentProps<"textarea"> & {
  rotulo: string;
  dica?: string;
  /** Vai no <label>, que é o item do grid — use para col-span. */
  classeExterna?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${classeExterna}`}>
      <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
        {rotulo}
      </span>
      <textarea
        className={`min-h-20 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm leading-relaxed text-[var(--color-foreground)] placeholder:text-[var(--color-subtle)] ${className}`}
        {...rest}
      />
      {dica ? (
        <span className="text-xs text-[var(--color-muted)]">{dica}</span>
      ) : null}
    </label>
  );
}

/** Separador de seção dentro de um formulário longo. */
export function Divisao({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2 flex items-center gap-3 sm:col-span-2">
      <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
        {children}
      </span>
      <span className="h-px flex-1 bg-[var(--color-border)]" />
    </div>
  );
}

/** Etiqueta de status. `fundo` e `letra` vêm de tipos.ts, dentro da paleta. */
export function Etiqueta({
  children,
  fundo = "var(--color-palha)",
  letra = "var(--color-on-palha)",
}: {
  children: ReactNode;
  fundo?: string;
  letra?: string;
}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: fundo, color: letra }}
    >
      {children}
    </span>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-strong)] px-4 py-8 text-center text-sm text-[var(--color-muted)]">
      {children}
    </p>
  );
}

export function Numero({
  valor,
  rotulo,
  detalhe,
}: {
  valor: ReactNode;
  rotulo: string;
  detalhe?: string;
}) {
  return (
    <Cartao className="p-5">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
        {rotulo}
      </p>
      <p className="mt-2 text-3xl font-light tabular-nums">{valor}</p>
      {detalhe ? (
        <p className="mt-1 text-xs text-[var(--color-muted)]">{detalhe}</p>
      ) : null}
    </Cartao>
  );
}

export const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export const dataHora = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));

export const hora = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
