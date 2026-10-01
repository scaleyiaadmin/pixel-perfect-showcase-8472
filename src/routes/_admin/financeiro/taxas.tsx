import { createFileRoute } from "@tanstack/react-router";
import { CircleDollarSign, CheckCircle2, Clock, TrendingDown } from "lucide-react";
import {
  DataTable,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
  feeTone,
  type Column,
  DemoBanner,
} from "@/components/common";
import { brl, companyName, fees, financeStats } from "@/data/mock";
import type { Fee } from "@/types";

export const Route = createFileRoute("/_admin/financeiro/taxas")({
  head: () => ({
    meta: [
      { title: "Taxas — SisRodov Manhuaçu" },
      {
        name: "description",
        content:
          "Taxas do Terminal Rodoviário de Manhuaçu por empresa, competência, valor e vencimento.",
      },
      { property: "og:title", content: "Taxas — SisRodov Manhuaçu" },
      {
        property: "og:description",
        content: "Taxas por empresa, competência, valor e vencimento.",
      },
    ],
  }),
  component: FeesPage,
});

export const feeColumns: Column<Fee>[] = [
  {
    key: "number",
    header: "Número",
    render: (f) => <span className="tabular font-semibold">{f.number}</span>,
  },
  { key: "company", header: "Empresa", render: (f) => companyName(f.companyId) },
  { key: "comp", header: "Competência", render: (f) => f.competence },
  {
    key: "amount",
    header: "Valor",
    align: "right",
    render: (f) => <span className="tabular">{brl(f.amount)}</span>,
  },
  { key: "due", header: "Vencimento", render: (f) => <span className="tabular">{f.dueDate}</span> },
  {
    key: "status",
    header: "Status",
    render: (f) => (
      <StatusBadge tone={feeTone[f.status].tone}>{feeTone[f.status].label}</StatusBadge>
    ),
  },
];

function FeesPage() {
  return (
    <>
      <PageHeader
        title="Financeiro · Taxas"
        subtitle="Taxas do terminal recebidas do sistema municipal"
      />
      <DemoBanner reason="aguardando integração com o sistema municipal" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Taxas emitidas" value={brl(financeStats.issued)} icon={CircleDollarSign} />
        <StatCard label="Pagas" value={brl(financeStats.paid)} icon={CheckCircle2} tone="success" />
        <StatCard label="Pendentes" value={brl(financeStats.pending)} icon={Clock} tone="warning" />
        <StatCard
          label="Inadimplentes"
          value={brl(financeStats.overdue)}
          icon={TrendingDown}
          tone="danger"
        />
      </div>

      <div className="mt-6">
        <SectionCard title="Taxas do período" bodyClassName="p-0">
          <DataTable columns={feeColumns} rows={fees} />
        </SectionCard>
        <p className="mt-3 text-xs text-muted-foreground italic">
          O SisRodov não emite taxas. As informações financeiras apresentadas nesta versão são
          demonstrativas.
        </p>
      </div>
    </>
  );
}
