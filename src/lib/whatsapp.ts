/**
 * Links de conversa do WhatsApp.
 *
 * Não existe envio em massa sem a API oficial (WhatsApp Business, via Meta ou
 * Twilio), que cobra por mensagem e exige o texto aprovado antes. O que existe
 * é o link wa.me: abre a conversa com a mensagem já escrita, e quem aperta
 * enviar é a pessoa. Automatizar o WhatsApp Web por fora derruba o número, e
 * por isso não está aqui.
 */

/**
 * Telefone brasileiro no formato que o wa.me espera: só dígitos, com o 55 na
 * frente. Devolve null quando o número não dá para usar — melhor esconder o
 * botão do que abrir uma conversa com ninguém.
 */
export function telefoneParaWhatsapp(bruto: string | null): string | null {
  if (!bruto) return null;

  let d = bruto.replace(/\D/g, "");

  // Alguns cadastros já vêm com o país; outros não.
  if (d.startsWith("55")) d = d.slice(2);

  // Celular com DDD tem 11 dígitos; fixo tem 10. Menos que isso não serve.
  if (d.length < 10 || d.length > 11) return null;

  return `55${d}`;
}

const dinheiro = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const dataCurta = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

const mesPorExtenso = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { month: "long" });

/**
 * O texto do aviso de mensalidade atrasada.
 *
 * Só existe esta versão: o estúdio decidiu não avisar antes do vencimento —
 * quem paga em dia não precisa ser lembrado, e a mensagem que chega cedo
 * demais vira barulho.
 *
 * Escrito para ser lido por alguém que gosta do estúdio, não por um
 * inadimplente: sem "regularize", sem "pendência", sem ameaça. E abre espaço
 * para o caso comum de já ter pago e a baixa não ter sido dada.
 */
export function mensagemDeCobranca({
  nome,
  mesReferencia,
  valor,
  vencimento,
}: {
  nome: string;
  mesReferencia: string;
  valor: number;
  vencimento: string;
}): string {
  const primeiro = nome.trim().split(/\s+/)[0];

  return (
    `Oi, ${primeiro}! Tudo bem? Passando pra lembrar da mensalidade de ` +
    `${mesPorExtenso(mesReferencia)} (${dinheiro(valor)}), que venceu dia ` +
    `${dataCurta(vencimento)}. Se já tiver pago, é só desconsiderar. ` +
    `Qualquer coisa me chama por aqui 🙏`
  );
}

/** O link que abre a conversa com o texto pronto. */
export function linkDaConversa(telefone: string, mensagem: string): string {
  return `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
}
