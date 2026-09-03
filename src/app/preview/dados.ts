import type {
  AgendamentoDoAluno,
  AulaNaAgenda,
  ResumoDoAluno,
} from "@/components/paineis/tipos";

/**
 * Dados fictícios só para revisar o layout. Nada aqui toca o banco.
 * As cores são as mesmas do seed de `modalities`, dentro da paleta ATMA.
 */

const CORES = {
  hatha: "#516D3B", // verde aberto
  vinyasa: "#BE8E55", // mel
  yin: "#4E6E86", // azul ganesha
  ashtanga: "#3A2A20", // marrom esquadria
  meditacao: "#DFC9A2", // palha
  pranayama: "#3E5430", // verde profundo (derivado)
} as const;

/** Hoje às HH:MM, ou daqui a `dias` dias. */
function em(dias: number, hora: number, minuto = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  d.setHours(hora, minuto, 0, 0);
  return d.toISOString();
}

export const AULAS_DE_HOJE: AulaNaAgenda[] = [
  {
    id: "s1",
    inicio: em(0, 7, 0),
    modalidade: "Hatha Yoga",
    cor: CORES.hatha,
    professor: "Marina Vieira",
    sala: "Sala Principal",
    ocupadas: 14,
    capacidade: 20,
    naEspera: 0,
  },
  {
    id: "s2",
    inicio: em(0, 12, 15),
    modalidade: "Pranayama",
    cor: CORES.pranayama,
    professor: "Marina Vieira",
    sala: "Sala Shanti",
    ocupadas: 9,
    capacidade: 12,
    naEspera: 0,
  },
  {
    id: "s3",
    inicio: em(0, 19, 0),
    modalidade: "Vinyasa Flow",
    cor: CORES.vinyasa,
    professor: "Marina Vieira",
    sala: "Sala Principal",
    ocupadas: 20,
    capacidade: 20,
    naEspera: 3,
  },
];

export const AULAS_DA_SEMANA: AulaNaAgenda[] = [
  {
    id: "s4",
    inicio: em(1, 7, 0),
    modalidade: "Hatha Yoga",
    cor: CORES.hatha,
    professor: "Marina Vieira",
    sala: "Sala Principal",
    ocupadas: 11,
    capacidade: 20,
    naEspera: 0,
  },
  {
    id: "s5",
    inicio: em(2, 19, 0),
    modalidade: "Yin Yoga",
    cor: CORES.yin,
    professor: "Marina Vieira",
    sala: "Sala Shanti",
    ocupadas: 12,
    capacidade: 12,
    naEspera: 1,
  },
  {
    id: "s6",
    inicio: em(4, 6, 30),
    modalidade: "Ashtanga",
    cor: CORES.ashtanga,
    professor: "Marina Vieira",
    sala: "Sala Principal",
    ocupadas: 8,
    capacidade: 16,
    naEspera: 0,
  },
];

export const AGENDA_DO_ESTUDIO: AulaNaAgenda[] = [
  ...AULAS_DE_HOJE,
  {
    id: "s7",
    inicio: em(1, 8, 30),
    modalidade: "Meditação",
    cor: CORES.meditacao,
    professor: "Rafael Nunes",
    sala: "Sala Shanti",
    ocupadas: 6,
    capacidade: 12,
    naEspera: 0,
  },
  ...AULAS_DA_SEMANA.slice(0, 2),
  {
    id: "s8",
    inicio: em(3, 19, 0),
    modalidade: "Vinyasa Flow",
    cor: CORES.vinyasa,
    professor: "Rafael Nunes",
    sala: "Sala Principal",
    ocupadas: 17,
    capacidade: 20,
    naEspera: 0,
  },
];

export const RESUMO_DO_ALUNO: ResumoDoAluno = {
  plano: "Mensal 3x semana",
  creditosRestantes: 7,
  aulasFeitas: 42,
  planoVenceEm: (() => {
    const d = new Date();
    d.setDate(d.getDate() + 18);
    return d.toISOString().slice(0, 10);
  })(),
};

export const AGENDAMENTOS_DO_ALUNO: AgendamentoDoAluno[] = [
  {
    id: "b1",
    inicio: em(0, 19, 0),
    modalidade: "Vinyasa Flow",
    professor: "Marina Vieira",
    status: "booked",
    posicaoNaEspera: null,
  },
  {
    id: "b2",
    inicio: em(2, 19, 0),
    modalidade: "Yin Yoga",
    professor: "Marina Vieira",
    status: "waitlisted",
    posicaoNaEspera: 2,
  },
  {
    id: "b3",
    inicio: em(4, 6, 30),
    modalidade: "Ashtanga",
    professor: "Rafael Nunes",
    status: "booked",
    posicaoNaEspera: null,
  },
];

export const VAGAS_ABERTAS: AulaNaAgenda[] = AGENDA_DO_ESTUDIO.slice(0, 6);

export const NUMEROS_DO_ADMIN = {
  alunosAtivos: 87,
  matriculasAtivas: 74,
  recebidoNoMes: 21480,
  totalEmAtraso: 1320,
  cobrancasEmAtraso: 4,
};
