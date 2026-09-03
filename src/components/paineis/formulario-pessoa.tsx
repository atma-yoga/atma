"use client";

import { useActionState, useState } from "react";

import { Botao, Campo, Cartao } from "@/components/ui";
import type { EstadoCadastro } from "@/app/admin/pessoas/actions";
import type { Papel } from "@/lib/tipos";

type Acao = (
  anterior: EstadoCadastro,
  form: FormData,
) => Promise<EstadoCadastro>;

/** Sugere uma senha legível de dizer em voz alta na recepção. */
function sugerirSenha() {
  const palavras = [
    "lotus", "prana", "asana", "mantra", "chakra",
    "sereno", "raiz", "monte", "rio", "manha",
  ];
  const p = () => palavras[Math.floor(Math.random() * palavras.length)];
  const n = Math.floor(Math.random() * 90 + 10);
  return `${p()}-${p()}-${n}`;
}

export function FormularioPessoa({
  acao,
  demo = false,
}: {
  acao?: Acao;
  demo?: boolean;
}) {
  const [papel, setPapel] = useState<Extract<Papel, "teacher" | "student">>(
    "student",
  );
  const [senha, setSenha] = useState(sugerirSenha);

  const [estado, enviar, pendente] = useActionState<EstadoCadastro, FormData>(
    acao ?? (async () => ({ erro: "Ação indisponível." })),
    undefined,
  );

  return (
    <Cartao className="p-6">
      <form
        action={demo ? undefined : enviar}
        onSubmit={demo ? (e) => e.preventDefault() : undefined}
        className="flex flex-col gap-5"
      >
        <input type="hidden" name="papel" value={papel} />

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[11px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
            Cadastrar como
          </legend>
          <div className="flex gap-2">
            {(
              [
                ["student", "Aluno"],
                ["teacher", "Professor"],
              ] as const
            ).map(([valor, rotulo]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setPapel(valor)}
                aria-pressed={papel === valor}
                className={`h-9 rounded-[var(--radius-md)] px-4 text-sm transition ${
                  papel === valor
                    ? "bg-[var(--color-marrom)] text-[var(--color-on-marrom)]"
                    : "border border-[var(--color-border-strong)] text-[var(--color-foreground)]"
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </fieldset>

        <Campo rotulo="Nome completo" name="nome" required autoComplete="off" />
        <Campo rotulo="E-mail" name="email" type="email" required autoComplete="off" />
        <Campo rotulo="Telefone" name="telefone" autoComplete="off" placeholder="(22) 99999-0000" />

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
            Senha temporária
          </span>
          <div className="flex gap-2">
            <input
              name="senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              minLength={8}
              autoComplete="off"
              className="h-10 flex-1 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 font-mono text-sm text-[var(--color-foreground)]"
            />
            <Botao
              type="button"
              variante="fantasma"
              onClick={() => setSenha(sugerirSenha())}
            >
              Sortear
            </Botao>
          </div>
          <p className="text-xs text-[var(--color-muted)]">
            Anote e entregue pessoalmente. A pessoa troca no primeiro acesso.
          </p>
        </div>

        {estado && "erro" in estado ? (
          <p role="alert" className="text-sm text-[var(--color-danger)]">
            {estado.erro}
          </p>
        ) : null}

        {estado && "sucesso" in estado ? (
          <p role="status" className="text-sm text-[var(--color-success)]">
            {estado.sucesso}
          </p>
        ) : null}

        <Botao type="submit" disabled={pendente || demo}>
          {pendente ? "Cadastrando…" : "Cadastrar"}
        </Botao>

        {demo ? (
          <p className="text-center text-xs text-[var(--color-muted)]">
            Maquete — o cadastro não é enviado.
          </p>
        ) : null}
      </form>
    </Cartao>
  );
}
