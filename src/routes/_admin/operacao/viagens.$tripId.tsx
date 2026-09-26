import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Bus, Clock, MapPin, Ticket } from "lucide-react";
import {
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
  reconciliationTone,
  tripStatusTone,
  DemoNote,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { allTrips, brl, companyName } from "@/data/mock";

export const Route = createFileRoute("/_admin/operacao/viagens/$tripId")({
  head: () => ({
    meta: [
      { title: "Detalhe da viagem — SisRodov Manhuaçu" },
      {
        name: "description",
        content: "Detalhamento da viagem: empresa, plataforma, veículo, passagens, acessos e conciliação.",
      },
      { property: "og:title", content: "Detalhe da viagem — SisRodov Manhuaçu" },
      { property: "og:description", content: "Passagens, acessos, embarques e conciliação da viagem." },
    ],
  }),
  loader: ({ params }) => {
    const trip = allTrips.find((t) => t.id === params.tripId);
    if (!trip) throw notFound();
    return trip;
  },
  component: TripDetail,
});

function TripDetail() {
  const trip = Route.useLoaderData();

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/operacao/viagens">
          <ArrowLeft className="h-4 w-4" /> Voltar para viagens
        </Link>
      </Button>

      <PageHeader
        title={`Viagem ${trip.number}`}
        subtitle={`${trip.origin} → ${trip.destination} · ${trip.date}`}
        actions={
          <>
            <StatusBadge tone={tripStatusTone[trip.status].tone}>{tripStatusTone[trip.status].label}</StatusBadge>
            <StatusBadge tone={reconciliationTone[trip.reconciliation].tone} dot={false}>
              {reconciliationTone[trip.reconciliation].label}
            </StatusBadge>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <SectionCard title="Dados da viagem" bodyClassName="p-0">
          <dl className="grid grid-cols-2 gap-px bg-border md:grid-cols-3">
            <Item label="Empresa" value={companyName(trip.companyId)} />
            <Item label="Origem" value={trip.origin} />
            <Item label="Destino" value={trip.destination} />
            <Item label="Data" value={trip.date} />
            <Item label="Horário previsto" value={trip.scheduled} />
            <Item label="Horário realizado" value={trip.realized ?? "—"} />
            <Item label="Plataforma" value={trip.platform} />
            <Item label="Veículo" value={trip.vehicle} />
            <Item label="Taxa municipal" value={brl(trip.fee)} />
          </dl>
        </SectionCard>

        <SectionCard title="Resumo da conciliação">
          <ul className="space-y-3 text-sm">
            <Row label="Passagens emitidas" value={trip.ticketsIssued} />
            <Row label="Canceladas" value={trip.ticketsCancelled} />
            <Row label="Acessos registrados" value={trip.gateAccess} />
            <Row label="Embarques" value={trip.boardings} />
            <Row label="Relatório empresa" value={trip.companyReport} />
          </ul>
          <div className="mt-5 rounded-lg border border-border bg-muted/60 p-4">
            <p className="text-xs font-bold tracking-[0.12em] uppercase text-muted-foreground">Situação</p>
            <div className="mt-2">
              <StatusBadge tone={reconciliationTone[trip.reconciliation].tone}>
                {reconciliationTone[trip.reconciliation].label}
              </StatusBadge>
            </div>
            {trip.companyReport !== trip.gateAccess && (
              <p className="mt-2 text-xs text-muted-foreground">
                Diferença de {Math.abs(trip.companyReport - trip.gateAccess)} passageiros entre fontes — necessita
                conferência.
              </p>
            )}
          </div>
          <DemoNote>Informações demonstrativas do ambiente de apresentação.</DemoNote>
        </SectionCard>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Passagens" value={trip.ticketsIssued} icon={Ticket} />
        <StatCard label="Embarques" value={trip.boardings} icon={Bus} tone="info" />
        <StatCard label="Plataforma" value={trip.platform} icon={MapPin} tone="neutral" />
        <StatCard label="Pontualidade" value={trip.realized ?? trip.scheduled} icon={Clock} tone="success" hint={`Previsto ${trip.scheduled}`} />
      </div>
    </>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-5 py-4">
      <dt className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular font-display text-lg font-bold">{value}</span>
    </li>
  );
}
