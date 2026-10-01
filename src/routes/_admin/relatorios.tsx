import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  BarChart3,
  Building2,
  Bus,
  ClipboardList,
  MonitorPlay,
  Printer,
  Search,
  Wallet,
} from "lucide-react";
import {
  DataTable,
  PageHeader,
  SectionCard,
  StatusBadge,
  type Column,
  DemoBanner,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { PrefeituraLogo, RodoviariaLogo } from "@/components/brand/Logos";
import {
  allTrips,
  brl,
  companyName,
  dashboardStats,
  discrepancies,
  financeStats,
  num,
  reportDefinitions,
} from "@/data/mock";
import type { Trip } from "@/types";

export const Route = createFileRoute("/_admin/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — SisRodov Manhuaçu" },
      {
        name: "description",
        content:
          "Central de relatórios do Terminal Rodoviário de Manhuaçu: embarques, viagens, financeiro e divergências.",
      },
      { property: "og:title", content: "Relatórios — SisRodov Manhuaçu" },
      { property: "og:description", content: "Relatórios gerenciais e operacionais do terminal." },
    ],
  }),
  component: ReportsPage,
});

const icons = {
  chart: BarChart3,
  bus: Bus,
  building: Building2,
  money: Wallet,
  search: Search,
  clipboard: ClipboardList,
  monitor: MonitorPlay,
} as const;

function ReportsPage() {
  const [preview, setPreview] = useState<string | null>(null);

  if (preview) {
    return <ReportPreview id={preview} onBack={() => setPreview(null)} />;
  }

  return (
    <>
      <PageHeader title="Relatórios" subtitle="Central de relatórios institucionais do terminal" />
      <DemoBanner />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reportDefinitions.map((r) => {
          const Icon = icons[r.icon as keyof typeof icons] ?? BarChart3;
          return (
            <SectionCard key={r.id}>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-3 font-display text-base font-bold">{r.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setPreview(r.id)}>
                Visualizar
              </Button>
            </SectionCard>
          );
        })}
      </div>
    </>
  );
}

function ReportPreview({ id, onBack }: { id: string; onBack: () => void }) {
  const def = reportDefinitions.find((r) => r.id === id)!;

  const tripColumns: Column<Trip>[] = [
    { key: "date", header: "Data", render: (t) => <span className="tabular">{t.date}</span> },
    {
      key: "time",
      header: "Horário",
      render: (t) => <span className="tabular">{t.scheduled}</span>,
    },
    { key: "company", header: "Empresa", render: (t) => companyName(t.companyId) },
    { key: "dest", header: "Destino", render: (t) => t.destination },
    { key: "trip", header: "Viagem", render: (t) => <span className="tabular">{t.number}</span> },
    {
      key: "boardings",
      header: "Embarques",
      align: "right",
      render: (t) => <span className="tabular">{t.boardings}</span>,
    },
    { key: "source", header: "Fonte", render: () => "Sistema da empresa" },
    {
      key: "sit",
      header: "Situação",
      render: (t) => <span className="capitalize">{t.reconciliation}</span>,
    },
  ];

  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Voltar para relatórios
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Imprimir relatório
        </Button>
      </div>

      <div className="surface-card p-8">
        <header className="flex flex-wrap items-center justify-between gap-6 border-b border-border pb-6">
          <PrefeituraLogo />
          <div className="text-center">
            <p className="font-display text-lg font-extrabold tracking-[0.12em] uppercase">
              SisRodov Manhuaçu
            </p>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">
              Sistema Municipal de Gestão e Controle do Terminal Rodoviário
            </p>
          </div>
          <RodoviariaLogo />
        </header>

        <div className="py-6 text-center">
          <h1 className="font-display text-xl font-bold tracking-wide uppercase">{def.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Período: 01/09/2026 a 30/09/2026</p>
        </div>

        <div className="grid gap-4 border-y border-border py-6 sm:grid-cols-3 lg:grid-cols-5">
          <Metric label="Viagens" value={String(dashboardStats.tripsToday)} />
          <Metric label="Embarques" value={num(dashboardStats.boardingsToday)} />
          <Metric label="Empresas" value={String(dashboardStats.activeCompanies)} />
          <Metric label="Passagens" value={num(dashboardStats.ticketsToday)} />
          <Metric label="Conciliações" value={num(dashboardStats.reconciled)} />
          <Metric label="Divergências" value={String(dashboardStats.divergences)} />
          <Metric label="Taxas" value={brl(financeStats.issued)} />
          <Metric label="Pagamentos" value={brl(financeStats.paid)} />
          <Metric label="Pendências" value={brl(financeStats.pending)} />
          <Metric label="Inadimplência" value={brl(financeStats.overdue)} />
        </div>

        <div className="mt-6">
          {id === "divergencias" ? (
            <DataTable
              columns={[
                {
                  key: "trip",
                  header: "Viagem",
                  render: (d) => <span className="tabular">{d.tripNumber}</span>,
                },
                { key: "company", header: "Empresa", render: (d) => companyName(d.companyId) },
                { key: "tickets", header: "Passagens", align: "right", render: (d) => d.tickets },
                { key: "gate", header: "Catraca", align: "right", render: (d) => d.gate },
                { key: "report", header: "Relatório", align: "right", render: (d) => d.report },
                { key: "diff", header: "Diferença", align: "right", render: (d) => d.difference },
                {
                  key: "sit",
                  header: "Situação",
                  render: () => <StatusBadge tone="warning">Em análise</StatusBadge>,
                },
                {
                  key: "note",
                  header: "Observação",
                  render: (d) => <span className="text-muted-foreground">{d.note}</span>,
                },
              ]}
              rows={discrepancies}
            />
          ) : (
            <DataTable columns={tripColumns} rows={allTrips.slice(0, 14)} />
          )}
        </div>

        <footer className="mt-8 border-t border-border pt-5 text-center text-xs text-muted-foreground">
          <p>Prefeitura Municipal de Manhuaçu · Nova Rodoviária de Manhuaçu · SisRodov</p>
          <p className="mt-1 italic">
            Documento demonstrativo gerado em ambiente de apresentação com dados fictícios.
          </p>
        </footer>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground">
        {label}
      </p>
      <p className="tabular mt-0.5 font-display text-lg font-bold">{value}</p>
    </div>
  );
}
