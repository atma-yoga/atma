"use client";

import { useActionState, useRef, useState } from "react";

import { AreaDeTexto, Botao, Campo, Cartao, Divisao } from "@/components/ui";
import type { EstadoLocal } from "@/app/admin/locais/actions";
import {
  CORES_DE_LOCAL,
  buscarCep,
  corDoLocal,
  formatarCep,
  soDigitos,
} from "@/lib/ficha";

type Salvar = (anterior: EstadoLocal, form: FormData) => Promise<EstadoLocal>;

export type LocalEmEdicao = {
  id: string;
  nome: string;
  capacidade: number;
  aoArLivre: boolean;
  cor: string;
  observacoes: string;
  endereco: Record<string, string>;
};

export const LOCAL_VAZIO: LocalEmEdicao = {
  id: "",
  nome: "",
  capacidade: 12,
  aoArLivre: false,
  cor: "verde",
  observacoes: "",
  endereco: {},
};

const CAMPOS_DO_CEP = ["logradouro", "bairro", "cidade", "uf"] as const;

export function FormularioLocal({
  local = LOCAL_VAZIO,
  salvar,
  demo = false,
}: {
  local?: LocalEmEdicao;
  salvar?: Salvar;
  demo?: boolean;
}) {
  const [aoArLivre, setAoArLivre] = useState(local.aoArLivre);
  const [cor, setCor] = useState(local.cor);
  const [cep, setCep] = useState(local.endereco.cep ?? "");
  const [erroCep, setErroCep] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);

  const [estado, enviar, pendente] = useActionState<EstadoLocal, FormData>(
    salvar ?? (async () => ({ erro: "Ação indisponível." })),
    undefined,
  );

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
    <Cartao className="p-6">
      <form
        ref={formRef}
        action={demo ? undefined : enviar}
        onSubmit={demo ? (e) => e.preventDefault() : undefined}
        className="flex flex-col gap-5"
      >
        <input type="hidden" name="id" value={local.id} />
        <input type="hidden" name="ar_livre" value={aoArLivre ? "1" : "0"} />
        <input type="hidden" name="cor" value={cor} />

        <Campo
          rotulo="Nome do local"
          name="nome"
          defaultValue={local.nome}
          required
          autoComplete="off"
          placeholder="Estúdio"
        />

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-xs uppercase tracking-[0.1em] text-[var(--color-muted)]">
            Tipo
          </legend>
          <div className="flex gap-2">
            {(
              [
                [false, "Interno"],
                [true, "Ao ar livre"],
              ] as const
            ).map(([valor, rotulo]) => (
              <button
                key={rotulo}
                type="button"
                onClick={() => setAoArLivre(valor)}
                aria-pressed={aoArLivre === valor}
                className={`h-9 rounded-[var(--radius-md)] px-4 text-sm transition ${
                  aoArLivre === valor
                    ? "bg-[var(--color-palha)] font-medium text-[var(--color-on-palha)]"
                    : "border border-[var(--color-border-strong)] text-[var(--color-muted)]"
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-xs uppercase tracking-[0.1em] text-[var(--color-muted)]">
            Cor na agenda
          </legend>
          <div className="flex flex-wrap gap-2">
            {CORES_DE_LOCAL.map((c) => (
              <button
                key={c.valor}
                type="button"
                onClick={() => setCor(c.valor)}
                aria-pressed={cor === c.valor}
                title={c.rotulo}
                className={`flex h-9 items-center gap-2 rounded-[var(--radius-md)] border px-3 text-xs transition ${
                  cor === c.valor
                    ? "border-[var(--color-foreground)] font-medium"
                    : "border-[var(--color-border-strong)] text-[var(--color-muted)]"
                }`}
              >
                <span
                  aria-hidden
                  className="size-3.5 rounded-full"
                  style={{ backgroundColor: corDoLocal(c.valor) }}
                />
                {c.rotulo}
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--color-muted)]">
            Só cores da paleta ATMA — a agenda usa esta para marcar as aulas
            daqui.
          </p>
        </fieldset>

        <Campo
          rotulo="Quantas pessoas cabem"
          name="capacidade"
          type="number"
          min={1}
          max={200}
          defaultValue={local.capacidade}
        />

        <Divisao>Endereço</Divisao>

        <div className="grid grid-cols-[1fr_6rem] gap-3">
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
            {erroCep ? (
              <p className="text-xs text-[var(--color-danger)]">{erroCep}</p>
            ) : null}
          </div>
          <Campo
            rotulo="Número"
            name="numero"
            defaultValue={local.endereco.numero ?? ""}
            autoComplete="off"
          />
        </div>

        <Campo
          rotulo="Logradouro"
          name="logradouro"
          defaultValue={local.endereco.logradouro ?? ""}
          autoComplete="off"
        />

        <div className="grid grid-cols-2 gap-3">
          <Campo
            rotulo="Complemento"
            name="complemento"
            defaultValue={local.endereco.complemento ?? ""}
            autoComplete="off"
          />
          <Campo
            rotulo="Bairro"
            name="bairro"
            defaultValue={local.endereco.bairro ?? ""}
            autoComplete="off"
          />
        </div>

        <div className="grid grid-cols-[1fr_5rem] gap-3">
          <Campo
            rotulo="Cidade"
            name="cidade"
            defaultValue={local.endereco.cidade ?? ""}
            autoComplete="off"
          />
          <Campo
            rotulo="UF"
            name="uf"
            defaultValue={local.endereco.uf ?? ""}
            maxLength={2}
            className="uppercase"
            autoComplete="off"
          />
        </div>

        <AreaDeTexto
          rotulo="Observações"
          name="observacoes"
          rows={2}
          defaultValue={local.observacoes}
          placeholder="Como chegar, estacionamento, o que levar…"
        />

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
          {pendente ? "Salvando…" : local.id ? "Salvar local" : "Criar local"}
        </Botao>

        {demo ? (
          <p className="text-center text-xs text-[var(--color-muted)]">
            Maquete — nada é salvo.
          </p>
        ) : null}
      </form>
    </Cartao>
  );
}
