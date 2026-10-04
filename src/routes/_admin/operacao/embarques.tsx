import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CalendarRange, Users } from "lucide-react";
import {
  DataTable,
  FilterBar,
  PageHeader,
  QueryState,
  SectionCard,
  StatCard,
  StatusBadge,
  tripStatusTone,
  type Column,
} from "@/components/common";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { hora, num } from "@/lib/format";
import {
  dataBR,
  horaPrevista,
  nomeEmpresaViagem,
  somarDias,
  useEmbarquesPorDia,
  useEmbarquesPorViagem,
  useHoje,
  useViagensDoDia,
  type EmbarquesViagem,
  type ViagemDetalhada,
} from "@/services/operacao";

export const Route = createFileRoute("/_admin/operacao/embarques")({
  head: () => ({
    meta: [
      { title: "Embarques — SisRodov Manhuaçu" },
      {
        name: "description",
        content:
          "Acompanhamento dos embarques registrados por viagem, empresa e destino no terminal de Manhuaçu.",
      },
      { property: "og:title", content: "Embarques — SisRodov Manhuaçu" },
      {
        property: "og:description",
        content: "Embarques registrados por viagem, empresa e destino.",
      },
    ],
  }),
  component: BoardingsPage,
});

type Linha = ViagemDetalhada & { emb: EmbarquesViagem | undefined };

function BoardingsPage() {
  const navigate = useNavigate();
  const hoje = useHoje();
  const [data, setData] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [company, setCompany] = useState("todas");
  const [somenteComEmbarque, setSomenteComEmbarque] = useState("com");

  useEffect(() => {
    if (hoje && !data) setData(hoje);
  }, [hoje, data]);

  const inicioMes = hoje ? `${hoje.slice(0, 8)}01` : null;
  const seteDias = hoje ? somarDias(hoje, -6) : null;
  const desde = inicioMes && seteDias ? (inicioMes < seteDias ? inicioMes : seteDias) : null;

  const porDia = useEmbarquesPorDia(desde);
  const viagens = useViagensDoDia(data);
  const embarques = useEmbarquesPorViagem(data);

  const totais = useMemo(() => {
    const dias = porDia.data ?? [];
    const soma = (f: (d: string) => boolean) =>
      dias.filter((d) => f(d.dia)).reduce((s, d) => s + d.acessos, 0);
    return {
      hoje: hoje ? soma((d) => d === hoje) : 0,
      semana: seteDias ? soma((d) => d >= seteDias) : 0,
      mes: inicioMes ? soma((d) => d >= inicioMes) : 0,
    };
  }, [porDia.data, hoje, seteDias, inicioMes]);

  const empresasDoDia = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of viagens.data ?? []) if (v.empresa) m.set(v.empresa.id, nomeEmpresaViagem(v));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [viagens.data]);

  const rows: Linha[] = useMemo(
    () =>
      (viagens.data ?? [])
        .map((v) => ({ ...v, emb: embarques.data?.get(v.id) }))
        .filter((v) => {
          const q = search.trim().toLowerCase();
          return (
            (!q ||
              `${v.numero} ${v.origem} ${v.destino} ${nomeEmpresaViagem(v)}`
                .toLowerCase()
                .includes(q)) &&
            (company === "todas" || v.empresa_id === company) &&
            (somenteComEmbarque === "todas" || v.emb)
          );
        }),
    [viagens.data, embarques.data, search, company, somenteComEmbarque],
  );

  const columns: Column<Linha>[] = [
    {
      key: "time",
      header: "Previsto",
      render: (v) => <span className="tabular font-semibold">{horaPrevista(v)}</span>,
    },
    { key: "company", header: "Empresa", render: (v) => nomeEmpresaViagem(v) },
    { key: "dest", header: "Destino", render: (v) => v.destino },
    {
      key: "trip",
      header: "Viagem",
      render: (v) => <span className="tabular text-muted-foreground">{v.numero || "—"}</span>,
    },
    {
      key: "boardings",
      header: "Acessos",
      align: "right",
      render: (v) => <span className="tabular font-semibold">{num(v.emb?.acessos ?? 0)}</span>,
    },
    {
      key: "reentradas",
      header: "Reentradas",
      align: "right",
      render: (v) => <span className="tabular">{num(v.emb?.reentradas ?? 0)}</span>,
    },
    {
      key: "negados",
      header: "Negados",
      align: "right",
      render: (v) => (
        <span className={`tabular ${v.emb?.negados ? "font-semibold text-danger" : ""}`}>
          {num(v.emb?.negados ?? 0)}
        </span>
      ),
    },
    {
      key: "ultimo",
      header: "Última leitura",
      render: (v) => (
        <span className="tabular text-muted-foreground">
          {v.emb?.ultimo_evento_em ? hora(v.emb.ultimo_evento_em) : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Viagem",
      render: (v) => (
        <StatusBadge tone={tripStatusTone[v.status].tone}>
          {tripStatusTone[v.status].label}
        </StatusBadge>
      ),
    },
  ];

  const carregandoTotais = !desde || porDia.isLoading;

  return (
    <>
      <PageHeader
        title="Embarques"
        subtitle="Acessos registrados pelas catracas do terminal, por viagem"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Embarques hoje"
          value={carregandoTotais ? "—" : num(totais.hoje)}
          icon={Users}
          hint="acessos confirmados na catraca"
        />
        <StatCard
          label="Últimos 7 dias"
          value={carregandoTotais ? "—" : num(totais.semana)}
          icon={CalendarDays}
          tone="info"
        />
        <StatCard
          label="Mês atual"
          value={carregandoTotais ? "—" : num(totais.mes)}
          icon={CalendarRange}
          tone="neutral"
        />
      </div>
      <QueryState isLoading={false} error={porDia.error} />

      <div className="mt-6">
        <FilterBar
          search={search}
          onSearch={setSearch}
          placeholder="Pesquisar viagem, empresa ou destino..."
        >
          <Input
            type="date"
            value={data ?? ""}
            onChange={(e) => e.target.value && setData(e.target.value)}
            className="h-9 w-[10.5rem]"
            aria-label="Data"
          />
          <Select value={company} onValueChange={setCompany}>
            <SelectTrigger className="h-9 w-[13rem]">
              <SelectValue placeholder="Empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as empresas</SelectItem>
              {empresasDoDia.map(([id, nome]) => (
                <SelectItem key={id} value={id}>
                  {nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={somenteComEmbarque} onValueChange={setSomenteComEmbarque}>
            <SelectTrigger className="h-9 w-[13rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="com">Só viagens com leituras</SelectItem>
              <SelectItem value="todas">Todas as viagens do dia</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>

        <SectionCard bodyClassName="p-0">
          <QueryState
            isLoading={!data || viagens.isLoading || embarques.isLoading}
            error={viagens.error ?? embarques.error}
          />
          {viagens.data && embarques.data && (
            <DataTable
              columns={columns}
              rows={rows}
              onRowClick={(v) =>
                navigate({ to: "/operacao/viagens/$tripId", params: { tripId: v.id } })
              }
              emptyMessage={
                somenteComEmbarque === "com"
                  ? `Nenhuma leitura de catraca vinculada a viagens em ${data ? dataBR(data) : "esta data"}. Os acessos chegam pela integração das catracas do terminal.`
                  : "Nenhuma viagem nesta data."
              }
            />
          )}
        </SectionCard>
        <p className="mt-3 text-xs text-muted-foreground">
          Fonte: catracas/validadores do terminal (integração automática). Leituras sem viagem
          vinculada aparecem em Controle de Embarque.
        </p>
      </div>
    </>
  );
}
