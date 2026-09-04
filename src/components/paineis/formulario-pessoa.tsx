"use client";

import { useActionState, useRef, useState } from "react";

import { Caixas } from "@/components/paineis/caixas";
import { AreaDeTexto, Botao, Campo, Cartao, Divisao } from "@/components/ui";
import type { EstadoCadastro } from "@/app/admin/pessoas/actions";
import {
  CONDICOES_DE_SAUDE,
  SENHA_PADRAO,
  TECNICAS,
  buscarCep,
  cpfValido,
  formatarCep,
  formatarCpf,
  soDigitos,
} from "@/lib/ficha";
import type { Papel } from "@/lib/tipos";

type Acao = (
  anterior: EstadoCadastro,
  form: FormData,
) => Promise<EstadoCadastro>;

/** O formulário é um grid de duas colunas; isto ocupa a linha inteira. */
const LINHA = "sm:col-span-2";

/** Campos que vêm do CEP — número e complemento são digitados à mão. */
const CAMPOS_DO_CEP = ["logradouro", "bairro", "cidade", "uf"] as const;

function limparCamposDoCep(form: HTMLFormElement) {
  for (const campo of CAMPOS_DO_CEP) {
    const el = form.elements.namedItem(campo) as HTMLInputElement | null;
    if (el) el.value = "";
  }
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
  const [cpf, setCpf] = useState("");
  const [cep, setCep] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroCep, setErroCep] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);

  const [estado, enviar, pendente] = useActionState<EstadoCadastro, FormData>(
    acao ?? (async () => ({ erro: "Ação indisponível." })),
    undefined,
  );

  const cpfIncompleto = soDigitos(cpf).length > 0 && soDigitos(cpf).length < 11;
  const cpfErrado = soDigitos(cpf).length === 11 && !cpfValido(cpf);

  /** Preenche logradouro, bairro, cidade e UF a partir do CEP. */
  async function completarPeloCep(valor: string) {
    if (soDigitos(valor).length !== 8) return;

    setBuscandoCep(true);
    setErroCep(null);

    const achado = await buscarCep(valor);
    setBuscandoCep(false);

    const form = formRef.current;
    if (!form) return;

    if (!achado) {
      // Limpa o que veio do CEP anterior: manter ali um endereço de outro
      // lugar é pior que deixar em branco, porque seria salvo sem ninguém
      // reparar.
      limparCamposDoCep(form);
      setErroCep("CEP não encontrado. Preencha à mão.");
      return;
    }

    // Sobrescreve sempre. A tentação é preservar o que já foi digitado, mas
    // aí trocar o CEP não muda o endereço: o campo antigo continua ali e a
    // pessoa vê a rua errada. Quem mudou o CEP quer o endereço novo.
    // Número e complemento não vêm do CEP e ficam intactos.
    const preencher = (campo: string, valor: string) => {
      const el = form.elements.namedItem(campo) as HTMLInputElement | null;
      if (el) el.value = valor;
    };

    preencher("logradouro", achado.logradouro);
    preencher("bairro", achado.bairro);
    preencher("cidade", achado.cidade);
    preencher("uf", achado.uf);
  }

  return (
    <Cartao className="p-6">
      <form
        ref={formRef}
        action={demo ? undefined : enviar}
        onSubmit={demo ? (e) => e.preventDefault() : undefined}
        className="grid gap-x-4 gap-y-5 sm:grid-cols-2"
      >
        <input type="hidden" name="papel" value={papel} />

        <fieldset className={`flex flex-col gap-2 ${LINHA}`}>
          <legend className="mb-2 text-xs uppercase tracking-[0.1em] text-[var(--color-muted)]">
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
                // temas. Marrom sumiria contra o cartão no modo escuro.
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
        <Campo
          rotulo="Nome social (como prefere ser chamado)"
          name="nome_social"
          autoComplete="off"
          placeholder="opcional"
          classeExterna={LINHA}
        />

        <Campo rotulo="E-mail" name="email" type="email" required autoComplete="off" />
        <Campo
          rotulo="WhatsApp"
          name="telefone"
          autoComplete="off"
          placeholder="(22) 99999-0000"
        />

        <div className="flex flex-col gap-1.5">
          <Campo
            rotulo="CPF"
            name="cpf"
            value={cpf}
            onChange={(e) => setCpf(formatarCpf(e.target.value))}
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            aria-invalid={cpfErrado}
          />
          {cpfErrado ? (
            <p className="text-xs text-[var(--color-danger)]">
              CPF inválido — confira os números.
            </p>
          ) : (
            <p className="text-xs text-[var(--color-muted)]">
              {papel === "student"
                ? "Serve de login, junto com o e-mail."
                : "Opcional."}
            </p>
          )}
        </div>

        <Divisao>Endereço</Divisao>

        <div className="flex flex-col gap-1.5">
          <Campo
            rotulo="CEP"
            name="cep"
            value={cep}
            onChange={(e) => {
              const v = formatarCep(e.target.value);
              setCep(v);
              setErroCep(null);
              if (soDigitos(v).length === 8) void completarPeloCep(v);
            }}
            onBlur={(e) => void completarPeloCep(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            placeholder="28950-700"
          />
          {buscandoCep ? (
            <p className="text-xs text-[var(--color-muted)]">buscando…</p>
          ) : erroCep ? (
            <p className="text-xs text-[var(--color-danger)]">{erroCep}</p>
          ) : (
            <p className="text-xs text-[var(--color-muted)]">
              Preenche o resto sozinho.
            </p>
          )}
        </div>
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

        {papel === "teacher" ? (
          <>
            <Divisao>Técnicas</Divisao>
            <div className={LINHA}>
              <Caixas name="tecnicas" opcoes={TECNICAS} colunas={3} />
            </div>
          </>
        ) : null}

        <Divisao>Saúde</Divisao>

        <div className={LINHA}>
          <Caixas name="saude" opcoes={CONDICOES_DE_SAUDE} colunas={2} />
        </div>

        <AreaDeTexto
          rotulo="Observações"
          name="observacoes_saude"
          rows={3}
          classeExterna={LINHA}
          placeholder="Cirurgias, medicação contínua, limites de movimento…"
          dica={
            papel === "student"
              ? "O professor da aula também vê, para adaptar as posturas."
              : "Restrições que afetem o que o professor demonstra em aula."
          }
        />

        <Divisao>Acesso</Divisao>

        <div className={`flex flex-col gap-1.5 ${LINHA}`}>
          <Campo
            rotulo="Senha inicial"
            name="senha"
            defaultValue={SENHA_PADRAO}
            required
            minLength={6}
            autoComplete="off"
            className="font-mono"
          />
          <p className="text-xs text-[var(--color-muted)]">
            Senha padrão do estúdio. A pessoa entra com ela e troca quando
            quiser, no próprio perfil.
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

        <Botao
          type="submit"
          disabled={pendente || demo || cpfErrado || cpfIncompleto}
          className={LINHA}
        >
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
