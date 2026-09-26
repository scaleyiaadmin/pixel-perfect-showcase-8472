import { createFileRoute } from "@tanstack/react-router";
import { DataTable, PageHeader, SectionCard, StatCard, type Column } from "@/components/common";
import { brl, fees } from "@/data/mock";
import { feeColumns } from "./taxas";
import type { Fee } from "@/types";

export const Route = createFileRoute("/_admin/financeiro/pendencias")({
  head: () => ({
    meta: [
      { title: "Pendências — SisRodov Manhuaçu" },
      {
        name: "description",
        content: "Taxas pendentes de pagamento das empresas que operam no Terminal Rodoviário de Manhuaçu.",
      },
      { property: "og:title", content: "Pendências — SisRodov Manhuaçu" },
      { property: "og:description", content: "Taxas pendentes de pagamento no período." },
    ],
  }),
  component: PendingPage,
});

function PendingPage() {
  const rows: Fee[] = fees.filter((f) => f.status === "pendente");
  const total = rows.reduce((s, f) => s + f.amount, 0);

  return (
    <>
      <PageHeader title="Financeiro · Pendências" subtitle="Taxas aguardando pagamento" />
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Total pendente" value={brl(total)} tone="warning" />
        <StatCard label="Quantidade de taxas" value={rows.length} tone="neutral" />
      </div>
      <div className="mt-6">
        <SectionCard bodyClassName="p-0">
          <DataTable columns={feeColumns as Column<Fee>[]} rows={rows} emptyMessage="Nenhuma pendência no período." />
        </SectionCard>
      </div>
    </>
  );
}
