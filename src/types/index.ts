// Tipos de domínio do SisRodov Manhuaçu.
// Nesta versão os dados vêm de mocks, mas os tipos já espelham o futuro backend.

export type TripStatus =
  | "prevista"
  | "embarque"
  | "ultima-chamada"
  | "realizada"
  | "cancelada"
  | "atrasada"
  | "partiu";

export type ReconciliationStatus = "conciliado" | "analise" | "divergencia";

export type FeeStatus = "pago" | "pendente" | "inadimplente";

export type TicketStatus = "emitida" | "utilizada" | "cancelada" | "nao-utilizada";

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  anttCode: string;
  contact: string;
  email: string;
  active: boolean;
  linesCount: number;
  tripsToday: number;
  boardingsToday: number;
  color: string;
}

export interface Line {
  id: string;
  code: string;
  origin: string;
  destination: string;
  companyId: string;
  frequency: string;
  departure: string;
  active: boolean;
}

export interface Trip {
  id: string;
  number: string;
  date: string;
  scheduled: string;
  realized?: string;
  companyId: string;
  origin: string;
  destination: string;
  platform: string;
  vehicle: string;
  boardings: number;
  ticketsIssued: number;
  ticketsCancelled: number;
  gateAccess: number;
  companyReport: number;
  fee: number;
  status: TripStatus;
  reconciliation: ReconciliationStatus;
}

export interface Arrival {
  id: string;
  time: string;
  origin: string;
  companyId: string;
  platform: string;
  status: "chegando" | "previsto" | "atrasado" | "chegou";
}

export interface Schedule {
  id: string;
  time: string;
  companyId: string;
  destination: string;
  platform: string;
  frequency: string;
  situation: "ativo" | "suspenso" | "sazonal";
}

export interface Platform {
  id: string;
  number: string;
  status: "disponivel" | "ocupada" | "manutencao";
  tripId?: string;
  label?: string;
}

export interface Ticket {
  id: string;
  code: string;
  tripId: string;
  companyId: string;
  origin: string;
  destination: string;
  status: TicketStatus;
  issuedAt: string;
}

export interface BoardingEvent {
  id: string;
  time: string;
  device: string;
  tripCode: string;
  ticketCode: string;
  event: "Acesso" | "Reentrada" | "Negado";
  status: "Confirmado" | "Pendente" | "Rejeitado";
}

export interface Fee {
  id: string;
  number: string;
  companyId: string;
  competence: string;
  amount: number;
  dueDate: string;
  status: FeeStatus;
}

export interface Payment {
  id: string;
  date: string;
  companyId: string;
  feeNumber: string;
  amount: number;
  paidAt: string;
  status: "confirmado" | "processando";
}

export interface Discrepancy {
  id: string;
  tripNumber: string;
  companyId: string;
  tickets: number;
  gate: number;
  report: number;
  difference: number;
  situation: "em-analise" | "conferido" | "necessita-conferencia";
  note: string;
}

export interface AuditLog {
  id: string;
  datetime: string;
  user: string;
  action: string;
  module: string;
  description: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  profile:
    | "Administrador"
    | "Gestor do Terminal"
    | "Operacional"
    | "Financeiro"
    | "Auditor"
    | "Consulta";
  lastAccess: string;
  active: boolean;
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  status: "Preparado para integração";
  badge: "Não conectado" | "Ambiente demonstrativo";
}

export interface AlertItem {
  id: string;
  kind: "warning" | "info" | "success" | "danger";
  text: string;
  time: string;
}

export interface Destination {
  name: string;
  trips: number;
  boardings: number;
  companies: string[];
}

export interface ReportDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
}
