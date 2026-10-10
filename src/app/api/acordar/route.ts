import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Mantém o banco acordado.
 *
 * O plano gratuito do Supabase pausa o projeto depois de uns dias sem
 * nenhuma consulta, e projeto pausado perde o endereço: o estúdio abre o
 * sistema e lê "acesso ou senha incorretos", porque a tela de entrada não
 * distingue senha errada de banco fora do ar — ela é genérica de propósito,
 * para não entregar quais e-mails existem.
 *
 * Aconteceu em 10/10/2026, depois de quinze dias de recesso. Para não
 * repetir, a Vercel chama esta rota uma vez por dia (ver vercel.json) e a
 * consulta abaixo conta como uso.
 *
 * A consulta é a menor possível: pergunta quantos locais existem e nem traz
 * as linhas. Não devolve nada do estúdio — só a contagem e a hora — para que
 * continue inofensiva mesmo se alguém de fora descobrir o endereço.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Se houver segredo configurado, exige. Sem ele a rota segue aberta: a
  // Vercel só manda o cabeçalho quando a variável existe no projeto.
  const segredo = process.env.CRON_SECRET;
  if (segredo) {
    const veio = request.headers.get("authorization");
    if (veio !== `Bearer ${segredo}`) {
      return Response.json({ erro: "não autorizado" }, { status: 401 });
    }
  }

  const agora = new Date().toISOString();

  try {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from("rooms")
      .select("id", { count: "exact", head: true });

    if (error) {
      return Response.json(
        { acordado: false, erro: error.message, em: agora },
        { status: 503 },
      );
    }

    return Response.json({ acordado: true, locais: count, em: agora });
  } catch (erro) {
    // Chave ausente ou banco inalcançável: devolve 503 para a tentativa
    // aparecer como falha no registro da Vercel, em vez de passar batida.
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return Response.json(
      { acordado: false, erro: mensagem, em: agora },
      { status: 503 },
    );
  }
}
