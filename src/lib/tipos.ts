import type { Database } from "@/lib/database.types";

type Enums = Database["public"]["Enums"];

export type Papel = Enums["app_role"];
export type Nivel = Enums["class_level"];
export type StatusAula = Enums["session_status"];
export type StatusAgendamento = Enums["booking_status"];
export type StatusMatricula = Enums["subscription_status"];
export type StatusPagamento = Enums["payment_status"];
export type FormaPagamento = Enums["payment_method"];
export type PeriodoPlano = Enums["plan_period"];

/** Rótulos em português para os enums do banco. */
export const PAPEL: Record<Papel, string> = {
  admin: "Administração",
  teacher: "Professor",
  student: "Aluno",
};

export const NIVEL: Record<Nivel, string> = {
  todos: "Todos os níveis",
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

export const STATUS_AULA: Record<StatusAula, string> = {
  scheduled: "Agendada",
  completed: "Realizada",
  canceled: "Cancelada",
};

export const STATUS_AGENDAMENTO: Record<StatusAgendamento, string> = {
  booked: "Confirmado",
  waitlisted: "Lista de espera",
  attended: "Presente",
  no_show: "Faltou",
  canceled: "Cancelado",
};

export const STATUS_MATRICULA: Record<StatusMatricula, string> = {
  pending: "Pendente",
  active: "Ativa",
  paused: "Pausada",
  expired: "Vencida",
  canceled: "Cancelada",
};

export const STATUS_PAGAMENTO: Record<StatusPagamento, string> = {
  pending: "A vencer",
  paid: "Pago",
  overdue: "Vencido",
  refunded: "Estornado",
  canceled: "Cancelado",
};

export const FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
  pix: "Pix",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  cash: "Dinheiro",
  bank_transfer: "Transferência",
  other: "Outro",
};

export const PERIODO_PLANO: Record<PeriodoPlano, string> = {
  single: "Avulsa",
  pack: "Pacote",
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
};

/**
 * Cor de fundo de cada status, dentro da paleta ATMA.
 * A letra é sempre marrom ou papel — ver globals.css.
 */
export const COR_STATUS_AGENDAMENTO: Record<
  StatusAgendamento,
  { fundo: string; letra: string }
> = {
  booked: { fundo: "var(--color-palha)", letra: "var(--color-on-palha)" },
  waitlisted: { fundo: "var(--color-mel)", letra: "var(--color-on-mel)" },
  attended: { fundo: "var(--color-verde)", letra: "var(--color-on-verde)" },
  no_show: { fundo: "var(--color-surface-sunken)", letra: "var(--color-muted)" },
  canceled: { fundo: "var(--color-surface-sunken)", letra: "var(--color-muted)" },
};

/** Home de cada papel. Um usuário com vários papéis cai no mais alto. */
export function rotaInicial(papeis: Papel[]): string {
  if (papeis.includes("admin")) return "/admin";
  if (papeis.includes("teacher")) return "/professor";
  return "/aluno";
}
