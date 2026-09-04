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

/** A grade real do estúdio, em turmas — como a administração a vê. */
const TURMAS_BASE = [
  { id: "c1", turma: "Manhã 07:00", dias: [1, 3, 5], hora: "07:00", sala: "Estúdio", arLivre: false, cor: "verde", professor: "Marina Vieira", alunos: 9 },
  { id: "c2", turma: "Manhã 08:30", dias: [2, 4], hora: "08:30", sala: "Estúdio", arLivre: false, cor: "verde", professor: "Marina Vieira", alunos: 12 },
  { id: "c3", turma: "Manhã 08:30 · ar livre", dias: [3, 5], hora: "08:30", sala: "Iate Clube", arLivre: true, cor: "azul", professor: "Rafael Nunes", alunos: 7 },
  { id: "c4", turma: "Noite 18:00", dias: [1, 3], hora: "18:00", sala: "Estúdio", arLivre: false, cor: "mel", professor: "Rafael Nunes", alunos: 11 },
  { id: "c5", turma: "Noite 19:00", dias: [2, 4], hora: "19:00", sala: "Estúdio", arLivre: false, cor: "verde-profundo", professor: null, alunos: 4 },
];

/** Um encontro por dia de cada turma — o formato que a grade consome. */
export const ENCONTROS = TURMAS_BASE.flatMap((t) =>
  t.dias.map((weekday) => ({
    meetingId: `${t.id}-${weekday}`,
    turmaId: t.id,
    turma: t.turma,
    weekday,
    hora: t.hora,
    duracao: 60,
    capacidade: 12,
    matriculados: t.alunos,
    sala: t.sala,
    aoArLivre: t.arLivre,
    cor: t.cor,
    professor: t.professor,
    ativa: true,
  })),
);

export const TURMAS = TURMAS_BASE.map((t) => ({
  id: t.id,
  nome: t.turma,
  dias: t.dias,
  hora: t.hora,
  sala: t.sala,
  aoArLivre: t.arLivre,
  cor: t.cor,
  professor: t.professor,
  matriculados: t.alunos,
  capacidade: 12,
  ativa: true,
}));

export const MENSALIDADE_EXEMPLO = 220;

export const SALAS = [
  { valor: "r1", rotulo: "Estúdio" },
  { valor: "r2", rotulo: "Iate Clube" },
];

export const PROFESSORES_OPCOES = [
  { valor: "t1", rotulo: "Marina Vieira" },
  { valor: "t2", rotulo: "Rafael Nunes" },
];

/** Uma chamada em andamento, para conferir a tela do professor. */
export const CHAMADA = [
  { id: "b1", nome: "Helena Costa", status: "attended" as const, frequencia: 92, presencas: 11, totalRegistrado: 12 },
  { id: "b2", nome: "Bruno Almeida", status: "attended" as const, frequencia: 75, presencas: 9, totalRegistrado: 12 },
  { id: "b3", nome: "Carla Ribeiro", status: "no_show" as const, frequencia: 58, presencas: 7, totalRegistrado: 12 },
  { id: "b4", nome: "Diego Farias", status: "booked" as const, frequencia: 100, presencas: 12, totalRegistrado: 12 },
  { id: "b5", nome: "Elisa Monteiro", status: "booked" as const, frequencia: null, presencas: 0, totalRegistrado: 0 },
];

/** Cobranças de exemplo para a tela de financeiro. */
const hojeIso = new Date().toISOString().slice(0, 10);
const noMes = (dia: number) => `${hojeIso.slice(0, 7)}-${String(dia).padStart(2, "0")}`;

export const COBRANCAS = [
  { id: "p1", aluno: "Helena Costa", turma: "Manhã 07:00", valor: 220, proporcao: 1, vencimento: noMes(5), status: "paid" as const, pagoEm: noMes(3), forma: "pix" as const },
  { id: "p2", aluno: "Bruno Almeida", turma: "Manhã 07:00", valor: 220, proporcao: 1, vencimento: noMes(5), status: "paid" as const, pagoEm: noMes(5), forma: "cash" as const },
  { id: "p3", aluno: "Carla Ribeiro", turma: "Noite 19:00", valor: 220, proporcao: 1, vencimento: noMes(5), status: "pending" as const, pagoEm: null, forma: null },
  { id: "p4", aluno: "Diego Farias", turma: "Manhã 08:30", valor: 165, proporcao: 0.75, vencimento: noMes(5), status: "pending" as const, pagoEm: null, forma: null },
  { id: "p5", aluno: "Elisa Monteiro", turma: "Noite 18:00", valor: 55, proporcao: 0.25, vencimento: noMes(28), status: "pending" as const, pagoEm: null, forma: null },
];

export const HOJE_ISO = hojeIso;

/** Locais de exemplo, com as cores da paleta. */
export const LOCAIS = [
  { nome: "Estúdio", endereco: "Rua Manoel Alves da Costa, 120 · Centro · Armação dos Búzios/RJ", arLivre: false, lugares: 15, cor: "verde" },
  { nome: "Iate Clube", endereco: "Praia dos Ossos · Armação dos Búzios/RJ", arLivre: true, lugares: 25, cor: "azul" },
];
