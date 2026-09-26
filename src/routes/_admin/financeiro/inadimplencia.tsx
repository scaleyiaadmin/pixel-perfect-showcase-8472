import { createFileRoute } from "@tanstack/react-router";
import { DataTable, PageHeader, SectionCard, StatCard, StatusBadge, type Column } from "@/components/common";
import { brl, companies, fees } from "@/data/mock";

export const Route = createFileRoute("/_admin/financeiro/inadimplencia")({
  head: () => ({
    meta: [
      { title: "Inadimplência — SisRodov Manhuaçu" },
      {
        name: "description",
        content: "Valores vencidos de taxas do Terminal Rodoviário de Manhuaçu por empresa.",
      },
      { property: "og:title", content: "Inadimplência — SisRodov Manhuaçu" },
      { property: "og:description", content: "Valores vencidos de taxas por empresa, em linguagem neutra." },
    ],
  }),
  component: OverduePage,
});

interface Row {
  id: string;
  company: string;
  amount: number;
  count: number;
  lastDue: string;
  days: number;
}

function OverduePage() {
  const rows: Row[] = companies
    .map((c) => {
      const list = fees.filter((f) => f.companyId === c.id && f.status === "inadimplente");
      return {
        id: c.id,
        company: c.name,
        amount: list.reduce((s, f) => s + f.amount, 0),
        count: list.length,
        lastDue: list[list.length - 1]?.dueDate ?? "—",
        days: list.length ? 11 + list.length * 7 : 0,
      };
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => b.amount - a.amount);

  const total = rows.reduce((s, r) => s + r.amount, 0);

  const columns: Column<Row>[] = [
    { key: "company", header: "Empresa", render: (r) => <span className="font-semibold">{r.company}</span> },
    { key: "amount", header: "Valor vencido", align: "right", render: (r) => <span className="tabular">{brl(r.amount)}</span> },
    { key: "count", header: "Quantidade de taxas", align: "right", render: (r) => <span className="tabular">{r.count}</span> },
    { key: "due", header: "Maior vencimento", render: (r) => <span className="tabular">{r.lastDue}</span> },
    { key: "days", header: "Dias em atraso", align: "right", render: (r) => <span className="tabular">{r.days}</span> },
    { key: "status", header: "Situação", render: () => <StatusBadge tone="danger">Em aberto</StatusBadge> },
  ];

  return (
    <>
      <PageHeader title="Financeiro · Inadimplência" subtitle="Valores vencidos informados pelo sistema municipal" />
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Total vencido" value={brl(total)} tone="danger" />
        <StatCard label="Empresas com valores em aberto" value={rows.length} tone="neutral" />
      </div>
      <div className="mt-6">
        <SectionCard bodyClassName="p-0">
          <DataTable columns={columns} rows={rows} emptyMessage="Nenhum valor vencido no período." />
        </SectionCard>
        <p className="mt-3 text-xs text-muted-foreground italic">
          Relação apresentada apenas por valores, sem qualquer julgamento sobre as empresas. Informações
          demonstrativas.
        </p>
      </div>
    </>
  );
}
