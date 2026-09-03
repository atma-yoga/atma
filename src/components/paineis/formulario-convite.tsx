"use client";

import { useActionState, useRef, useState } from "react";

import { Caixas } from "@/components/paineis/caixas";
import { AreaDeTexto, Botao, Campo, Cartao, Divisao } from "@/components/ui";
import type { EstadoConvite } from "@/app/convite/[token]/actions";
import {
  CONDICOES_DE_SAUDE,
  TECNICAS,
  buscarCep,
  cpfValido,
  formatarCep,
  formatarCpf,
  soDigitos,
} from "@/lib/ficha";
import type { Papel } from "@/lib/tipos";

type Acao = (
  anterior: EstadoConvite,
  form: FormData,
) => Promise<EstadoConvite>;

const LINHA = "sm:col-span-2";
const CAMPOS_DO_CEP = ["logradouro", "bairro", "cidade", "uf"] as const;

export function FormularioConvite({
  token,
  papel,
  acao,
}: {
  token: string;
  papel: Papel;
  acao: Acao;
}) {
  const [cpf, setCpf] = useState("");
  const [cep, setCep] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroCep, setErroCep] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);

  const [estado, enviar, pendente] = useActionState<EstadoConvite, FormData>(
    acao,
    undefined,
  );

  const cpfIncompleto = soDigitos(cpf).length > 0 && soDigitos(cpf).length < 11;
  const cpfErrado = soDigitos(cpf).length === 11 && !cpfValido(cpf);

  async function completarPeloCep(valor: string) {
    if (soDigitos(valor).length !== 8) return;

    setBuscandoCep(true);
    setErroCep(null);

    const achado = await buscarCep(valor);
    setBuscandoCep(false);

    const form = formRef.current;
    if (!form) return;

    const escrever = (campo: string, valor: string) => {
      const el = form.elements.namedItem(campo) as HTMLInputElement | null;
      if (el) el.value = valor;
    };

    if (!achado) {
      for (const campo of CAMPOS_DO_CEP) escrever(campo, "");
      setErroCep("CEP não encontrado. Preencha à mão.");
      return;
    }

    escrever("logradouro", achado.logradouro);
    escrever("bairro", achado.bairro);
    escrever("cidade", achado.cidade);
    escrever("uf", achado.uf);
  }

  return (
    <Cartao className="p-6 sm:p-8">
      <form
        ref={formRef}
        action={enviar}
        className="grid gap-x-4 gap-y-5 sm:grid-cols-2"
      >
        <input type="hidden" name="token" value={token} />

        <Campo
          rotulo="Nome completo"
          name="nome"
          required
          autoComplete="name"
          classeExterna={LINHA}
        />
        <Campo
          rotulo="Como prefere ser chamado"
          name="nome_social"
          autoComplete="nickname"
          placeholder="opcional"
          classeExterna={LINHA}
        />

        <Campo rotulo="E-mail" name="email" type="email" required autoComplete="email" />
        <Campo
          rotulo="WhatsApp"
          name="telefone"
          autoComplete="tel"
          placeholder="(22) 99999-0000"
        />

        <div className={`flex flex-col gap-1.5 ${LINHA}`}>
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
              Você poderá entrar com o CPF ou com o e-mail.
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
            autoComplete="postal-code"
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
          autoComplete="street-address"
          classeExterna={LINHA}
        />
        <Campo rotulo="Complemento" name="complemento" autoComplete="off" />
        <Campo rotulo="Bairro" name="bairro" autoComplete="off" />
        <Campo rotulo="Cidade" name="cidade" autoComplete="address-level2" />
        <Campo
          rotulo="UF"
          name="uf"
          autoComplete="address-level1"
          maxLength={2}
          className="uppercase"
        />

        {papel === "teacher" ? (
          <>
            <Divisao>Suas técnicas</Divisao>
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
          dica="O professor da sua aula também vê, para adaptar as posturas."
        />

        <Divisao>Sua senha</Divisao>

        <Campo
          rotulo="Senha"
          name="senha"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="ao menos 6 caracteres"
        />
        <Campo
          rotulo="Repita a senha"
          name="senha_confirma"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
        />

        {estado?.erro ? (
          <p role="alert" className={`text-sm text-[var(--color-danger)] ${LINHA}`}>
            {estado.erro}
          </p>
        ) : null}

        <Botao
          type="submit"
          disabled={pendente || cpfErrado || cpfIncompleto}
          className={LINHA}
        >
          {pendente ? "Enviando…" : "Concluir cadastro"}
        </Botao>
      </form>
    </Cartao>
  );
}
