import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DataTable, FilterBar, PageHeader, SectionCard, StatusBadge, type Column } from "@/components/common";
import { companyName, lines } from "@/data/mock";
import type { Line } from "@/types";

export const Route = createFileRoute("/_admin/operacao/linhas")({
  head: () => ({
    meta: [
      { title: "Linhas — SisRodov Manhuaçu" },
      {
        name: "description",
        content: "Cadastro das linhas operadas a partir do Terminal Rodoviário de Manhuaçu.",
      },
      { property: "og:title", content: "Linhas — SisRodov Manhuaçu" },
      { property: "og:description", content: "Linhas, códigos, frequências e empresas operadoras." },
    ],
  }),
  component: LinesPage,
});

function LinesPage() {
  const [search, setSearch] = useState("");
  const rows = useMemo(
    () =>
      lines.filter((l) => {
        const q = search.trim().toLowerCase();
        return !q || `${l.code} ${l.destination} ${companyName(l.companyId)}`.toLowerCase().includes(q);
      }),
    [search],
  );

  const columns: Column<Line>[] = [
    { key: "code", header: "Código", render: (l) => <span className="tabular font-semibold">{l.code}</span> },
    { key: "origin", header: "Origem", render: (l) => l.origin },
    { key: "dest", header: "Destino", render: (l) => l.destination },
    { key: "company", header: "Empresa", render: (l) => <span className="text-muted-foreground">{companyName(l.companyId)}</span> },
    { key: "time", header: "Horário", render: (l) => <span className="tabular">{l.departure}</span> },
    { key: "freq", header: "Frequência", render: (l) => l.frequency },
    {
      key: "status",
      header: "Status",
      render: (l) => <StatusBadge tone={l.active ? "success" : "neutral"}>{l.active ? "Ativa" : "Inativa"}</StatusBadge>,
    },
  ];

  return (
    <>
      <PageHeader title="Linhas" subtitle="Linhas cadastradas e suas empresas operadoras" />
      <FilterBar search={search} onSearch={setSearch} placeholder="Pesquisar linha, destino ou empresa..." />
      <SectionCard bodyClassName="p-0">
        <DataTable columns={columns} rows={rows} />
      </SectionCard>
    </>
  );
}
