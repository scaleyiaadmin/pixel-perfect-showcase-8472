import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Bus, DoorOpen, FileText, Landmark, Ticket, Users } from "lucide-react";
import {
  DataTable,
  DemoNote,
  PageHeader,
  SectionCard,
  StatusBadge,
  type Column,
  type Tone,
  DemoBanner,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  brl,
  companyName,
  dashboardStats,
  discrepancies,
  divergentTrip,
  featuredTrip,
  num,
} from "@/data/mock";
import type { Discrepancy, Trip } from "@/types";

export const Route = createFileRoute("/_admin/conciliacao")({
  head: () => ({
    meta: [
      { title: "Conciliação 360° — SisRodov Manhuaçu" },
      {
        name: "description",
        content:
          "Cruzamento entre viagens, passagens, catracas, embarques, relatórios das empresas e taxas municipais.",
      },
      { property: "og:title", content: "Conciliação 360° — SisRodov Manhuaçu" },
      {
        property: "og:description",
        content: "Identificação de diferenças entre as fontes de informação do terminal.",
      },
    ],
  }),
  component: ReconciliationPage,
});

const flow = [
  { label: "Viagem", icon: Bus },
  { label: "Passagens", icon: Ticket },
  { label: "Catraca", icon: DoorOpen },
  { label: "Embarques", icon: Users },
  { label: "Relatório empresa", icon: FileText },
  { label: "Taxa municipal", icon: Landmark },
];

const situationMap: Record<string, { tone: Tone; label: string }> = {
  "em-analise": { tone: "warning", label: "Em análise" },
  conferido: { tone: "success", label: "Conferido" },
  "necessita-conferencia": { tone: "info", label: "Necessita conferência" },
};

function ReconciliationPage() {
  const [selected, setSelected] = useState<Discrepancy | null>(null);

  const columns: Column<Discrepancy>[] = [
    {
      key: "trip",
      header: "Viagem",
      render: (d) => <span className="tabular font-semibold">{d.tripNumber}</span>,
    },
    { key: "company", header: "Empresa", render: (d) => companyName(d.companyId) },
    {
      key: "tickets",
      header: "Passagens",
      align: "right",
      render: (d) => <span className="tabular">{d.tickets}</span>,
    },
    {
      key: "gate",
      header: "Catraca",
      align: "right",
      render: (d) => <span className="tabular">{d.gate}</span>,
    },
    {
      key: "report",
      header: "Relatório",
      align: "right",
      render: (d) => <span className="tabular">{d.report}</span>,
    },
    {
      key: "diff",
      header: "Diferença",
      align: "right",
      render: (d) => <span className="tabular font-semibold">{d.difference}</span>,
    },
    {
      key: "situation",
      header: "Situação",
      render: (d) => (
        <StatusBadge tone={situationMap[d.situation].tone}>
          {situationMap[d.situation].label}
        </StatusBadge>
      ),
    },
    {
      key: "action",
      header: "",
      align: "right",
      render: (d) => (
        <Button variant="outline" size="sm" onClick={() => setSelected(d)}>
          Analisar
        </Button>
      ),
    },
  ];

  const total = dashboardStats.reconciled + dashboardStats.inAnalysis + dashboardStats.divergences;

  return (
    <>
      <PageHeader
        title="Conciliação 360°"
        subtitle="Cruze informações operacionais, passagens e embarques para identificar divergências."
      />
      <DemoBanner />

      <SectionCard title="Fluxo da informação">
        <div className="flex flex-wrap items-center gap-2">
          {flow.map((f, i) => (
            <div key={f.label} className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
                <f.icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{f.label}</span>
              </div>
              {i < flow.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Indicator label="Conciliados" value={num(dashboardStats.reconciled)} tone="success" />
          <Indicator label="Em análise" value={String(dashboardStats.inAnalysis)} tone="warning" />
          <Indicator
            label="Divergências"
            value={String(dashboardStats.divergences)}
            tone="danger"
          />
        </div>
        <div className="mt-4 flex h-3 overflow-hidden rounded-full">
          <div
            className="bg-success"
            style={{ width: `${(dashboardStats.reconciled / total) * 100}%` }}
          />
          <div
            className="bg-warning"
            style={{ width: `${(dashboardStats.inAnalysis / total) * 100}%` }}
          />
          <div
            className="bg-danger"
            style={{ width: `${(dashboardStats.divergences / total) * 100}%` }}
          />
        </div>
      </SectionCard>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <TripReconciliationCard trip={featuredTrip} />
        <TripReconciliationCard
          trip={divergentTrip}
          onAnalyze={() => setSelected(discrepancies[0])}
        />
      </div>

      <div className="mt-6">
        <SectionCard
          title="Diferenças identificadas"
          description="Linguagem neutra: o sistema apenas apresenta as diferenças entre as fontes."
          bodyClassName="p-0"
        >
          <DataTable columns={columns} rows={discrepancies} />
        </SectionCard>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Análise da diferença</SheetTitle>
            <SheetDescription>
              Viagem {selected?.tripNumber} · {selected && companyName(selected.companyId)}
            </SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="space-y-4 px-4 pb-6">
              <Line label="Passagens emitidas" value={selected.tickets} />
              <Line label="Acessos na catraca" value={selected.gate} />
              <Line label="Relatório da empresa" value={selected.report} />
              <Line label="Diferença apurada" value={selected.difference} highlight />
              <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm">
                <p className="font-semibold">Observação</p>
                <p className="mt-1 text-muted-foreground">{selected.note}</p>
              </div>
              <StatusBadge tone={situationMap[selected.situation].tone}>
                {situationMap[selected.situation].label}
              </StatusBadge>
              <DemoNote>
                O sistema identifica e apresenta a diferença entre as fontes, sem qualquer
                julgamento.
              </DemoNote>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Indicator({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "warning" | "danger";
}) {
  const classes = {
    success: "border-success/25 bg-success-soft text-success",
    warning: "border-warning/30 bg-warning-soft text-warning-foreground",
    danger: "border-danger/25 bg-danger-soft text-danger",
  }[tone];
  return (
    <div className={`rounded-lg border p-3 ${classes}`}>
      <p className="text-xs font-semibold">{label}</p>
      <p className="tabular mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

function TripReconciliationCard({ trip, onAnalyze }: { trip: Trip; onAnalyze?: () => void }) {
  const diff = Math.abs(trip.companyReport - trip.gateAccess);
  return (
    <SectionCard
      title={`Viagem ${trip.number}`}
      description={`${trip.origin} → ${trip.destination} · ${trip.scheduled} · ${companyName(trip.companyId)}`}
    >
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Metric label="Passagens emitidas" value={trip.ticketsIssued} />
        <Metric label="Cancelamentos" value={trip.ticketsCancelled} />
        <Metric label="Acessos na catraca" value={trip.gateAccess} />
        <Metric label="Embarques registrados" value={trip.boardings} />
        <Metric label="Relatório empresa" value={trip.companyReport} />
        <Metric label="Taxa" value={brl(trip.fee)} />
      </dl>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        {diff === 0 ? (
          <StatusBadge tone="success">Conciliado</StatusBadge>
        ) : (
          <div className="flex items-center gap-3">
            <StatusBadge tone="warning">Divergência identificada</StatusBadge>
            <span className="text-sm text-muted-foreground">Diferença: {diff} passageiros</span>
          </div>
        )}
        {onAnalyze && (
          <Button variant="outline" size="sm" onClick={onAnalyze}>
            Analisar divergência
          </Button>
        )}
      </div>
    </SectionCard>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
      <dt className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="tabular mt-0.5 font-display text-lg font-bold">{value}</dd>
    </div>
  );
}

function Line({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`tabular font-display text-lg font-bold ${highlight ? "text-warning-foreground" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
