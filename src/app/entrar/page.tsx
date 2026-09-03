"use client";

import { use, useActionState } from "react";

import { Assinatura } from "@/components/marca";
import { Botao, Campo, Cartao } from "@/components/ui";
import { entrar, type EstadoForm } from "./actions";

export default function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string }>;
}) {
  const { proximo } = use(searchParams);
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(
    entrar,
    undefined,
  );

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex justify-center">
          <Assinatura largura={130} />
        </div>

        <Cartao className="p-7">
          <form action={acao} className="flex flex-col gap-5">
            <input type="hidden" name="proximo" value={proximo ?? "/"} />

            <Campo
              rotulo="Usuário ou e-mail"
              name="identificador"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              autoFocus
              placeholder="crisatma"
            />
            <Campo
              rotulo="Senha"
              name="senha"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
            />

            {estado?.erro ? (
              <p role="alert" className="text-sm text-[var(--color-danger)]">
                {estado.erro}
              </p>
            ) : null}

            <Botao type="submit" disabled={pendente}>
              {pendente ? "Entrando…" : "Entrar"}
            </Botao>
          </form>
        </Cartao>

        <p className="mt-6 text-center text-xs text-[var(--color-muted)]">
          Ainda não tem acesso? Fale com a recepção do estúdio.
        </p>
      </div>
    </main>
  );
}
