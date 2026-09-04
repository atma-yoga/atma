"use client";

import { useActionState, useRef, useState } from "react";

import { Caixas } from "@/components/paineis/caixas";
import { AreaDeTexto, Botao, Campo, Cartao, Divisao } from "@/components/ui";
import type { EstadoFicha } from "@/app/admin/alunos/[id]/actions";
import {
  CONDICOES_DE_SAUDE,
  buscarCep,
  cpfValido,
  formatarCep,
  formatarCpf,
  soDigitos,
} from "@/lib/ficha";

type Salvar = (anterior: EstadoFicha, form: FormData) => Promise<EstadoFicha>;

export type FichaEditavel = {
  id: string;
  nome: string;
  nomeSocial: string;
  email: string;
  telefone: string;
  cpf: string;
  endereco: Record<string, string>;
  condicoes: string[];
  observacoes: string;
};

const LINHA = "sm:col-span-2";
const CAMPOS_DO_CEP = ["logradouro", "bairro", "cidade", "uf"] as const;

export function FichaDoAluno({
  ficha,
  salvar,
  demo = false,
}: {
  ficha: FichaEditavel;
  salvar?: Salvar;
  demo?: boolean;
}) {
  const [cpf, setCpf] = useState(formatarCpf(ficha.cpf));
  const [cep, setCep] = useState(formatarCep(ficha.endereco.cep ?? ""));
  const [erroCep, setErroCep] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);

  const [estado, enviar, pendente] = useActionState<EstadoFicha, FormData>(
    salvar ?? (async () => ({ erro: "Ação indisponível." })),
    undefined,
  );

  const cpfErrado = soDigitos(cpf).length === 11 && !cpfValido(cpf);

  async function completarPeloCep(valor: string) {
    if (soDigitos(valor).length !== 8) return;
    setErroCep(null);

    const achado = await buscarCep(valor);
    const form = formRef.current;
    if (!form) return;

    const escrever = (campo: string, v: string) => {
      const el = form.elements.namedItem(campo) as HTMLInputElement | null;
      if (el) el.value = v;
    };

    if (!achado) {
      for (const c of CAMPOS_DO_CEP) escrever(c, "");
      setErroCep("CEP não encontrado. Preencha à mão.");
      return;
    }

    escrever("logradouro", achado.logradouro);
    escrever("bairro", achado.bairro);
    escrever("cidade", achado.cidade);
    escrever("uf", achado.uf);
  }

  return (
    <Cartao className="p-6">
      <form
        ref={formRef}
        action={demo ? undefined : enviar}
        onSubmit={demo ? (e) => e.preventDefault() : undefined}
        className="grid gap-x-4 gap-y-5 sm:grid-cols-2"
      >
        <input type="hidden" name="id" value={ficha.id} />

        <Campo
          rotulo="Nome completo"
          name="nome"
          defaultValue={ficha.nome}
          required
          autoComplete="off"
          classeExterna={LINHA}
        />
        <Campo
          rotulo="Nome social"
          name="nome_social"
          defaultValue={ficha.nomeSocial}
          autoComplete="off"
          placeholder="como prefere ser chamado"
          classeExterna={LINHA}
        />

        <Campo
          rotulo="E-mail"
          name="email"
          type="email"
          defaultValue={ficha.email}
          autoComplete="off"
        />
        <Campo
          rotulo="WhatsApp"
          name="telefone"
          defaultValue={ficha.telefone}
          autoComplete="off"
        />

        <div className={`flex flex-col gap-1.5 ${LINHA}`}>
          <Campo
            rotulo="CPF"
            name="cpf"
            value={cpf}
            onChange={(e) => setCpf(formatarCpf(e.target.value))}
            inputMode="numeric"
            autoComplete="off"
            aria-invalid={cpfErrado}
          />
          {cpfErrado ? (
            <p className="text-xs text-[var(--color-danger)]">
              CPF inválido — confira os números.
            </p>
          ) : (
            <p className="text-xs text-[var(--color-muted)]">
              O aluno entra com o CPF ou com o e-mail.
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
          />
          {erroCep ? (
            <p className="text-xs text-[var(--color-danger)]">{erroCep}</p>
          ) : null}
        </div>
        <Campo
          rotulo="Número"
          name="numero"
          defaultValue={ficha.endereco.numero ?? ""}
          autoComplete="off"
        />

        <Campo
          rotulo="Logradouro"
          name="logradouro"
          defaultValue={ficha.endereco.logradouro ?? ""}
          autoComplete="off"
          classeExterna={LINHA}
        />
        <Campo
          rotulo="Complemento"
          name="complemento"
          defaultValue={ficha.endereco.complemento ?? ""}
          autoComplete="off"
        />
        <Campo
          rotulo="Bairro"
          name="bairro"
          defaultValue={ficha.endereco.bairro ?? ""}
          autoComplete="off"
        />
        <Campo
          rotulo="Cidade"
          name="cidade"
          defaultValue={ficha.endereco.cidade ?? ""}
          autoComplete="off"
        />
        <Campo
          rotulo="UF"
          name="uf"
          defaultValue={ficha.endereco.uf ?? ""}
          maxLength={2}
          className="uppercase"
          autoComplete="off"
        />

        <Divisao>Saúde</Divisao>

        <div className={LINHA}>
          <Caixas
            name="saude"
            opcoes={CONDICOES_DE_SAUDE}
            marcados={ficha.condicoes}
            colunas={2}
          />
        </div>

        <AreaDeTexto
          rotulo="Observações"
          name="observacoes_saude"
          rows={3}
          defaultValue={ficha.observacoes}
          classeExterna={LINHA}
          dica="O professor da turma também vê isto."
        />

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
          disabled={pendente || demo || cpfErrado}
          className={LINHA}
        >
          {pendente ? "Salvando…" : "Salvar ficha"}
        </Botao>
      </form>
    </Cartao>
  );
}
