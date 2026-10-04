import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HandCoins } from "lucide-react";
import {
  DataTable,
  PageHeader,
  QueryState,
  SectionCard,
  SourceNote,
  StatCard,
  StatusBadge,
  type Column,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { brl, num } from "@/lib/format";
import { usePermissao } from "@/services/acesso";
import { useEmpresas } from "@/services/dados-publicos";
import {
  dataISO,
  mapaEmpresas,
  usePendencias,
  type ConciliacaoViagem,
  type TaxaComSaldo,
} from "@/services/financeiro";
import { AvisoConfiguracaoTaxa, RegistrarPagamentoDialog, taxaColumns } from "./taxas";

export const Route = createFileRoute("/_admin/financeiro/pendencias")({
  head: () => ({
    meta: [
      { title: "Pendências — SisRodov Manhuaçu" },
      {
        name: "description",
        content:
          "Taxas em aberto e divergências que afetam a cobrança das empresas do Terminal Rodoviário de Manhuaçu.",
      },
      { property: "og:title", content: "Pendências — SisRodov Manhuaçu" },
      { property: "og:description", content: "Taxas em aberto e divergências a conferir." },
    ],
  }),
  component: PendingPage,
});

function PendingPage() {
  const empresas = useEmpresas();
  const empresa = mapaEmpresas(empresas.data);
  const { taxas, divergencias } = usePendencias();
  const [pagar, setPagar] = useState<TaxaComSaldo | null>(null);
  const { editar } = usePermissao("financeiro");

  const rows = taxas.data ?? [];
  const total = rows.reduce((s, t) => s + t.saldo, 0);

  const taxaCols = taxaColumns(
    (id) => empresa(id),
    editar
      ? (t) => (
          <Button variant="outline" size="sm" onClick={() => setPagar(t)}>
            <HandCoins className="h-3.5 w-3.5" /> Pagamento
          </Button>
        )
      : undefined,
  );

  const divCols: Column<ConciliacaoViagem & { id: string }>[] = [
    {
      key: "date",
      header: "Data",
      render: (d) => <span className="tabular">{dataISO(d.data)}</span>,
    },
    {
      key: "trip",
      header: "Viagem",
      render: (d) => (
        <span>
          <span className="tabular font-semibold">{d.numero || "—"}</span>
          <span className="block text-xs text-muted-foreground">
            {d.origem} → {d.destino}
          </span>
        </span>
      ),
    },
    { key: "company", header: "Empresa", render: (d) => empresa(d.empresa_id) },
    {
      key: "gate",
      header: "Catraca",
      align: "right",
      render: (d) => <span className="tabular">{num(d.acessos)}</span>,
    },
    {
      key: "tickets",
      header: "Bilhetes",
      align: "right",
      render: (d) => <span className="tabular">{num(d.bilhetes)}</span>,
    },
    {
      key: "report",
      header: "Relato",
      align: "right",
      render: (d) => <span className="tabular">{d.relato === null ? "—" : num(d.relato)}</span>,
    },
    {
      key: "diff",
      header: "Diferença",
      align: "right",
      render: (d) => <span className="tabular font-semibold">{num(d.diferenca)}</span>,
    },
    {
      key: "sit",
      header: "Situação",
      render: (d) =>
        d.situacao_conferencia === "necessita-conferencia" ? (
          <StatusBadge tone="info">Necessita conferência</StatusBadge>
        ) : (
          <StatusBadge tone="warning">Em análise</StatusBadge>
        ),
    },
  ];

  const divRows = (divergencias.data ?? []).map((d) => ({ ...d, id: d.viagem_id }));

  return (
    <>
      <PageHeader
        title="Financeiro · Pendências"
        subtitle="Taxas em aberto e divergências que podem alterar a cobrança"
      />
      <AvisoConfiguracaoTaxa />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total em aberto" value={brl(total)} tone="warning" />
        <StatCard label="Taxas em aberto" value={rows.length} tone="neutral" />
        <StatCard label="Divergências a conferir" value={divRows.length} tone="danger" />
      </div>

      <div className="mt-6">
        <SectionCard title="Taxas em aberto" bodyClassName="p-0">
          <QueryState isLoading={taxas.isLoading} error={taxas.error} />
          {taxas.data && (
            <DataTable
              columns={taxaCols}
              rows={rows}
              emptyMessage="Nenhuma taxa em aberto. As taxas são geradas no fechamento da competência, a partir dos embarques confirmados na catraca."
            />
          )}
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard
          title="Divergências que afetam a cobrança"
          description="A taxa é calculada pelos acessos na catraca; viagens com diferença entre as fontes ainda não conferidas."
          actions={
            <Button asChild variant="outline" size="sm">
              <Link to="/conciliacao">Abrir conciliação</Link>
            </Button>
          }
          bodyClassName="p-0"
        >
          <QueryState isLoading={divergencias.isLoading} error={divergencias.error} />
          {divergencias.data && (
            <DataTable
              columns={divCols}
              rows={divRows}
              emptyMessage="Nenhuma divergência pendente. As fontes são cruzadas quando chegam bilhetes e relatos das empresas e acessos das catracas pela integração."
            />
          )}
        </SectionCard>
        <SourceNote>
          O sistema apenas apresenta as diferenças entre as fontes, sem qualquer julgamento.
        </SourceNote>
      </div>

      <RegistrarPagamentoDialog
        taxa={pagar}
        open={!!pagar}
        onOpenChange={(o) => !o && setPagar(null)}
      />
    </>
  );
}
