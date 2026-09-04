"use client";

import { useActionState, useRef, useState } from "react";

import { Caixas } from "@/components/paineis/caixas";
import {
  AreaDeTexto,
  Botao,
  Campo,
  Cartao,
  Divisao,
  TituloSecao,
} from "@/components/ui";
import type { EstadoMeuCadastro } from "@/app/aluno/cadastro/actions";
import {
  CONDICOES_DE_SAUDE,
  buscarCep,
  formatarCep,
  formatarCpf,
  soDigitos,
} from "@/lib/ficha";

type Acao = (
  anterior: EstadoMeuCadastro,
  form: FormData,
) => Promise<EstadoMeuCadastro>;

const LINHA = "sm:col-span-2";
const CAMPOS_DO_CEP = ["logradouro", "bairro", "cidade", "uf"] as const;

export type MeusDados = {
  nome: string;
  nomeSocial: string;
  email: string;
  telefone: string;
  cpf: string;
  endereco: Record<string, string>;
  condicoes: string[];
  observacoes: string;
  senhaPadrao: boolean;
};

export function MeuCadastro({
  dados,
  salvar,
  trocar,
}: {
  dados: MeusDados;
  salvar: Acao;
  trocar: Acao;
}) {
  const [cep, setCep] = useState(formatarCep(dados.endereco.cep ?? ""));
  const [erroCep, setErroCep] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [estado, enviar, pendente] = useActionState<EstadoMeuCadastro, FormData>(
    salvar,
    undefined,
  );
  const [estadoSenha, enviarSenha, trocando] = useActionState<
    EstadoMeuCadastro,
    FormData
  >(trocar, undefined);

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
    <>
      {dados.senhaPadrao ? (
        <Cartao
          className="mb-8 px-5 py-4"
          style={{ borderLeft: "3px solid var(--color-mel)" }}
        >
          <p className="text-sm">Você ainda usa a senha que o estúdio criou.</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Troque abaixo por uma que só você saiba.
          </p>
        </Cartao>
      ) : null}

      <section className="mb-12">
        <TituloSecao>Seus dados</TituloSecao>

        <Cartao className="p-6">
          <form
            ref={formRef}
            action={enviar}
            className="grid gap-x-4 gap-y-5 sm:grid-cols-2"
          >
            {/* Nome, e-mail e CPF identificam a pessoa e servem de login:
                mudam pela administração, não aqui. */}
            <div className={`flex flex-col gap-1.5 ${LINHA}`}>
              <span className="text-xs uppercase tracking-[0.1em] text-[var(--color-muted)]">
                Nome
              </span>
              <p className="text-sm">{dados.nome}</p>
              <p className="text-xs text-[var(--color-muted)]">
                {dados.email}
                {dados.cpf ? ` · ${formatarCpf(dados.cpf)}` : ""}
              </p>
              <p className="text-xs text-[var(--color-muted)]">
                Para corrigir nome, e-mail ou CPF, fale com a recepção.
              </p>
            </div>

            <Campo
              rotulo="Como prefere ser chamado"
              name="nome_social"
              defaultValue={dados.nomeSocial}
              autoComplete="nickname"
              classeExterna={LINHA}
            />

            <Campo
              rotulo="WhatsApp"
              name="telefone"
              defaultValue={dados.telefone}
              autoComplete="tel"
              classeExterna={LINHA}
            />

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
              />
              {erroCep ? (
                <p className="text-xs text-[var(--color-danger)]">{erroCep}</p>
              ) : null}
            </div>
            <Campo
              rotulo="Número"
              name="numero"
              defaultValue={dados.endereco.numero ?? ""}
              autoComplete="off"
            />
            <Campo
              rotulo="Logradouro"
              name="logradouro"
              defaultValue={dados.endereco.logradouro ?? ""}
              autoComplete="street-address"
              classeExterna={LINHA}
            />
            <Campo
              rotulo="Complemento"
              name="complemento"
              defaultValue={dados.endereco.complemento ?? ""}
              autoComplete="off"
            />
            <Campo
              rotulo="Bairro"
              name="bairro"
              defaultValue={dados.endereco.bairro ?? ""}
              autoComplete="off"
            />
            <Campo
              rotulo="Cidade"
              name="cidade"
              defaultValue={dados.endereco.cidade ?? ""}
              autoComplete="address-level2"
            />
            <Campo
              rotulo="UF"
              name="uf"
              defaultValue={dados.endereco.uf ?? ""}
              maxLength={2}
              className="uppercase"
              autoComplete="address-level1"
            />

            <Divisao>Saúde</Divisao>

            <div className={LINHA}>
              <Caixas
                name="saude"
                opcoes={CONDICOES_DE_SAUDE}
                marcados={dados.condicoes}
                colunas={2}
              />
            </div>

            <AreaDeTexto
              rotulo="Observações"
              name="observacoes_saude"
              rows={3}
              defaultValue={dados.observacoes}
              classeExterna={LINHA}
              dica="O professor da sua turma vê isto, para adaptar as posturas."
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

            <Botao type="submit" disabled={pendente} className={LINHA}>
              {pendente ? "Salvando…" : "Salvar"}
            </Botao>
          </form>
        </Cartao>
      </section>

      <section>
        <TituloSecao>Sua senha</TituloSecao>

        <Cartao className="p-6">
          <form action={enviarSenha} className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <Campo
              rotulo="Nova senha"
              name="senha"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="ao menos 6 caracteres"
            />
            <Campo
              rotulo="Repita"
              name="senha_confirma"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
            />

            {estadoSenha && "erro" in estadoSenha ? (
              <p role="alert" className={`text-sm text-[var(--color-danger)] ${LINHA}`}>
                {estadoSenha.erro}
              </p>
            ) : null}
            {estadoSenha && "sucesso" in estadoSenha ? (
              <p role="status" className={`text-sm text-[var(--color-success)] ${LINHA}`}>
                {estadoSenha.sucesso}
              </p>
            ) : null}

            <Botao type="submit" disabled={trocando} className={LINHA}>
              {trocando ? "Trocando…" : "Trocar senha"}
            </Botao>
          </form>
        </Cartao>
      </section>
    </>
  );
}
