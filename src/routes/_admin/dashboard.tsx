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
  Ban,
  CheckCircle2,
  Clock,
  Info,
  MapPin,
  Route as RouteIcon,
  Ticket,
  Users,
} from "lucide-react";
import {
  EmptyState,
  PageHeader,
  QueryState,
  SectionCard,
  SourceNote,
  StatCard,
  StatusBadge,
  DataTable,
  tripStatusTone,
  type Column,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { PrefeituraLogo, RodoviariaLogo } from "@/components/brand/Logos";
import { num } from "@/lib/format";
import { mesAno, useEmpresas, useLinhas, usePassagensMensais } from "@/services/dados-publicos";
import {
  dataBR,
  emAberto,
  horaPrevista,
  nomeEmpresaViagem,
  ocupaPlataforma,
  somarDias,
  useEmbarquesPorDia,
  useHoje,
  usePlataformas,
  useViagensDoDia,
  type ViagemDetalhada,
} from "@/services/operacao";

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

type Alerta = {
  id: string;
  kind: keyof typeof alertIcon;
  text: string;
  to: "/operacao/viagens" | "/operacao/plataformas" | "/controle-embarque";
};

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--color-border)",
  background: "var(--color-card)",
  fontSize: 13,
};

function Dashboard() {
  const hoje = useHoje();
  const empresas = useEmpresas();
  const linhas = useLinhas();
  const passagens = usePassagensMensais();
  const viagens = useViagensDoDia(hoje);
  const plataformas = usePlataformas({ aoVivo: true });
  const seteDias = hoje ? somarDias(hoje, -6) : null;
  const embarquesDia = useEmbarquesPorDia(seteDias);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const lista = useMemo(() => viagens.data ?? [], [viagens.data]);
  const agora = now?.getTime() ?? 0;

  const contagem = useMemo(() => {
    const c = { total: 0, realizadas: 0, andamento: 0, previstas: 0, atrasadas: 0, canceladas: 0 };
    for (const v of lista) {
      c.total++;
      if (v.status === "partiu" || v.status === "realizada") c.realizadas++;
      else if (v.status === "embarque" || v.status === "ultima-chamada") c.andamento++;
      else if (v.status === "atrasada") c.atrasadas++;
      else if (v.status === "cancelada") c.canceladas++;
      else c.previstas++;
    }
    return c;
  }, [lista]);

  // Próximas saídas do terminal com horário conhecido.
  const proximas = lista.filter(
    (v) =>
      v.tipo !== "chegada" &&
      emAberto(v) &&
      v.previsto_em !== null &&
      new Date(v.previsto_em).getTime() >= agora - 5 * 60_000,
  );
  const proxima = proximas[0];

  const ativas = (plataformas.data ?? []).filter((p) => p.ativa);
  const ocupadas = new Set(lista.filter(ocupaPlataforma).map((v) => v.plataforma_id)).size;

  const serie7dias = useMemo(() => {
    if (!seteDias) return [];
    const porDia = new Map((embarquesDia.data ?? []).map((d) => [d.dia, d.acessos]));
    return Array.from({ length: 7 }, (_, i) => {
      const dia = somarDias(seteDias, i);
      return { dia: dataBR(dia).slice(0, 5), embarques: porDia.get(dia) ?? 0 };
    });
  }, [embarquesDia.data, seteDias]);
  const embarquesHoje = hoje
    ? ((embarquesDia.data ?? []).find((d) => d.dia === hoje)?.acessos ?? 0)
    : 0;
  const negadosHoje = hoje
    ? ((embarquesDia.data ?? []).find((d) => d.dia === hoje)?.negados ?? 0)
    : 0;
  const semEmbarques7 = embarquesDia.data && serie7dias.every((d) => d.embarques === 0);

  const alertas: Alerta[] = useMemo(() => {
    const a: Alerta[] = [];
    if (contagem.atrasadas > 0)
      a.push({
        id: "atrasadas",
        kind: "danger",
        text: `${contagem.atrasadas} ${contagem.atrasadas === 1 ? "viagem atrasada" : "viagens atrasadas"} hoje.`,
        to: "/operacao/viagens",
      });
    const semPlataforma = lista.filter(
      (v) =>
        v.tipo !== "chegada" &&
        emAberto(v) &&
        !v.plataforma_id &&
        v.previsto_em &&
        new Date(v.previsto_em).getTime() - agora < 60 * 60_000 &&
        new Date(v.previsto_em).getTime() > agora - 30 * 60_000,
    ).length;
    if (semPlataforma > 0 && ativas.length > 0)
      a.push({
        id: "sem-plataforma",
        kind: "warning",
        text: `${semPlataforma} ${semPlataforma === 1 ? "partida" : "partidas"} na próxima hora sem plataforma definida.`,
        to: "/operacao/viagens",
      });
    const manutencao = ativas.filter((p) => p.em_manutencao).length;
    if (manutencao > 0)
      a.push({
        id: "manutencao",
        kind: "warning",
        text: `${manutencao} ${manutencao === 1 ? "plataforma em manutenção" : "plataformas em manutenção"}.`,
        to: "/operacao/plataformas",
      });
    if (negadosHoje > 0)
      a.push({
        id: "negados",
        kind: "warning",
        text: `${negadosHoje} ${negadosHoje === 1 ? "acesso negado" : "acessos negados"} nas catracas hoje.`,
        to: "/controle-embarque",
      });
    if (plataformas.data && ativas.length === 0)
      a.push({
        id: "sem-plataformas",
        kind: "info",
        text: "Nenhuma plataforma cadastrada. Cadastre as plataformas do terminal para alocar as viagens.",
        to: "/operacao/plataformas",
      });
    if (viagens.data && lista.length === 0)
      a.push({
        id: "sem-viagens",
        kind: "info",
        text: "As viagens de hoje ainda não foram geradas. Elas são criadas automaticamente às 00:05 ou pelo botão em Viagens.",
        to: "/operacao/viagens",
      });
    const semHorario = lista.filter(
      (v) => v.tipo !== "partida" && !v.previsto_em && emAberto(v),
    ).length;
    if (semHorario > 0)
      a.push({
        id: "sem-horario",
        kind: "info",
        text: `${semHorario} chegadas/passagens sem horário no terminal — aguardando integração das empresas ou lançamento pela equipe.`,
        to: "/operacao/viagens",
      });
    return a;
  }, [contagem.atrasadas, lista, agora, ativas, negadosHoje, plataformas.data, viagens.data]);

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

  const columns: Column<ViagemDetalhada>[] = [
    {
      key: "time",
      header: "Horário",
      render: (v) => <span className="tabular font-semibold">{horaPrevista(v)}</span>,
    },
    { key: "dest", header: "Destino", render: (v) => v.destino },
    {
      key: "company",
      header: "Empresa",
      render: (v) => <span className="text-muted-foreground">{nomeEmpresaViagem(v)}</span>,
    },
    {
      key: "platform",
      header: "Plataforma",
      align: "center",
      render: (v) => <span className="tabular">{v.plataforma?.numero ?? "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (v) => (
        <StatusBadge tone={tripStatusTone[v.status].tone}>
          {tripStatusTone[v.status].label}
        </StatusBadge>
      ),
    },
  ];

  const pct = (v: number) => (contagem.total ? (v / contagem.total) * 100 : 0);
  const passagensUltimoMes = porMes.at(-1)?.passagens;
  const carregandoViagens = !hoje || viagens.isLoading;

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
              timeZone: "America/Sao_Paulo",
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        }
      />

      <QueryState isLoading={false} error={viagens.error} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Viagens hoje"
          value={carregandoViagens ? "—" : num(contagem.total - contagem.canceladas)}
          icon={Clock}
          hint={carregandoViagens ? undefined : `${num(contagem.previstas)} ainda previstas`}
        />
        <StatCard
          label="Realizadas"
          value={carregandoViagens ? "—" : num(contagem.realizadas)}
          icon={CheckCircle2}
          tone="success"
          hint={carregandoViagens ? undefined : `${num(contagem.andamento)} em embarque agora`}
        />
        <StatCard
          label="Atrasadas"
          value={carregandoViagens ? "—" : num(contagem.atrasadas)}
          icon={AlertTriangle}
          tone="warning"
        />
        <StatCard
          label="Canceladas"
          value={carregandoViagens ? "—" : num(contagem.canceladas)}
          icon={Ban}
          tone="danger"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Embarques hoje"
          value={embarquesDia.data ? num(embarquesHoje) : "—"}
          icon={Users}
          tone="info"
          hint="acessos registrados na catraca"
        />
        <StatCard
          label="Plataformas ocupadas"
          value={plataformas.data ? (ativas.length ? `${ocupadas}/${ativas.length}` : "—") : "—"}
          icon={MapPin}
          tone="neutral"
          hint={plataformas.data && ativas.length === 0 ? "nenhuma plataforma cadastrada" : "agora"}
        />
        <StatCard
          label="Linhas"
          value={linhas.data?.length ?? "—"}
          icon={RouteIcon}
          tone="info"
          hint={
            empresas.data
              ? `${num(empresas.data.length)} empresas · ANTT e DER-MG`
              : "ANTT e DER-MG"
          }
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
            Próxima partida
          </p>
          {proxima ? (
            <>
              <div className="mt-6 flex flex-wrap items-end gap-6">
                <p className="tabular font-display text-6xl leading-none font-extrabold">
                  {horaPrevista(proxima)}
                </p>
                <div>
                  <p className="font-display text-2xl font-bold">{proxima.destino}</p>
                  <p className="text-primary-foreground/80">
                    {nomeEmpresaViagem(proxima)}
                    {proxima.plataforma ? ` · Plataforma ${proxima.plataforma.numero}` : ""}
                  </p>
                </div>
              </div>
              <p className="mt-6 text-sm text-primary-foreground/80">
                {proximas.length - 1} outras partidas previstas até o fim do dia.
              </p>
            </>
          ) : (
            <p className="mt-6 text-primary-foreground/80">
              {carregandoViagens
                ? "Carregando…"
                : lista.length === 0
                  ? "As viagens de hoje ainda não foram geradas."
                  : "Sem mais partidas previstas hoje."}
            </p>
          )}
          <Button asChild variant="secondary" className="mt-6">
            <Link to="/operacao/viagens">
              Ver viagens do dia <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <SectionCard
          title="Situação das viagens de hoje"
          description="Atualizada a cada 30 segundos"
        >
          {carregandoViagens ? (
            <QueryState isLoading error={null} />
          ) : contagem.total === 0 ? (
            <EmptyState message="Nenhuma viagem registrada para hoje." />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-success/25 bg-success-soft p-3">
                  <p className="text-xs font-semibold text-success">Realizadas</p>
                  <p className="tabular mt-1 font-display text-2xl font-bold text-success">
                    {num(contagem.realizadas + contagem.andamento)}
                  </p>
                </div>
                <div className="rounded-lg border border-info/25 bg-info-soft p-3">
                  <p className="text-xs font-semibold text-info">Previstas</p>
                  <p className="tabular mt-1 font-display text-2xl font-bold text-info">
                    {num(contagem.previstas)}
                  </p>
                </div>
                <div className="rounded-lg border border-danger/25 bg-danger-soft p-3">
                  <p className="text-xs font-semibold text-danger">Atrasadas/canceladas</p>
                  <p className="tabular mt-1 font-display text-2xl font-bold text-danger">
                    {num(contagem.atrasadas + contagem.canceladas)}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="bg-success"
                  style={{ width: `${pct(contagem.realizadas + contagem.andamento)}%` }}
                />
                <div className="bg-info" style={{ width: `${pct(contagem.previstas)}%` }} />
                <div className="bg-warning" style={{ width: `${pct(contagem.atrasadas)}%` }} />
                <div className="bg-danger" style={{ width: `${pct(contagem.canceladas)}%` }} />
              </div>
              <SourceNote>
                Viagens geradas da grade pública (ANTT e DER-MG) e atualizadas pela equipe do
                terminal e pela integração das empresas.
              </SourceNote>
            </>
          )}
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard
          title="Próximas partidas"
          description="Previstas para hoje no terminal"
          bodyClassName="p-0"
          actions={
            <Button asChild variant="outline" size="sm">
              <Link to="/operacao/viagens">Ver todas</Link>
            </Button>
          }
        >
          <QueryState isLoading={carregandoViagens} error={viagens.error} />
          {viagens.data && (
            <DataTable
              columns={columns}
              rows={proximas.slice(0, 6)}
              emptyMessage={
                lista.length === 0
                  ? "As viagens de hoje ainda não foram geradas."
                  : "Sem mais partidas hoje."
              }
            />
          )}
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <SectionCard
          title="Embarques nos últimos 7 dias"
          description="Acessos registrados pelas catracas do terminal"
        >
          <QueryState isLoading={!seteDias || embarquesDia.isLoading} error={embarquesDia.error} />
          {embarquesDia.data && semEmbarques7 ? (
            <EmptyState message="Nenhum embarque registrado nos últimos 7 dias. Os acessos chegam pela integração das catracas do terminal." />
          ) : (
            embarquesDia.data && (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serie7dias} margin={{ left: -18, right: 8, top: 8 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="dia"
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      stroke="var(--color-muted-foreground)"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      allowDecimals={false}
                      stroke="var(--color-muted-foreground)"
                    />
                    <Tooltip cursor={{ fill: "var(--color-muted)" }} contentStyle={tooltipStyle} />
                    <Bar dataKey="embarques" radius={[6, 6, 0, 0]} fill="var(--color-primary)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )
          )}
          <SourceNote>Fonte: catracas do terminal (integração automática).</SourceNote>
        </SectionCard>

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
                <Tooltip contentStyle={tooltipStyle} />
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
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
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
                <Tooltip cursor={{ fill: "var(--color-muted)" }} contentStyle={tooltipStyle} />
                <Bar dataKey="passagens" radius={[6, 6, 0, 0]} fill="var(--color-primary)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <SourceNote>Fonte: ANTT, MONITRIIP. Só linhas interestaduais.</SourceNote>
        </SectionCard>

        <SectionCard title="Alertas e ocorrências" bodyClassName="p-0">
          {alertas.length === 0 ? (
            <EmptyState
              message={
                carregandoViagens ? "Carregando…" : "Nenhuma ocorrência na operação de hoje."
              }
            />
          ) : (
            <ul>
              {alertas.map((a) => {
                const Icon = alertIcon[a.kind];
                return (
                  <li key={a.id}>
                    <Link
                      to={a.to}
                      className="flex items-center gap-3 border-b border-border/60 px-5 py-3.5 transition-colors last:border-0 hover:bg-muted/70"
                    >
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-${alertTone[a.kind]}-soft text-${alertTone[a.kind]}`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="flex-1 text-sm">{a.text}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>
    </>
  );
}
