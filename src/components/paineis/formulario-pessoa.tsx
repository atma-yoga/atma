"use client";

import { useActionState, useState } from "react";

import { AreaDeTexto, Botao, Campo, Cartao, Divisao } from "@/components/ui";
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

/** O formulário é um grid de duas colunas; isto ocupa a linha inteira. */
const LINHA = "sm:col-span-2";

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
        className="grid gap-x-4 gap-y-5 sm:grid-cols-2"
      >
        <input type="hidden" name="papel" value={papel} />

        <fieldset className={`flex flex-col gap-2 ${LINHA}`}>
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
                // Palha como marca de seleção: é fundo legítimo nos dois
                // temas. Marrom sumiria contra o cartão no modo escuro, e a
                // opção não selecionada pareceria a escolhida.
                className={`h-9 rounded-[var(--radius-md)] px-4 text-sm transition ${
                  papel === valor
                    ? "bg-[var(--color-palha)] font-medium text-[var(--color-on-palha)]"
                    : "border border-[var(--color-border-strong)] text-[var(--color-muted)]"
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </fieldset>

        <Campo
          rotulo="Nome completo"
          name="nome"
          required
          autoComplete="off"
          classeExterna={LINHA}
        />
        <Campo rotulo="E-mail" name="email" type="email" required autoComplete="off" />
        <Campo
          rotulo="Telefone"
          name="telefone"
          autoComplete="off"
          placeholder="(22) 99999-0000"
        />

        <div className={`flex flex-col gap-1.5 ${LINHA}`}>
          <Campo
            rotulo="Nome de usuário (opcional)"
            name="usuario"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            pattern="[a-zA-Z0-9._-]{3,30}"
            placeholder="crisatma"
          />
          <p className="text-xs text-[var(--color-muted)]">
            Atalho para entrar sem digitar o e-mail. Sem espaços nem acentos.
          </p>
        </div>

        <Divisao>Endereço</Divisao>

        <Campo rotulo="CEP" name="cep" autoComplete="off" placeholder="28900-000" />
        <Campo rotulo="Número" name="numero" autoComplete="off" />
        <Campo
          rotulo="Logradouro"
          name="logradouro"
          autoComplete="off"
          classeExterna={LINHA}
        />
        <Campo rotulo="Complemento" name="complemento" autoComplete="off" />
        <Campo rotulo="Bairro" name="bairro" autoComplete="off" />
        <Campo rotulo="Cidade" name="cidade" autoComplete="off" />
        <Campo
          rotulo="UF"
          name="uf"
          autoComplete="off"
          maxLength={2}
          className="uppercase"
        />

        <Divisao>Saúde</Divisao>

        <AreaDeTexto
          rotulo="Observações de saúde"
          name="saude"
          rows={3}
          classeExterna={LINHA}
          placeholder="Lesões, cirurgias, gravidez, pressão, restrições de movimento…"
          dica={
            papel === "student"
              ? "O professor da aula também vê, para adaptar as posturas."
              : "Restrições que afetem o que o professor demonstra em aula."
          }
        />

        <Divisao>Acesso</Divisao>

        <div className={`flex flex-col gap-1.5 ${LINHA}`}>
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
          <p role="alert" className={`text-sm text-[var(--color-danger)] ${LINHA}`}>
            {estado.erro}
          </p>
        ) : null}

        {estado && "sucesso" in estado ? (
          <p role="status" className={`text-sm text-[var(--color-success)] ${LINHA}`}>
            {estado.sucesso}
          </p>
        ) : null}

        <Botao type="submit" disabled={pendente || demo} className={LINHA}>
          {pendente ? "Cadastrando…" : "Cadastrar"}
        </Botao>

        {demo ? (
          <p className={`text-center text-xs text-[var(--color-muted)] ${LINHA}`}>
            Maquete — o cadastro não é enviado.
          </p>
        ) : null}
      </form>
    </Cartao>
  );
}
