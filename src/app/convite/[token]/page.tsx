import { Assinatura } from "@/components/marca";
import { FormularioConvite } from "@/components/paineis/formulario-convite";
import { Cartao } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { PAPEL, type Papel } from "@/lib/tipos";

export const metadata = { title: "Cadastro" };
export const dynamic = "force-dynamic";

/**
 * Confere o convite só para decidir o que mostrar. O consumo de verdade
 * acontece no envio do formulário — se fosse aqui, abrir a página duas vezes
 * gastaria o convite sem ninguém se cadastrar.
 */
async function lerConvite(token: string) {
  const admin = createAdminClient();

  const { data } = await admin
    .from("invites")
    .select("role, expires_at, max_uses, uses, revoked_at, label")
    .eq("token", token)
    .maybeSingle();

  if (!data) return { valido: false as const, motivo: "não encontrado" };
  if (data.revoked_at) return { valido: false as const, motivo: "cancelado" };
  if (new Date(data.expires_at) < new Date()) {
    return { valido: false as const, motivo: "vencido" };
  }
  if (data.max_uses !== null && data.uses >= data.max_uses) {
    return { valido: false as const, motivo: "já utilizado" };
  }

  return { valido: true as const, papel: data.role as Papel };
}

export default async function ConvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const convite = await lerConvite(token);

  const { cadastrarPeloConvite } = await import("./actions");

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-6 py-12">
      <div className="mb-10 flex justify-center">
        <Assinatura largura={120} />
      </div>

      {!convite.valido ? (
        <Cartao className="p-8 text-center">
          <h1 className="text-lg font-light">Este link não vale mais</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            O convite está {convite.motivo}. Peça um novo à administração do
            estúdio.
          </p>
        </Cartao>
      ) : (
        <>
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-light">
              {convite.papel === "teacher"
                ? "Cadastro de professor"
                : "Seu cadastro no estúdio"}
            </h1>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Preencha seus dados e escolha uma senha. Leva dois minutos.
            </p>
          </div>

          <FormularioConvite
            token={token}
            papel={convite.papel}
            acao={cadastrarPeloConvite}
          />

          <p className="mt-6 text-center text-xs text-[var(--color-muted)]">
            Você está se cadastrando como {PAPEL[convite.papel].toLowerCase()}.
          </p>
        </>
      )}
    </main>
  );
}
