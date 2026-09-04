import type { FormaPagamento, StatusPagamento } from "@/lib/tipos";

/**
 * Tipo e regras de cobrança, fora de qualquer componente.
 *
 * Vivem aqui porque servidor e cliente precisam dos dois: a página soma os
 * totais no servidor, a lista desenha as linhas no cliente. Enquanto isto
 * morava no componente marcado com "use client", chamar do servidor
 * derrubava a página inteira em produção.
 */

export type Cobranca = {
  id: string;
  alunoId: string;
  aluno: string;
  telefone: string | null;
  turma: string | null;
  valor: number;
  proporcao: number | null;
  mesReferencia: string; // YYYY-MM-DD
  vencimento: string; // YYYY-MM-DD
  status: StatusPagamento;
  pagoEm: string | null;
  forma: FormaPagamento | null;
  avisadoEm: string | null;
};

/**
 * "Vencido" é calculado na hora, não lido do banco.
 *
 * O status gravado só mudaria se alguém rodasse uma rotina diária; sem isso a
 * cobrança de ontem apareceria como "a vencer" para sempre.
 */
export const estaVencida = (c: Cobranca, hoje: string) =>
  c.status !== "paid" && c.vencimento < hoje;
