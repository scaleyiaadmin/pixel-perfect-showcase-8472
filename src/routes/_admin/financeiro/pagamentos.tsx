import { createFileRoute } from "@tanstack/react-router";
import {
  DataTable,
  PageHeader,
  SectionCard,
  StatusBadge,
  type Column,
  DemoBanner,
} from "@/components/common";
import { brl, companyName, payments } from "@/data/mock";
import type { Payment } from "@/types";

export const Route = createFileRoute("/_admin/financeiro/pagamentos")({
  head: () => ({
    meta: [
      { title: "Pagamentos — SisRodov Manhuaçu" },
      {
        name: "description",
        content:
          "Pagamentos de taxas do Terminal Rodoviário de Manhuaçu informados pelo sistema municipal.",
      },
      { property: "og:title", content: "Pagamentos — SisRodov Manhuaçu" },
      { property: "og:description", content: "Pagamentos de taxas por empresa e data." },
    ],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const columns: Column<Payment>[] = [
    { key: "date", header: "Data", render: (p) => <span className="tabular">{p.date}</span> },
    { key: "company", header: "Empresa", render: (p) => companyName(p.companyId) },
    { key: "fee", header: "Taxa", render: (p) => <span className="tabular">{p.feeNumber}</span> },
    {
      key: "amount",
      header: "Valor",
      align: "right",
      render: (p) => <span className="tabular">{brl(p.amount)}</span>,
    },
    {
      key: "paid",
      header: "Data pagamento",
      render: (p) => <span className="tabular">{p.paidAt}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (p) => (
        <StatusBadge tone={p.status === "confirmado" ? "success" : "info"}>
          {p.status === "confirmado" ? "Confirmado" : "Processando"}
        </StatusBadge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Financeiro · Pagamentos"
        subtitle="Pagamentos informados pelo sistema municipal"
      />
      <DemoBanner reason="aguardando integração com o sistema municipal" />
      <SectionCard bodyClassName="p-0">
        <DataTable columns={columns} rows={payments} />
      </SectionCard>
      <p className="mt-3 text-xs text-muted-foreground italic">
        As informações financeiras apresentadas nesta versão são demonstrativas.
      </p>
    </>
  );
}
