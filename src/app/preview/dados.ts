import type {
  AgendamentoDoAluno,
  AulaNaAgenda,
  ResumoDoAluno,
} from "@/components/paineis/tipos";

/**
 * Dados fictícios só para revisar o layout. Nada aqui toca o banco.
 *
 * O estúdio pratica estilo livre, então quase toda aula vem sem título e
 * aparece como "Yoga". As poucas com título mostram como as exceções ficam.
 */

/**
 * Hoje às HH:MM em horário de Brasília, ou daqui a `dias` dias.
 *
 * O offset é escrito à mão de propósito: em produção isto roda num servidor
 * em UTC, e `setHours` usaria o fuso do servidor — a aula das 19:00 apareceria
 * como 16:00 para o aluno.
 */
function em(dias: number, hora: number, minuto = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);

  const aa = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const HH = String(hora).padStart(2, "0");
  const MM = String(minuto).padStart(2, "0");

  return new Date(`${aa}-${mm}-${dd}T${HH}:${MM}:00-03:00`).toISOString();
}

export const AULAS_DE_HOJE: AulaNaAgenda[] = [
  {
    id: "s1",
    inicio: em(0, 7, 0),
    titulo: null,
    professor: "Marina Vieira",
    sala: "Sala Principal",
    ocupadas: 14,
    capacidade: 20,
    naEspera: 0,
  },
  {
    id: "s2",
    inicio: em(0, 12, 15),
    titulo: "Yoga no almoço",
    professor: "Marina Vieira",
    sala: "Sala Shanti",
    ocupadas: 9,
    capacidade: 12,
    naEspera: 0,
  },
  {
    id: "s3",
    inicio: em(0, 19, 0),
    titulo: null,
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
    titulo: null,
    professor: "Marina Vieira",
    sala: "Sala Principal",
    ocupadas: 11,
    capacidade: 20,
    naEspera: 0,
  },
  {
    id: "s5",
    inicio: em(2, 19, 0),
    titulo: "Yoga restaurativa",
    professor: "Marina Vieira",
    sala: "Sala Shanti",
    ocupadas: 12,
    capacidade: 12,
    naEspera: 1,
  },
  {
    id: "s6",
    inicio: em(4, 6, 30),
    titulo: null,
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
    titulo: null,
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
    titulo: null,
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
    titulo: null,
    professor: "Marina Vieira",
    status: "booked",
    posicaoNaEspera: null,
  },
  {
    id: "b2",
    inicio: em(2, 19, 0),
    titulo: "Yoga restaurativa",
    professor: "Marina Vieira",
    status: "waitlisted",
    posicaoNaEspera: 2,
  },
  {
    id: "b3",
    inicio: em(4, 6, 30),
    titulo: null,
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

/** Pessoas fictícias para a tela de cadastro da administração. */
export const PESSOAS = {
  professores: [
    {
      id: "t1",
      nome: "Marina Vieira",
      email: "marina@atma.com.br",
      telefone: "(22) 99812-4471",
      ativo: true,
      desde: "2024-03-11",
    },
    {
      id: "t2",
      nome: "Rafael Nunes",
      email: "rafael@atma.com.br",
      telefone: "(22) 99745-2210",
      ativo: true,
      desde: "2025-08-02",
    },
  ],
  alunos: [
    {
      id: "a1",
      nome: "Helena Costa",
      email: "helena@exemplo.com",
      telefone: "(22) 99631-8890",
      ativo: true,
      desde: "2025-11-20",
      plano: "Mensal 3x semana",
    },
    {
      id: "a2",
      nome: "Bruno Almeida",
      email: "bruno@exemplo.com",
      telefone: "(22) 99502-3317",
      ativo: true,
      desde: "2026-01-14",
      plano: "Pacote 10 aulas",
      senhaPadrao: true,
    },
    {
      id: "a3",
      nome: "Sofia Marques",
      email: "sofia@exemplo.com",
      telefone: "(22) 99417-6624",
      ativo: false,
      desde: "2025-05-09",
      plano: null,
    },
  ],
};

/** A grade real do estúdio, para conferir o editor sem estar logado. */
export const GRADE = [
  [1, "07:00", "Estúdio", false],
  [1, "18:00", "Estúdio", false],
  [2, "08:30", "Estúdio", false],
  [2, "19:00", "Estúdio", false],
  [3, "07:00", "Estúdio", false],
  [3, "08:30", "Iate Clube", true],
  [3, "18:00", "Estúdio", false],
  [4, "08:30", "Estúdio", false],
  [4, "19:00", "Estúdio", false],
  [5, "07:00", "Estúdio", false],
  [5, "08:30", "Iate Clube", true],
].map(([weekday, hora, sala, aoArLivre], i) => ({
  id: `g${i}`,
  weekday: weekday as number,
  hora: hora as string,
  duracao: 60,
  capacidade: aoArLivre ? 25 : 15,
  salaId: aoArLivre ? "r2" : "r1",
  sala: sala as string,
  aoArLivre: aoArLivre as boolean,
  professorId: null,
  professor: null,
  titulo: null,
  ativo: true,
}));

export const SALAS = [
  { id: "r1", nome: "Estúdio" },
  { id: "r2", nome: "Iate Clube" },
];

export const PROFESSORES_OPCOES = [
  { id: "t1", nome: "Marina Vieira" },
  { id: "t2", nome: "Rafael Nunes" },
];
