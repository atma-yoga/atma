import { redirect } from "next/navigation";

import {
  FormularioLocal,
  type LocalEmEdicao,
} from "@/components/paineis/formulario-local";
import { Shell } from "@/components/shell";
import { Cartao, Etiqueta, TituloSecao, Vazio } from "@/components/ui";
import { getSessao } from "@/lib/auth";
import { corDoLocal } from "@/lib/ficha";
import { createClient } from "@/lib/supabase/server";
import { alternarLocal, salvarLocal } from "./actions";

export const metadata = { title: "Locais" };

/** Endereço em uma linha, pulando o que não foi preenchido. */
function emUmaLinha(e: Record<string, string> | null): string | null {
  if (!e) return null;

  const rua = [e.logradouro, e.numero].filter(Boolean).join(", ");
  const cidade = [e.cidade, e.uf].filter(Boolean).join("/");

  return [rua, e.complemento, e.bairro, cidade, e.cep]
    .filter(Boolean)
    .join(" · ");
}

export default async function LocaisPage({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string }>;
}) {
  const { editar } = await searchParams;

  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");
  if (!sessao.papeis.includes("admin")) redirect("/");

  const supabase = await createClient();

  const [{ data: locais }, { data: turmas }] = await Promise.all([
    supabase.from("rooms").select("*").order("name"),
    supabase.from("classes").select("room_id").eq("is_active", true),
  ]);

  const turmasPorLocal = new Map<string, number>();
  for (const t of turmas ?? []) {
    if (t.room_id) {
      turmasPorLocal.set(t.room_id, (turmasPorLocal.get(t.room_id) ?? 0) + 1);
    }
  }

  const emEdicao = (locais ?? []).find((l) => l.id === editar);

  const paraEdicao: LocalEmEdicao | undefined = emEdicao
    ? {
        id: emEdicao.id,
        nome: emEdicao.name,
        capacidade: emEdicao.capacity,
        aoArLivre: emEdicao.is_outdoor,
        cor: emEdicao.color ?? "verde",
        observacoes: emEdicao.notes ?? "",
        endereco: (emEdicao.address as Record<string, string>) ?? {},
      }
    : undefined;

  return (
    <Shell papel="admin" nome={sessao.perfil?.full_name ?? ""}>
      <h1 className="mb-2 text-2xl font-light">Locais</h1>
      <p className="mb-8 text-sm text-[var(--color-muted)]">
        Onde as aulas acontecem. A cor de cada local marca as aulas na agenda.
      </p>

      <div className="grid gap-10 xl:grid-cols-[1fr_26rem] xl:items-start">
        <section>
          <TituloSecao
            acao={
              <span className="text-xs text-[var(--color-muted)]">
                {locais?.length ?? 0}
              </span>
            }
          >
            Cadastrados
          </TituloSecao>

          {locais?.length ? (
            <div className="flex flex-col gap-2">
              {locais.map((l) => {
                const endereco = emUmaLinha(
                  l.address as Record<string, string> | null,
                );
                const usos = turmasPorLocal.get(l.id) ?? 0;

                return (
                  <Cartao
                    key={l.id}
                    className={`px-5 py-4 ${l.is_active ? "" : "opacity-55"}`}
                    style={{ borderLeft: `3px solid ${corDoLocal(l.color)}` }}
                  >
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span className="min-w-40 flex-1">
                        <span className="block text-sm">{l.name}</span>
                        <span className="block text-xs text-[var(--color-muted)]">
                          {endereco ?? "sem endereço"}
                        </span>
                      </span>

                      <Etiqueta
                        fundo={
                          l.is_outdoor
                            ? "var(--color-azul)"
                            : "var(--color-palha)"
                        }
                        letra={
                          l.is_outdoor
                            ? "var(--color-on-azul)"
                            : "var(--color-on-palha)"
                        }
                      >
                        {l.is_outdoor ? "ar livre" : "interno"}
                      </Etiqueta>

                      <span className="text-xs tabular-nums text-[var(--color-muted)]">
                        {l.capacity} lugares
                      </span>

                      <span className="text-xs text-[var(--color-muted)]">
                        {usos} {usos === 1 ? "turma" : "turmas"}
                      </span>

                      <span className="flex gap-3">
                        <a
                          href={`/admin/locais?editar=${l.id}`}
                          className="text-xs text-[var(--color-muted)] underline underline-offset-4 hover:text-[var(--color-foreground)]"
                        >
                          editar
                        </a>

                        <form action={alternarLocal}>
                          <input type="hidden" name="id" value={l.id} />
                          <input
                            type="hidden"
                            name="ativar"
                            value={l.is_active ? "0" : "1"}
                          />
                          <button
                            type="submit"
                            className="text-xs text-[var(--color-muted)] underline underline-offset-4 hover:text-[var(--color-foreground)]"
                          >
                            {l.is_active ? "desativar" : "reativar"}
                          </button>
                        </form>
                      </span>
                    </div>

                    {l.notes ? (
                      <p className="mt-2 text-xs text-[var(--color-muted)]">
                        {l.notes}
                      </p>
                    ) : null}
                  </Cartao>
                );
              })}
            </div>
          ) : (
            <Vazio>Nenhum local cadastrado.</Vazio>
          )}
        </section>

        <div className="xl:sticky xl:top-6">
          <TituloSecao
            acao={
              paraEdicao ? (
                <a
                  href="/admin/locais"
                  className="text-xs text-[var(--color-muted)] underline underline-offset-4 hover:text-[var(--color-foreground)]"
                >
                  cancelar
                </a>
              ) : null
            }
          >
            {paraEdicao ? `Editando ${paraEdicao.nome}` : "Novo local"}
          </TituloSecao>

          <FormularioLocal
            key={paraEdicao?.id ?? "novo"}
            local={paraEdicao}
            salvar={salvarLocal}
          />
        </div>
      </div>
    </Shell>
  );
}
