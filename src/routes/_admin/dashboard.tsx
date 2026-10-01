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
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Info,
  Route as RouteIcon,
  Ticket,
} from "lucide-react";
import {
  DemoNote,
  PageHeader,
  QueryState,
  SectionCard,
  SourceNote,
  StatCard,
  StatusBadge,
  DataTable,
  type Column,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { PrefeituraLogo, RodoviariaLogo } from "@/components/brand/Logos";
import { alerts, dashboardStats, num } from "@/data/mock";
import {
  destinoDaPartida,
  horaCurta,
  mesAno,
  nomeEmpresa,
  partidasDoDia,
  useEmpresas,
  useHorarios,
  useLinhas,
  usePassagensMensais,
  type Horario,
} from "@/services/dados-publicos";

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
  const empresas = useEmpresas();
  const linhas = useLinhas();
  const horarios = useHorarios();
  const passagens = usePassagensMensais();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => setNow(new Date()), []);

  const hoje = now ? partidasDoDia(horarios.data ?? [], now) : [];
  const minutosAgora = now ? now.getHours() * 60 + now.getMinutes() : 0;
  const proximas = hoje.filter((h) => {
    const [hh, mm] = h.hora.split(":").map(Number);
    return hh * 60 + mm >= minutosAgora;
  });
  const proxima = proximas[0];

  const { porMes, ultimoMes, topDestinos } = useMemo(() => {
    const data = passagens.data ?? [];
    const meses = new Map<string, number>();
    for (const p of data) meses.set(p.mes_emissao, (meses.get(p.mes_emissao) ?? 0) + p.quantidade);
    const porMes = [...meses.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, passagens]) => ({ mes: mesAno(mes), passagens }));
    const ultimo = [...meses.keys()].sort().at(-1) ?? "";
    const destinos = new Map<string, number>();
    for (const p of data) {
      if (p.mes_emissao !== ultimo || p.origem !== "Manhuaçu") continue;
      destinos.set(p.destino, (destinos.get(p.destino) ?? 0) + p.quantidade);
    }
    const topDestinos = [...destinos.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([destino, passagens]) => ({ destino, passagens }));
    return { porMes, ultimoMes: ultimo, topDestinos };
  }, [passagens.data]);

  const columns: Column<Horario>[] = [
    {
      key: "time",
      header: "Horário",
      render: (h) => <span className="tabular font-semibold">{horaCurta(h.hora)}</span>,
    },
    { key: "dest", header: "Destino", render: (h) => destinoDaPartida(h) },
    {
      key: "company",
      header: "Empresa",
      render: (h) => <span className="text-muted-foreground">{nomeEmpresa(h.linha)}</span>,
    },
    {
      key: "line",
      header: "Linha",
      render: (h) => <span className="tabular text-muted-foreground">{h.linha.codigo}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: () => <StatusBadge tone="info">Previsto</StatusBadge>,
    },
  ];

  const totalConc =
    dashboardStats.reconciled + dashboardStats.inAnalysis + dashboardStats.divergences;
  const pct = (v: number) => (v / totalConc) * 100;
  const passagensUltimoMes = porMes.at(-1)?.passagens;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card px-5 py-4 shadow-[var(--shadow-card)]">
        <PrefeituraLogo />
        <RodoviariaLogo />
      </div>

      <PageHeader
        title="Dashboard"
        subtitle="Visão geral do Terminal Rodoviário de Manhuaçu"
        actions={
          <span className="text-sm font-medium text-muted-foreground">
            {now?.toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Partidas programadas hoje"
          value={horarios.data ? hoje.length : "—"}
          icon={Clock}
          hint="ANTT e DER-MG"
        />
        <StatCard
          label="Linhas"
          value={linhas.data?.length ?? "—"}
          icon={RouteIcon}
          tone="info"
          hint="interestaduais e intermunicipais"
        />
        <StatCard
          label="Empresas interestaduais"
          value={empresas.data?.length ?? "—"}
          icon={Building2}
          tone="neutral"
          hint="autorizadas pela ANTT"
        />
        <StatCard
          label="Passagens interestaduais"
          value={passagensUltimoMes !== undefined ? num(passagensUltimoMes) : "—"}
          icon={Ticket}
          tone="primary"
          hint={ultimoMes ? `emitidas em ${mesAno(ultimoMes)} (ANTT)` : undefined}
        />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_1fr]">
        <div className="overflow-hidden rounded-xl gradient-institutional p-6 text-primary-foreground shadow-[var(--shadow-raised)]">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary-foreground/70">
            Próxima partida programada
          </p>
          {proxima ? (
            <>
              <div className="mt-6 flex flex-wrap items-end gap-6">
                <p className="tabular font-display text-6xl leading-none font-extrabold">
                  {horaCurta(proxima.hora)}
                </p>
                <div>
                  <p className="font-display text-2xl font-bold">{destinoDaPartida(proxima)}</p>
                  <p className="text-primary-foreground/80">{nomeEmpresa(proxima.linha)}</p>
                </div>
              </div>
              <p className="mt-6 text-sm text-primary-foreground/80">
                {proximas.length - 1} outras partidas programadas até o fim do dia.
              </p>
            </>
          ) : (
            <p className="mt-6 text-primary-foreground/80">
              {horarios.isLoading ? "Carregando…" : "Sem mais partidas programadas hoje."}
            </p>
          )}
          <Button asChild variant="secondary" className="mt-6">
            <Link to="/operacao/horarios">
              Ver grade de horários <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <SectionCard
          title="Conciliação 360°"
          description="Cruzamento entre passagens, catracas e relatórios das empresas"
          actions={<StatusBadge tone="warning">Dados de exemplo</StatusBadge>}
        >
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-success/25 bg-success-soft p-3">
              <p className="text-xs font-semibold text-success">Conciliados</p>
              <p className="tabular mt-1 font-display text-2xl font-bold text-success">
                {num(dashboardStats.reconciled)}
              </p>
            </div>
            <div className="rounded-lg border border-warning/30 bg-warning-soft p-3">
              <p className="text-xs font-semibold text-warning-foreground">Em análise</p>
              <p className="tabular mt-1 font-display text-2xl font-bold text-warning-foreground">
                {dashboardStats.inAnalysis}
              </p>
            </div>
            <div className="rounded-lg border border-danger/25 bg-danger-soft p-3">
              <p className="text-xs font-semibold text-danger">Divergências</p>
              <p className="tabular mt-1 font-display text-2xl font-bold text-danger">
                {dashboardStats.divergences}
              </p>
            </div>
          </div>

          <div className="mt-5 flex h-3 overflow-hidden rounded-full">
            <div className="bg-success" style={{ width: `${pct(dashboardStats.reconciled)}%` }} />
            <div className="bg-warning" style={{ width: `${pct(dashboardStats.inAnalysis)}%` }} />
            <div className="bg-danger" style={{ width: `${pct(dashboardStats.divergences)}%` }} />
          </div>
          <DemoNote>Aguardando integração com empresas e catracas.</DemoNote>
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard
          title="Próximas partidas"
          description="Programadas para hoje no terminal"
          bodyClassName="p-0"
          actions={
            <Button asChild variant="outline" size="sm">
              <Link to="/operacao/horarios">Ver todas</Link>
            </Button>
          }
        >
          <QueryState isLoading={horarios.isLoading} error={horarios.error} />
          {horarios.data && (
            <DataTable
              columns={columns}
              rows={proximas.slice(0, 6)}
              emptyMessage="Sem mais partidas hoje."
            />
          )}
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <SectionCard
          title="Passagens interestaduais por mês"
          description="Emitidas com origem ou destino em Manhuaçu"
        >
          <QueryState isLoading={passagens.isLoading} error={passagens.error} />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={porMes} margin={{ left: -18, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="mes"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--color-muted-foreground)"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--color-muted-foreground)"
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                    fontSize: 13,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="passagens"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  fill="url(#grad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <SourceNote>Fonte: ANTT, MONITRIIP. Publicado todo dia 15 com o mês anterior.</SourceNote>
        </SectionCard>

        <SectionCard
          title="Principais destinos"
          description={
            ultimoMes ? `Passagens saindo de Manhuaçu em ${mesAno(ultimoMes)}` : undefined
          }
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topDestinos} margin={{ left: -18, right: 8, top: 8 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="destino"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="var(--color-muted-foreground)"
                  interval={0}
                  angle={-12}
                  dy={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--color-muted-foreground)"
                />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="passagens" radius={[6, 6, 0, 0]} fill="var(--color-primary)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <SourceNote>Fonte: ANTT, MONITRIIP. Só linhas interestaduais.</SourceNote>
        </SectionCard>
      </div>

      {/* Alertas */}
      <div className="mt-6">
        <SectionCard
          title="Alertas e ocorrências"
          bodyClassName="p-0"
          actions={<StatusBadge tone="warning">Dados de exemplo</StatusBadge>}
        >
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
                    <span className="text-xs whitespace-nowrap text-muted-foreground">
                      {a.time}
                    </span>
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
