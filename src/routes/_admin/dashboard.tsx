import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  Bus,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Info,
  Ticket,
  TrendingDown,
  Users,
} from "lucide-react";
import {
  DemoNote,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
  DataTable,
  tripStatusTone,
  type Column,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { PrefeituraLogo, RodoviariaLogo } from "@/components/brand/Logos";
import {
  TODAY_LABEL,
  alerts,
  boardingsByCompany,
  boardingsLast7Days,
  brl,
  companyName,
  dashboardStats,
  nextTrip,
  num,
  upcomingTrips,
} from "@/data/mock";
import type { Trip } from "@/types";

export const Route = createFileRoute("/_admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SisRodov Manhuaçu" },
      {
        name: "description",
        content:
          "Visão geral da operação do Terminal Rodoviário de Manhuaçu: viagens, embarques, conciliação e alertas.",
      },
      { property: "og:title", content: "Dashboard — SisRodov Manhuaçu" },
      {
        property: "og:description",
        content: "Visão geral da operação do Terminal Rodoviário de Manhuaçu.",
      },
    ],
  }),
  component: Dashboard,
});

const alertIcon = {
  warning: AlertTriangle,
  danger: AlertTriangle,
  info: Info,
  success: CheckCircle2,
};

const alertTone = {
  warning: "warning",
  danger: "danger",
  info: "info",
  success: "success",
} as const;

function Dashboard() {
  const columns: Column<Trip>[] = [
    { key: "time", header: "Horário", render: (t) => <span className="tabular font-semibold">{t.scheduled}</span> },
    { key: "dest", header: "Destino", render: (t) => t.destination },
    { key: "company", header: "Empresa", render: (t) => <span className="text-muted-foreground">{companyName(t.companyId)}</span> },
    { key: "platform", header: "Plataforma", align: "center", render: (t) => <span className="tabular">{t.platform}</span> },
    { key: "pax", header: "Passageiros", align: "right", render: (t) => <span className="tabular">{t.boardings}</span> },
    {
      key: "status",
      header: "Status",
      render: (t) => (
        <StatusBadge tone={tripStatusTone[t.status].tone}>{tripStatusTone[t.status].label}</StatusBadge>
      ),
    },
  ];

  const totalConc = dashboardStats.reconciled + dashboardStats.inAnalysis + dashboardStats.divergences;
  const pct = (v: number) => (v / totalConc) * 100;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card px-5 py-4 shadow-[var(--shadow-card)]">
        <PrefeituraLogo />
        <RodoviariaLogo />
      </div>

      <PageHeader
        title="Dashboard"
        subtitle="Visão geral da operação do Terminal Rodoviário de Manhuaçu"
        actions={
          <>
            <StatusBadge tone="success">Sistema operacional</StatusBadge>
            <span className="text-sm font-medium text-muted-foreground">{TODAY_LABEL}</span>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Viagens hoje" value={dashboardStats.tripsToday} icon={Bus} trend="+8,4%" hint="em relação ao período anterior" />
        <StatCard label="Embarques hoje" value={num(dashboardStats.boardingsToday)} icon={Users} tone="info" hint="acessos confirmados no terminal" />
        <StatCard label="Passagens registradas" value={num(dashboardStats.ticketsToday)} icon={Ticket} tone="primary" hint="emitidas pelas empresas" />
        <StatCard label="Empresas ativas" value={dashboardStats.activeCompanies} icon={Building2} tone="neutral" hint="operando no terminal" />
        <StatCard label="Taxas pendentes" value={brl(dashboardStats.pendingFees)} icon={CircleDollarSign} tone="warning" hint="informação demonstrativa" />
        <StatCard label="Inadimplência" value={brl(dashboardStats.overdue)} icon={TrendingDown} tone="danger" hint="informação demonstrativa" />
      </div>

      {/* Operação em tempo real */}
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_1fr]">
        <div className="overflow-hidden rounded-xl gradient-institutional p-6 text-primary-foreground shadow-[var(--shadow-raised)]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary-foreground/70">
              Operação em tempo real
            </p>
            <span className="flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-bold">
              <span className="h-2 w-2 animate-pulse rounded-full bg-success" /> EMBARQUE
            </span>
          </div>

          <div className="mt-6 flex flex-wrap items-end gap-6">
            <p className="tabular font-display text-6xl leading-none font-extrabold">{nextTrip.scheduled}</p>
            <div>
              <p className="font-display text-2xl font-bold">{nextTrip.destination}</p>
              <p className="text-primary-foreground/80">{companyName(nextTrip.companyId)}</p>
            </div>
            <div className="rounded-lg border border-primary-foreground/25 px-4 py-2">
              <p className="text-[10px] tracking-[0.2em] uppercase text-primary-foreground/70">Plataforma</p>
              <p className="tabular font-display text-2xl font-bold">{nextTrip.platform}</p>
            </div>
          </div>

          <div className="mt-6">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary-foreground/20">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-success" />
            </div>
            <p className="mt-2 text-sm font-semibold">Embarque em andamento</p>
          </div>

          <Button asChild variant="secondary" className="mt-6">
            <Link to="/operacao/viagens/$tripId" params={{ tripId: nextTrip.id }}>
              Ver viagem <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <SectionCard
          title="Conciliação 360°"
          description="Cruzamento entre passagens, catracas e relatórios das empresas"
          actions={
            <Button asChild variant="outline" size="sm">
              <Link to="/conciliacao">Abrir</Link>
            </Button>
          }
        >
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-success/25 bg-success-soft p-3">
              <p className="text-xs font-semibold text-success">Conciliados</p>
              <p className="tabular mt-1 font-display text-2xl font-bold text-success">{num(dashboardStats.reconciled)}</p>
            </div>
            <div className="rounded-lg border border-warning/30 bg-warning-soft p-3">
              <p className="text-xs font-semibold text-warning-foreground">Em análise</p>
              <p className="tabular mt-1 font-display text-2xl font-bold text-warning-foreground">{dashboardStats.inAnalysis}</p>
            </div>
            <div className="rounded-lg border border-danger/25 bg-danger-soft p-3">
              <p className="text-xs font-semibold text-danger">Divergências</p>
              <p className="tabular mt-1 font-display text-2xl font-bold text-danger">{dashboardStats.divergences}</p>
            </div>
          </div>

          <div className="mt-5 flex h-3 overflow-hidden rounded-full">
            <div className="bg-success" style={{ width: `${pct(dashboardStats.reconciled)}%` }} />
            <div className="bg-warning" style={{ width: `${pct(dashboardStats.inAnalysis)}%` }} />
            <div className="bg-danger" style={{ width: `${pct(dashboardStats.divergences)}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {((dashboardStats.reconciled / totalConc) * 100).toFixed(1)}% das viagens do período já conciliadas.
          </p>
          <DemoNote>As informações apresentadas nesta versão são demonstrativas.</DemoNote>
        </SectionCard>
      </div>

      {/* Próximas viagens */}
      <div className="mt-6">
        <SectionCard
          title="Próximas viagens"
          description="Partidas previstas para hoje"
          bodyClassName="p-0"
          actions={
            <Button asChild variant="outline" size="sm">
              <Link to="/operacao/viagens">Ver todas</Link>
            </Button>
          }
        >
          <DataTable columns={columns} rows={upcomingTrips.slice(0, 6)} />
        </SectionCard>
      </div>

      {/* Gráficos */}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <SectionCard title="Embarques nos últimos 7 dias" description="Evolução diária de acessos no terminal">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={boardingsLast7Days} margin={{ left: -18, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                    fontSize: 13,
                  }}
                />
                <Area type="monotone" dataKey="embarques" stroke="var(--color-primary)" strokeWidth={2.5} fill="url(#grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Embarques por empresa" description="Distribuição das principais empresas hoje">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={boardingsByCompany} margin={{ left: -18, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="empresa" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" interval={0} angle={-12} dy={8} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="embarques" radius={[6, 6, 0, 0]} fill="var(--color-primary)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Alertas */}
      <div className="mt-6">
        <SectionCard title="Alertas e ocorrências" bodyClassName="p-0">
          <ul>
            {alerts.map((a) => {
              const Icon = alertIcon[a.kind];
              return (
                <li key={a.id}>
                  <Link
                    to="/conciliacao"
                    className="flex items-center gap-3 border-b border-border/60 px-5 py-3.5 transition-colors last:border-0 hover:bg-muted/70"
                  >
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-${alertTone[a.kind]}-soft text-${alertTone[a.kind]}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 text-sm">{a.text}</span>
                    <span className="text-xs whitespace-nowrap text-muted-foreground">{a.time}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      </div>
    </>
  );
}
