import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Building2 } from "lucide-react";
import {
  DataTable,
  DemoNote,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
  feeTone,
  reconciliationTone,
  tripStatusTone,
  type Column,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  allTrips,
  brl,
  companies,
  companyName,
  discrepancies,
  fees,
  lines,
  num,
  tickets,
} from "@/data/mock";
import type { Fee, Trip } from "@/types";

export const Route = createFileRoute("/_admin/empresas/$companyId")({
  head: () => ({
    meta: [
      { title: "Detalhe da empresa — SisRodov Manhuaçu" },
      {
        name: "description",
        content: "Operação, passagens, embarques, financeiro e divergências da empresa de transporte.",
      },
      { property: "og:title", content: "Detalhe da empresa — SisRodov Manhuaçu" },
      { property: "og:description", content: "Indicadores operacionais e financeiros da empresa." },
    ],
  }),
  loader: ({ params }) => {
    const company = companies.find((c) => c.id === params.companyId);
    if (!company) throw notFound();
    return company;
  },
  component: CompanyDetail,
});

function CompanyDetail() {
  const company = Route.useLoaderData();
  const companyTrips = allTrips.filter((t) => t.companyId === company.id);
  const companyFees = fees.filter((f) => f.companyId === company.id);
  const companyLines = lines.filter((l) => l.companyId === company.id);
  const companyTickets = tickets.filter((t) => t.companyId === company.id);
  const companyDiffs = discrepancies.filter((d) => d.companyId === company.id);

  const pending = companyFees.filter((f) => f.status === "pendente").reduce((s, f) => s + f.amount, 0);
  const overdue = companyFees.filter((f) => f.status === "inadimplente").reduce((s, f) => s + f.amount, 0);
  const total = companyFees.reduce((s, f) => s + f.amount, 0);

  const tripColumns: Column<Trip>[] = [
    { key: "time", header: "Horário", render: (t) => <span className="tabular font-semibold">{t.scheduled}</span> },
    { key: "dest", header: "Destino", render: (t) => t.destination },
    { key: "platform", header: "Plataforma", align: "center", render: (t) => t.platform },
    { key: "boardings", header: "Embarques", align: "right", render: (t) => <span className="tabular">{t.boardings}</span> },
    {
      key: "status",
      header: "Status",
      render: (t) => <StatusBadge tone={tripStatusTone[t.status].tone}>{tripStatusTone[t.status].label}</StatusBadge>,
    },
  ];

  const feeColumns: Column<Fee>[] = [
    { key: "number", header: "Número", render: (f) => <span className="tabular">{f.number}</span> },
    { key: "comp", header: "Competência", render: (f) => f.competence },
    { key: "amount", header: "Valor", align: "right", render: (f) => <span className="tabular">{brl(f.amount)}</span> },
    { key: "due", header: "Vencimento", render: (f) => <span className="tabular">{f.dueDate}</span> },
    { key: "status", header: "Status", render: (f) => <StatusBadge tone={feeTone[f.status].tone}>{feeTone[f.status].label}</StatusBadge> },
  ];

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/empresas">
          <ArrowLeft className="h-4 w-4" /> Voltar para empresas
        </Link>
      </Button>

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="grid h-16 w-16 place-items-center rounded-xl gradient-institutional text-primary-foreground">
          <Building2 className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold">{company.name}</h1>
          <p className="text-sm text-muted-foreground">
            CNPJ {company.cnpj} · {company.anttCode} · {company.contact}
          </p>
        </div>
        <StatusBadge tone={company.active ? "success" : "neutral"}>{company.active ? "Ativa" : "Inativa"}</StatusBadge>
      </div>

      <PageHeader title="Painel da empresa" subtitle="Indicadores operacionais e financeiros demonstrativos" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Linhas" value={company.linesCount} />
        <StatCard label="Viagens hoje" value={company.tripsToday} tone="info" />
        <StatCard label="Embarques hoje" value={num(company.boardingsToday)} tone="success" />
        <StatCard label="Divergências" value={companyDiffs.length} tone="warning" />
      </div>

      <div className="mt-6">
        <Tabs defaultValue="resumo">
          <TabsList className="flex-wrap">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="operacao">Operação</TabsTrigger>
            <TabsTrigger value="passagens">Passagens</TabsTrigger>
            <TabsTrigger value="embarques">Embarques</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
            <TabsTrigger value="divergencias">Divergências</TabsTrigger>
          </TabsList>

          <TabsContent value="resumo" className="mt-4">
            <SectionCard title="Resumo cadastral">
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Info label="Nome" value={company.name} />
                <Info label="CNPJ" value={company.cnpj} />
                <Info label="Código ANTT" value={company.anttCode} />
                <Info label="Contato" value={company.contact} />
                <Info label="E-mail" value={company.email} />
                <Info label="Taxas do período" value={brl(total)} />
                <Info label="Pendências" value={brl(pending)} />
                <Info label="Inadimplência" value={brl(overdue)} />
                <Info label="Linhas cadastradas" value={String(companyLines.length)} />
              </dl>
              <DemoNote>Dados fictícios utilizados apenas para demonstração.</DemoNote>
            </SectionCard>
          </TabsContent>

          <TabsContent value="operacao" className="mt-4">
            <SectionCard title="Linhas operadas" bodyClassName="p-0">
              <DataTable
                columns={[
                  { key: "code", header: "Código", render: (l) => <span className="tabular">{l.code}</span> },
                  { key: "dest", header: "Destino", render: (l) => l.destination },
                  { key: "time", header: "Horário", render: (l) => <span className="tabular">{l.departure}</span> },
                  { key: "freq", header: "Frequência", render: (l) => l.frequency },
                ]}
                rows={companyLines}
              />
            </SectionCard>
          </TabsContent>

          <TabsContent value="passagens" className="mt-4">
            <SectionCard title="Passagens informadas" bodyClassName="p-0">
              <DataTable
                columns={[
                  { key: "code", header: "Passagem", render: (t) => <span className="tabular">{t.code}</span> },
                  { key: "dest", header: "Destino", render: (t) => t.destination },
                  { key: "issued", header: "Emissão", render: (t) => <span className="tabular">{t.issuedAt}</span> },
                  { key: "status", header: "Status", render: (t) => <span className="capitalize">{t.status.replace("-", " ")}</span> },
                ]}
                rows={companyTickets}
              />
            </SectionCard>
          </TabsContent>

          <TabsContent value="embarques" className="mt-4">
            <SectionCard title="Viagens e embarques" bodyClassName="p-0">
              <DataTable columns={tripColumns} rows={companyTrips} />
            </SectionCard>
          </TabsContent>

          <TabsContent value="financeiro" className="mt-4">
            <SectionCard title="Taxas do terminal" bodyClassName="p-0">
              <DataTable columns={feeColumns} rows={companyFees} />
            </SectionCard>
            <p className="mt-3 text-xs text-muted-foreground italic">
              As informações financeiras apresentadas nesta versão são demonstrativas.
            </p>
          </TabsContent>

          <TabsContent value="divergencias" className="mt-4">
            <SectionCard title="Diferenças identificadas" bodyClassName="p-0">
              <DataTable
                columns={[
                  { key: "trip", header: "Viagem", render: (d) => <span className="tabular">{d.tripNumber}</span> },
                  { key: "tickets", header: "Passagens", align: "right", render: (d) => d.tickets },
                  { key: "gate", header: "Catraca", align: "right", render: (d) => d.gate },
                  { key: "report", header: "Relatório", align: "right", render: (d) => d.report },
                  { key: "diff", header: "Diferença", align: "right", render: (d) => d.difference },
                  { key: "note", header: "Observação", render: (d) => <span className="text-muted-foreground">{d.note}</span> },
                ]}
                rows={companyDiffs}
                emptyMessage={`Nenhuma diferença registrada para ${companyName(company.id)}.`}
              />
            </SectionCard>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}
