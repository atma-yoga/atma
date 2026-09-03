import type { StatusAgendamento } from "@/lib/tipos";

/**
 * Formatos que os painéis consomem. Deliberadamente independentes do
 * Supabase: as páginas buscam e adaptam, o /preview injeta dados fictícios,
 * e o layout é literalmente o mesmo nos dois casos.
 */

export type AulaNaAgenda = {
  id: string;
  inicio: string; // ISO
  modalidade: string;
  cor: string | null;
  professor: string | null;
  sala: string | null;
  ocupadas: number;
  capacidade: number;
  naEspera: number;
};

export type AgendamentoDoAluno = {
  id: string;
  inicio: string;
  modalidade: string;
  professor: string | null;
  status: StatusAgendamento;
  posicaoNaEspera: number | null;
};

export type ResumoDoAluno = {
  plano: string | null;
  creditosRestantes: number | null; // null = ilimitado
  aulasFeitas: number;
  planoVenceEm: string | null; // YYYY-MM-DD
};

export const vagasLivres = (a: AulaNaAgenda) =>
  Math.max(a.capacidade - a.ocupadas, 0);
