import type {
  AlertItem,
  Arrival,
  AuditLog,
  BoardingEvent,
  Company,
  Destination,
  Discrepancy,
  Fee,
  Integration,
  Line,
  Payment,
  Platform,
  ReportDefinition,
  Schedule,
  Ticket,
  Trip,
  User,
} from "@/types";

// ---------------------------------------------------------------------------
// DADOS FICTÍCIOS — ambiente demonstrativo.
// Substituir por chamadas de API futuramente (ver src/services).
// ---------------------------------------------------------------------------

export const TODAY_LABEL = "Sábado, 26 de setembro de 2026";
export const TODAY_SHORT = "26/09/2026";

export const companies: Company[] = [
  {
    id: "c1",
    name: "Viação Manhuaçu",
    cnpj: "12.345.678/0001-90",
    anttCode: "ANTT-004512",
    contact: "(33) 3000-0001",
    email: "operacao@viacaomanhuacu.demo",
    active: true,
    linesCount: 14,
    tripsToday: 22,
    boardingsToday: 341,
    color: "var(--color-chart-1)",
  },
  {
    id: "c2",
    name: "Expresso Regional",
    cnpj: "23.456.789/0001-01",
    anttCode: "ANTT-004876",
    contact: "(33) 3000-0002",
    email: "contato@expressoregional.demo",
    active: true,
    linesCount: 11,
    tripsToday: 18,
    boardingsToday: 296,
    color: "var(--color-chart-2)",
  },
  {
    id: "c3",
    name: "Viação Regional Leste",
    cnpj: "34.567.890/0001-12",
    anttCode: "ANTT-005120",
    contact: "(33) 3000-0003",
    email: "central@regionalleste.demo",
    active: true,
    linesCount: 9,
    tripsToday: 14,
    boardingsToday: 218,
    color: "var(--color-chart-3)",
  },
  {
    id: "c4",
    name: "Empresa Federal de Transportes",
    cnpj: "45.678.901/0001-23",
    anttCode: "ANTT-005331",
    contact: "(33) 3000-0004",
    email: "terminal@federaltransportes.demo",
    active: true,
    linesCount: 8,
    tripsToday: 12,
    boardingsToday: 187,
    color: "var(--color-chart-4)",
  },
  {
    id: "c5",
    name: "Rota Serra Azul",
    cnpj: "56.789.012/0001-34",
    anttCode: "ANTT-005588",
    contact: "(33) 3000-0005",
    email: "operacao@serraazul.demo",
    active: true,
    linesCount: 6,
    tripsToday: 11,
    boardingsToday: 126,
    color: "var(--color-chart-5)",
  },
  {
    id: "c6",
    name: "Trans Matipó",
    cnpj: "67.890.123/0001-45",
    anttCode: "ANTT-005790",
    contact: "(33) 3000-0006",
    email: "adm@transmatipo.demo",
    active: true,
    linesCount: 5,
    tripsToday: 9,
    boardingsToday: 79,
    color: "var(--color-chart-2)",
  },
];

export const companyName = (id: string) =>
  companies.find((c) => c.id === id)?.name ?? "Empresa demonstrativa";

export const destinations: Destination[] = [
  {
    name: "Belo Horizonte",
    trips: 21,
    boardings: 412,
    companies: ["Expresso Regional", "Viação Manhuaçu"],
  },
  { name: "Vitória", trips: 12, boardings: 231, companies: ["Viação Manhuaçu"] },
  { name: "Governador Valadares", trips: 9, boardings: 148, companies: ["Viação Regional Leste"] },
  {
    name: "Rio de Janeiro",
    trips: 7,
    boardings: 132,
    companies: ["Empresa Federal de Transportes"],
  },
  { name: "Juiz de Fora", trips: 8, boardings: 101, companies: ["Expresso Regional"] },
  { name: "Ipatinga", trips: 6, boardings: 86, companies: ["Viação Regional Leste"] },
  { name: "Muriaé", trips: 9, boardings: 74, companies: ["Rota Serra Azul"] },
  { name: "Carangola", trips: 7, boardings: 63, companies: ["Rota Serra Azul", "Trans Matipó"] },
  { name: "Teófilo Otoni", trips: 4, boardings: 41, companies: ["Viação Regional Leste"] },
  { name: "Manhumirim", trips: 3, boardings: 29, companies: ["Trans Matipó"] },
];

export const lines: Line[] = [
  {
    id: "l1",
    code: "MHC-BH-01",
    origin: "Manhuaçu",
    destination: "Belo Horizonte",
    companyId: "c2",
    frequency: "Diária",
    departure: "06:00",
    active: true,
  },
  {
    id: "l2",
    code: "MHC-BH-02",
    origin: "Manhuaçu",
    destination: "Belo Horizonte",
    companyId: "c1",
    frequency: "Diária",
    departure: "18:30",
    active: true,
  },
  {
    id: "l3",
    code: "MHC-VIT-01",
    origin: "Manhuaçu",
    destination: "Vitória",
    companyId: "c1",
    frequency: "Diária",
    departure: "16:10",
    active: true,
  },
  {
    id: "l4",
    code: "MHC-GV-01",
    origin: "Manhuaçu",
    destination: "Governador Valadares",
    companyId: "c3",
    frequency: "Seg a Sáb",
    departure: "17:00",
    active: true,
  },
  {
    id: "l5",
    code: "MHC-RJ-01",
    origin: "Manhuaçu",
    destination: "Rio de Janeiro",
    companyId: "c4",
    frequency: "Diária",
    departure: "17:40",
    active: true,
  },
  {
    id: "l6",
    code: "MHC-JF-01",
    origin: "Manhuaçu",
    destination: "Juiz de Fora",
    companyId: "c2",
    frequency: "Seg, Qua, Sex",
    departure: "07:20",
    active: true,
  },
  {
    id: "l7",
    code: "MHC-IPA-01",
    origin: "Manhuaçu",
    destination: "Ipatinga",
    companyId: "c3",
    frequency: "Diária",
    departure: "09:15",
    active: true,
  },
  {
    id: "l8",
    code: "MHC-MUR-01",
    origin: "Manhuaçu",
    destination: "Muriaé",
    companyId: "c5",
    frequency: "Diária",
    departure: "11:30",
    active: true,
  },
  {
    id: "l9",
    code: "MHC-CAR-01",
    origin: "Manhuaçu",
    destination: "Carangola",
    companyId: "c5",
    frequency: "Diária",
    departure: "13:00",
    active: true,
  },
  {
    id: "l10",
    code: "MHC-TO-01",
    origin: "Manhuaçu",
    destination: "Teófilo Otoni",
    companyId: "c3",
    frequency: "Ter, Qui, Sáb",
    departure: "05:40",
    active: false,
  },
  {
    id: "l11",
    code: "MHC-MNM-01",
    origin: "Manhuaçu",
    destination: "Manhumirim",
    companyId: "c6",
    frequency: "Diária",
    departure: "14:20",
    active: true,
  },
];

function makeTrip(
  n: number,
  scheduled: string,
  destination: string,
  companyId: string,
  platform: string,
  boardings: number,
  status: Trip["status"],
  reconciliation: Trip["reconciliation"],
): Trip {
  const tickets = boardings + 8;
  const cancelled = Math.max(1, Math.round(boardings * 0.05));
  const gate = reconciliation === "conciliado" ? boardings : boardings - 3;
  return {
    id: `t${n}`,
    number: String(1800 + n).padStart(7, "0"),
    date: TODAY_SHORT,
    scheduled,
    realized: status === "realizada" || status === "partiu" ? scheduled : undefined,
    companyId,
    origin: "Manhuaçu",
    destination,
    platform,
    vehicle: `ABC-${1000 + n * 7}`,
    boardings,
    ticketsIssued: tickets,
    ticketsCancelled: cancelled,
    gateAccess: gate,
    companyReport: reconciliation === "divergencia" ? boardings + 7 : boardings,
    fee: Math.round(boardings * 30 * 100) / 100,
    status,
    reconciliation,
  };
}

export const trips: Trip[] = [
  makeTrip(1, "05:40", "Teófilo Otoni", "c3", "01", 28, "realizada", "conciliado"),
  makeTrip(2, "06:00", "Belo Horizonte", "c2", "03", 47, "realizada", "conciliado"),
  makeTrip(3, "07:20", "Juiz de Fora", "c2", "06", 33, "realizada", "conciliado"),
  makeTrip(4, "08:30", "Belo Horizonte", "c1", "03", 44, "realizada", "divergencia"),
  makeTrip(5, "09:15", "Ipatinga", "c3", "02", 36, "realizada", "conciliado"),
  makeTrip(6, "11:30", "Muriaé", "c5", "07", 24, "realizada", "conciliado"),
  makeTrip(7, "13:00", "Carangola", "c5", "07", 21, "realizada", "analise"),
  makeTrip(8, "14:20", "Manhumirim", "c6", "08", 18, "realizada", "conciliado"),
  makeTrip(9, "14:30", "Belo Horizonte", "c2", "03", 49, "realizada", "conciliado"),
  makeTrip(10, "16:10", "Vitória", "c1", "05", 42, "embarque", "analise"),
  makeTrip(11, "16:30", "Belo Horizonte", "c2", "03", 51, "prevista", "analise"),
  makeTrip(12, "17:00", "Governador Valadares", "c3", "02", 37, "prevista", "analise"),
  makeTrip(13, "17:40", "Rio de Janeiro", "c4", "04", 62, "prevista", "analise"),
  makeTrip(14, "18:30", "Belo Horizonte", "c2", "03", 54, "prevista", "analise"),
  makeTrip(15, "19:10", "Vitória", "c1", "05", 39, "prevista", "analise"),
  makeTrip(16, "20:00", "Rio de Janeiro", "c4", "04", 58, "prevista", "analise"),
  makeTrip(17, "21:15", "Belo Horizonte", "c1", "03", 46, "atrasada", "analise"),
  makeTrip(18, "22:40", "Governador Valadares", "c3", "02", 31, "prevista", "analise"),
];

// Viagem 0001847 — referência usada na conciliação e nos detalhes.
export const featuredTrip: Trip = {
  id: "t47",
  number: "0001847",
  date: TODAY_SHORT,
  scheduled: "18:30",
  realized: "18:34",
  companyId: "c1",
  origin: "Manhuaçu",
  destination: "Belo Horizonte",
  platform: "03",
  vehicle: "ABC-1234",
  boardings: 92,
  ticketsIssued: 100,
  ticketsCancelled: 5,
  gateAccess: 92,
  companyReport: 92,
  fee: 2760,
  status: "realizada",
  reconciliation: "conciliado",
};

export const divergentTrip: Trip = {
  id: "t48",
  number: "0001848",
  date: TODAY_SHORT,
  scheduled: "19:10",
  realized: "19:12",
  companyId: "c2",
  origin: "Manhuaçu",
  destination: "Vitória",
  platform: "05",
  vehicle: "DEF-5678",
  boardings: 91,
  ticketsIssued: 100,
  ticketsCancelled: 2,
  gateAccess: 91,
  companyReport: 98,
  fee: 2730,
  status: "realizada",
  reconciliation: "divergencia",
};

export const allTrips: Trip[] = [...trips, featuredTrip, divergentTrip];

export const nextTrip = trips.find((t) => t.status === "embarque")!;

export const upcomingTrips = trips.filter((t) =>
  ["embarque", "prevista", "atrasada"].includes(t.status),
);

export const arrivals: Arrival[] = [
  {
    id: "a1",
    time: "16:20",
    origin: "Belo Horizonte",
    companyId: "c2",
    platform: "01",
    status: "chegando",
  },
  {
    id: "a2",
    time: "16:45",
    origin: "Vitória",
    companyId: "c1",
    platform: "02",
    status: "previsto",
  },
  {
    id: "a3",
    time: "17:15",
    origin: "Governador Valadares",
    companyId: "c3",
    platform: "06",
    status: "previsto",
  },
  {
    id: "a4",
    time: "17:35",
    origin: "Muriaé",
    companyId: "c5",
    platform: "07",
    status: "atrasado",
  },
  {
    id: "a5",
    time: "18:05",
    origin: "Rio de Janeiro",
    companyId: "c4",
    platform: "04",
    status: "previsto",
  },
  {
    id: "a6",
    time: "15:40",
    origin: "Carangola",
    companyId: "c5",
    platform: "08",
    status: "chegou",
  },
];

export const schedules: Schedule[] = [
  {
    id: "s1",
    time: "05:40",
    companyId: "c3",
    destination: "Teófilo Otoni",
    platform: "01",
    frequency: "Ter, Qui, Sáb",
    situation: "sazonal",
  },
  {
    id: "s2",
    time: "06:00",
    companyId: "c2",
    destination: "Belo Horizonte",
    platform: "03",
    frequency: "Diária",
    situation: "ativo",
  },
  {
    id: "s3",
    time: "07:20",
    companyId: "c2",
    destination: "Juiz de Fora",
    platform: "06",
    frequency: "Seg, Qua, Sex",
    situation: "ativo",
  },
  {
    id: "s4",
    time: "08:30",
    companyId: "c1",
    destination: "Belo Horizonte",
    platform: "03",
    frequency: "Diária",
    situation: "ativo",
  },
  {
    id: "s5",
    time: "09:15",
    companyId: "c3",
    destination: "Ipatinga",
    platform: "02",
    frequency: "Diária",
    situation: "ativo",
  },
  {
    id: "s6",
    time: "11:30",
    companyId: "c5",
    destination: "Muriaé",
    platform: "07",
    frequency: "Diária",
    situation: "ativo",
  },
  {
    id: "s7",
    time: "13:00",
    companyId: "c5",
    destination: "Carangola",
    platform: "07",
    frequency: "Diária",
    situation: "ativo",
  },
  {
    id: "s8",
    time: "14:20",
    companyId: "c6",
    destination: "Manhumirim",
    platform: "08",
    frequency: "Diária",
    situation: "ativo",
  },
  {
    id: "s9",
    time: "16:10",
    companyId: "c1",
    destination: "Vitória",
    platform: "05",
    frequency: "Diária",
    situation: "ativo",
  },
  {
    id: "s10",
    time: "17:00",
    companyId: "c3",
    destination: "Governador Valadares",
    platform: "02",
    frequency: "Seg a Sáb",
    situation: "ativo",
  },
  {
    id: "s11",
    time: "17:40",
    companyId: "c4",
    destination: "Rio de Janeiro",
    platform: "04",
    frequency: "Diária",
    situation: "ativo",
  },
  {
    id: "s12",
    time: "18:30",
    companyId: "c2",
    destination: "Belo Horizonte",
    platform: "03",
    frequency: "Diária",
    situation: "ativo",
  },
  {
    id: "s13",
    time: "20:00",
    companyId: "c4",
    destination: "Rio de Janeiro",
    platform: "04",
    frequency: "Diária",
    situation: "ativo",
  },
  {
    id: "s14",
    time: "22:40",
    companyId: "c3",
    destination: "Governador Valadares",
    platform: "02",
    frequency: "Diária",
    situation: "suspenso",
  },
];

export const platforms: Platform[] = [
  { id: "p1", number: "01", status: "disponivel" },
  { id: "p2", number: "02", status: "ocupada", label: "17:00 — Governador Valadares" },
  { id: "p3", number: "03", status: "ocupada", label: "18:30 — Belo Horizonte" },
  { id: "p4", number: "04", status: "ocupada", label: "17:40 — Rio de Janeiro" },
  { id: "p5", number: "05", status: "ocupada", label: "16:10 — Vitória" },
  { id: "p6", number: "06", status: "disponivel" },
  { id: "p7", number: "07", status: "manutencao", label: "Manutenção preventiva" },
  { id: "p8", number: "08", status: "disponivel" },
];

const ticketStatuses: Ticket["status"][] = [
  "utilizada",
  "utilizada",
  "emitida",
  "cancelada",
  "nao-utilizada",
];

export const tickets: Ticket[] = Array.from({ length: 28 }, (_, i) => {
  const trip = allTrips[i % allTrips.length];
  return {
    id: `tk${i + 1}`,
    code: `TKT-${182700 + i * 13}`,
    tripId: trip.id,
    companyId: trip.companyId,
    origin: "Manhuaçu",
    destination: trip.destination,
    status: ticketStatuses[i % ticketStatuses.length],
    issuedAt: `${TODAY_SHORT} ${String(6 + (i % 14)).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}`,
  };
});

export const boardingEvents: BoardingEvent[] = Array.from({ length: 22 }, (_, i) => {
  const minute = 58 - i * 2;
  const hour = minute < 0 ? 14 : 15;
  return {
    id: `be${i + 1}`,
    time: `${hour}:${String(((minute % 60) + 60) % 60).padStart(2, "0")}:${String((42 + i * 3) % 60).padStart(2, "0")}`,
    device: `Catraca 0${(i % 4) + 1}`,
    tripCode: `TRIP-${98471 - (i % 5)}`,
    ticketCode: `TKT-${182736 + i * 11}`,
    event: i % 11 === 0 ? "Negado" : i % 7 === 0 ? "Reentrada" : "Acesso",
    status: i % 11 === 0 ? "Rejeitado" : i % 9 === 0 ? "Pendente" : "Confirmado",
  };
});

export const fees: Fee[] = [
  {
    id: "f1",
    number: "TRB-2026-00874",
    companyId: "c1",
    competence: "Agosto/2026",
    amount: 8450,
    dueDate: "15/09/2026",
    status: "pago",
  },
  {
    id: "f2",
    number: "TRB-2026-00875",
    companyId: "c2",
    competence: "Agosto/2026",
    amount: 6870,
    dueDate: "15/09/2026",
    status: "pendente",
  },
  {
    id: "f3",
    number: "TRB-2026-00876",
    companyId: "c4",
    competence: "Agosto/2026",
    amount: 4920,
    dueDate: "15/09/2026",
    status: "inadimplente",
  },
  {
    id: "f4",
    number: "TRB-2026-00877",
    companyId: "c3",
    competence: "Agosto/2026",
    amount: 5310,
    dueDate: "15/09/2026",
    status: "pago",
  },
  {
    id: "f5",
    number: "TRB-2026-00878",
    companyId: "c5",
    competence: "Agosto/2026",
    amount: 3480,
    dueDate: "15/09/2026",
    status: "pendente",
  },
  {
    id: "f6",
    number: "TRB-2026-00879",
    companyId: "c6",
    competence: "Agosto/2026",
    amount: 2190,
    dueDate: "15/09/2026",
    status: "inadimplente",
  },
  {
    id: "f7",
    number: "TRB-2026-00880",
    companyId: "c1",
    competence: "Setembro/2026",
    amount: 8890,
    dueDate: "15/10/2026",
    status: "pendente",
  },
  {
    id: "f8",
    number: "TRB-2026-00881",
    companyId: "c2",
    competence: "Setembro/2026",
    amount: 7120,
    dueDate: "15/10/2026",
    status: "pendente",
  },
  {
    id: "f9",
    number: "TRB-2026-00882",
    companyId: "c3",
    competence: "Setembro/2026",
    amount: 5580,
    dueDate: "15/10/2026",
    status: "pago",
  },
  {
    id: "f10",
    number: "TRB-2026-00883",
    companyId: "c4",
    competence: "Setembro/2026",
    amount: 5260,
    dueDate: "15/10/2026",
    status: "inadimplente",
  },
];

export const payments: Payment[] = [
  {
    id: "pay1",
    date: "12/09/2026",
    companyId: "c1",
    feeNumber: "TRB-2026-00874",
    amount: 8450,
    paidAt: "12/09/2026",
    status: "confirmado",
  },
  {
    id: "pay2",
    date: "14/09/2026",
    companyId: "c3",
    feeNumber: "TRB-2026-00877",
    amount: 5310,
    paidAt: "14/09/2026",
    status: "confirmado",
  },
  {
    id: "pay3",
    date: "22/09/2026",
    companyId: "c3",
    feeNumber: "TRB-2026-00882",
    amount: 5580,
    paidAt: "22/09/2026",
    status: "confirmado",
  },
  {
    id: "pay4",
    date: "25/09/2026",
    companyId: "c2",
    feeNumber: "TRB-2026-00875",
    amount: 3400,
    paidAt: "25/09/2026",
    status: "processando",
  },
  {
    id: "pay5",
    date: "25/09/2026",
    companyId: "c5",
    feeNumber: "TRB-2026-00878",
    amount: 1740,
    paidAt: "25/09/2026",
    status: "processando",
  },
];

export const discrepancies: Discrepancy[] = [
  {
    id: "d1",
    tripNumber: "0001848",
    companyId: "c2",
    tickets: 100,
    gate: 91,
    report: 98,
    difference: 7,
    situation: "em-analise",
    note: "Diferença entre relatório da empresa e acessos registrados.",
  },
  {
    id: "d2",
    tripNumber: "0001812",
    companyId: "c1",
    tickets: 88,
    gate: 81,
    report: 84,
    difference: 3,
    situation: "necessita-conferencia",
    note: "Informação inconsistente no horário de fechamento.",
  },
  {
    id: "d3",
    tripNumber: "0001804",
    companyId: "c4",
    tickets: 62,
    gate: 59,
    report: 62,
    difference: 3,
    situation: "em-analise",
    note: "Acessos pendentes de sincronização da catraca 03.",
  },
  {
    id: "d4",
    tripNumber: "0001799",
    companyId: "c3",
    tickets: 44,
    gate: 44,
    report: 46,
    difference: 2,
    situation: "conferido",
    note: "Conferência concluída com ajuste de registro.",
  },
  {
    id: "d5",
    tripNumber: "0001786",
    companyId: "c5",
    tickets: 31,
    gate: 28,
    report: 31,
    difference: 3,
    situation: "necessita-conferencia",
    note: "Aguardando envio complementar da empresa.",
  },
];

export const alerts: AlertItem[] = [
  {
    id: "al1",
    kind: "warning",
    text: "Divergência identificada na viagem 08:30 — Belo Horizonte",
    time: "há 12 min",
  },
  {
    id: "al2",
    kind: "danger",
    text: "Taxa vencida da empresa Empresa Federal de Transportes",
    time: "há 38 min",
  },
  {
    id: "al3",
    kind: "info",
    text: "Plataforma 04 alterada para a viagem das 17:40",
    time: "há 52 min",
  },
  { id: "al4", kind: "success", text: "Viagem 14:30 concluída", time: "há 1 h" },
  {
    id: "al5",
    kind: "warning",
    text: "Catraca 03 com eventos pendentes de sincronização",
    time: "há 2 h",
  },
];

export const notifications = [
  {
    id: "n1",
    title: "Nova divergência identificada",
    detail: "Viagem 0001848 — Vitória",
    time: "há 8 min",
  },
  {
    id: "n2",
    title: "Viagem 0001847 concluída",
    detail: "Belo Horizonte — 18:34",
    time: "há 25 min",
  },
  { id: "n3", title: "Taxa vencida", detail: "TRB-2026-00876", time: "há 1 h" },
  { id: "n4", title: "Plataforma alterada", detail: "Plataforma 03 → 05", time: "há 2 h" },
];

export const users: User[] = [
  {
    id: "u1",
    name: "Carlos Henrique",
    email: "carlos.henrique@manhuacu.demo",
    profile: "Gestor do Terminal",
    lastAccess: "26/09/2026 15:42",
    active: true,
  },
  {
    id: "u2",
    name: "Maria Souza",
    email: "maria.souza@manhuacu.demo",
    profile: "Financeiro",
    lastAccess: "26/09/2026 14:21",
    active: true,
  },
  {
    id: "u3",
    name: "Rafael Lima",
    email: "rafael.lima@manhuacu.demo",
    profile: "Operacional",
    lastAccess: "26/09/2026 11:08",
    active: true,
  },
  {
    id: "u4",
    name: "Ana Paula Reis",
    email: "ana.reis@manhuacu.demo",
    profile: "Auditor",
    lastAccess: "25/09/2026 17:56",
    active: true,
  },
  {
    id: "u5",
    name: "Diego Martins",
    email: "diego.martins@manhuacu.demo",
    profile: "Administrador",
    lastAccess: "26/09/2026 09:33",
    active: true,
  },
  {
    id: "u6",
    name: "Juliana Castro",
    email: "juliana.castro@manhuacu.demo",
    profile: "Consulta",
    lastAccess: "18/09/2026 10:12",
    active: false,
  },
];

export const auditLogs: AuditLog[] = [
  {
    id: "g1",
    datetime: "26/09/2026 14:32",
    user: "Carlos Henrique",
    action: "Alteração",
    module: "Viagens",
    description: "Alteração de plataforma",
  },
  {
    id: "g2",
    datetime: "26/09/2026 14:21",
    user: "Maria Souza",
    action: "Consulta",
    module: "Financeiro",
    description: "Visualização de taxa",
  },
  {
    id: "g3",
    datetime: "26/09/2026 13:54",
    user: "Carlos Henrique",
    action: "Análise",
    module: "Conciliação",
    description: "Divergência analisada",
  },
  {
    id: "g4",
    datetime: "26/09/2026 12:40",
    user: "Rafael Lima",
    action: "Cadastro",
    module: "Horários",
    description: "Novo horário demonstrativo",
  },
  {
    id: "g5",
    datetime: "26/09/2026 10:15",
    user: "Ana Paula Reis",
    action: "Exportação",
    module: "Relatórios",
    description: "Relatório gerencial visualizado",
  },
  {
    id: "g6",
    datetime: "25/09/2026 18:02",
    user: "Diego Martins",
    action: "Configuração",
    module: "Configurações",
    description: "Perfil de acesso atualizado",
  },
];

export const integrations: Integration[] = [
  {
    id: "i1",
    name: "ANTT",
    description:
      "Empresas, linhas e horários interestaduais (SIGMA) e passagens mensais (MONITRIIP), pelo Portal de Dados Abertos.",
    status: "Importação mensal",
    badge: "Conectado",
  },
  {
    id: "i5",
    name: "DER-MG",
    description: "Linhas e horários intermunicipais de Minas Gerais.",
    status: "Importação mensal",
    badge: "Conectado",
  },
  {
    id: "i2",
    name: "Empresas",
    description: "Envio de vendas, cancelamentos e embarques no padrão MONITRIIP da ANTT.",
    status: "Preparado para integração",
    badge: "Não conectado",
  },
  {
    id: "i3",
    name: "Sistema Municipal",
    description: "Recebimento de taxas, vencimentos e pagamentos.",
    status: "Preparado para integração",
    badge: "Não conectado",
  },
  {
    id: "i4",
    name: "Catracas",
    description: "Recebimento de eventos de acesso e embarque (leitura do QR Code do BP-e).",
    status: "Preparado para integração",
    badge: "Não conectado",
  },
];

export const boardingsLast7Days = [
  { day: "20/09", embarques: 1042 },
  { day: "21/09", embarques: 1184 },
  { day: "22/09", embarques: 1096 },
  { day: "23/09", embarques: 1231 },
  { day: "24/09", embarques: 1158 },
  { day: "25/09", embarques: 1322 },
  { day: "26/09", embarques: 1247 },
];

export const boardingsByCompany = companies.map((c) => ({
  empresa: c.name.split(" ").slice(0, 2).join(" "),
  embarques: c.boardingsToday,
  fill: c.color,
}));

export const dashboardStats = {
  tripsToday: 86,
  boardingsToday: 1247,
  ticketsToday: 1386,
  activeCompanies: 12,
  pendingFees: 48750,
  overdue: 12380,
  reconciled: 1182,
  inAnalysis: 47,
  divergences: 18,
};

export const financeStats = {
  issued: 532800,
  paid: 461200,
  pending: 38400,
  overdue: 33200,
};

export const ticketStats = {
  issued: 1386,
  cancelled: 84,
  used: 1201,
  unused: 101,
};

export const boardingStats = {
  today: 1247,
  week: 8426,
  month: 31842,
};

export const gateStats = {
  accessesToday: 1201,
  onlineGates: 4,
  lastAccess: "15:58:42",
  pendingEvents: 3,
};

export const gates = [
  { id: "ct1", name: "Catraca 01", status: "online" as const, accesses: 312 },
  { id: "ct2", name: "Catraca 02", status: "online" as const, accesses: 341 },
  { id: "ct3", name: "Catraca 03", status: "online" as const, accesses: 288 },
  { id: "ct4", name: "Catraca 04", status: "online" as const, accesses: 260 },
];

export const reportDefinitions: ReportDefinition[] = [
  {
    id: "embarques",
    title: "Relatório de Embarques",
    description: "Embarques por viagem, empresa e destino.",
    icon: "chart",
  },
  {
    id: "viagens",
    title: "Relatório de Viagens",
    description: "Viagens previstas, realizadas e canceladas.",
    icon: "bus",
  },
  {
    id: "empresas",
    title: "Relatório por Empresa",
    description: "Desempenho operacional de cada empresa.",
    icon: "building",
  },
  {
    id: "financeiro",
    title: "Relatório Financeiro",
    description: "Taxas, pagamentos e pendências do período.",
    icon: "money",
  },
  {
    id: "divergencias",
    title: "Relatório de Divergências",
    description: "Diferenças entre fontes de informação.",
    icon: "search",
  },
  {
    id: "gerencial",
    title: "Relatório Gerencial",
    description: "Visão consolidada do terminal no período.",
    icon: "clipboard",
  },
  {
    id: "operacional",
    title: "Relatório Operacional",
    description: "Plataformas, horários e ocorrências.",
    icon: "monitor",
  },
];

export const currentUser = {
  name: "Carlos Henrique",
  role: "Gestor do Terminal",
  profile: "Administrador",
  initials: "CH",
};

export const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const num = (value: number) => value.toLocaleString("pt-BR");
