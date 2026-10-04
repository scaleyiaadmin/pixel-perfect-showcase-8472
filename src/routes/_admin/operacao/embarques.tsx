import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CalendarRange, ScanLine, Users } from "lucide-react";
import {
  DataTable,
  EmptyState,
  FilterBar,
  FilterSelect,
  PageHeader,
  QueryState,
  SectionCard,
  StatCard,
  StatGrid,
  StatusBadge,
  Vazio,
  tripStatusTone,
  type Column,
} from "@/components/common";
import { Input } from "@/components/ui/input";
import { hora, num, tituloNome } from "@/lib/format";
import { EmpresaViagem } from "./viagens.index";
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
    for (const v of viagens.data ?? [])
      if (v.empresa) m.set(v.empresa.id, tituloNome(nomeEmpresaViagem(v)));
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
      nowrap: true,
      mobile: "meta",
      render: (v) =>
        v.previsto_em ? (
          <span className="tabular font-semibold">{horaPrevista(v)}</span>
        ) : (
          <Vazio title="Horário no terminal a informar" />
        ),
    },
    {
      key: "dest",
      header: "Destino",
      mobile: "title",
      cellClassName: "min-w-[10rem] font-medium",
      render: (v) => tituloNome(v.destino),
    },
    {
      key: "company",
      header: "Empresa",
      mobile: "subtitle",
      cellClassName: "min-w-[10rem]",
      render: (v) => <EmpresaViagem v={v} />,
    },
    {
      key: "trip",
      header: "Nº",
      nowrap: true,
      hideOnMobile: true,
      className: "hidden xl:table-cell",
      cellClassName: "hidden xl:table-cell",
      render: (v) =>
        v.numero ? <span className="tabular text-muted-foreground">{v.numero}</span> : <Vazio />,
    },
    {
      key: "boardings",
      header: "Acessos",
      align: "right",
      nowrap: true,
      mobile: "meta",
      render: (v) => <span className="tabular font-semibold">{num(v.emb?.acessos ?? 0)}</span>,
    },
    {
      key: "reentradas",
      header: "Reentradas",
      align: "right",
      nowrap: true,
      hideOnMobile: true,
      className: "hidden xl:table-cell",
      cellClassName: "hidden xl:table-cell",
      render: (v) => <span className="tabular">{num(v.emb?.reentradas ?? 0)}</span>,
    },
    {
      key: "negados",
      header: "Negados",
      align: "right",
      nowrap: true,
      mobile: "meta",
      render: (v) => (
        <span className={`tabular ${v.emb?.negados ? "font-semibold text-danger" : ""}`}>
          {num(v.emb?.negados ?? 0)}
        </span>
      ),
    },
    {
      key: "ultimo",
      header: "Última leitura",
      nowrap: true,
      hideOnMobile: true,
      className: "hidden xl:table-cell",
      cellClassName: "hidden xl:table-cell",
      render: (v) =>
        v.emb?.ultimo_evento_em ? (
          <span className="tabular text-muted-foreground">{hora(v.emb.ultimo_evento_em)}</span>
        ) : (
          <Vazio />
        ),
    },
    {
      key: "status",
      header: "Status",
      nowrap: true,
      mobile: "badge",
      render: (v) => (
        <StatusBadge size="sm" tone={tripStatusTone[v.status].tone}>
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

      <StatGrid cols={3}>
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
      </StatGrid>
      <QueryState isLoading={false} error={porDia.error} />

      <div className="mt-6">
        <FilterBar search={search} onSearch={setSearch} placeholder="Buscar viagem ou destino">
          <label className="flex items-center gap-2 text-sm">
            <span className="shrink-0 font-medium text-muted-foreground">Data</span>
            <Input
              type="date"
              value={data ?? ""}
              onChange={(e) => e.target.value && setData(e.target.value)}
              className="tabular h-11 w-full bg-card sm:h-9 sm:w-[10.5rem]"
            />
          </label>
          <FilterSelect
            value={company}
            onValueChange={setCompany}
            placeholder="Empresa"
            allLabel="Todas as empresas"
            allValue="todas"
            options={empresasDoDia.map(([id, nome]) => ({ value: id, label: nome }))}
          />
          <FilterSelect
            value={somenteComEmbarque}
            onValueChange={setSomenteComEmbarque}
            aria-label="Viagens exibidas"
            options={[
              { value: "com", label: "Só viagens com leituras" },
              { value: "todas", label: "Todas as viagens do dia" },
            ]}
          />
        </FilterBar>

        <SectionCard bodyClassName="p-0">
          <QueryState
            isLoading={!data || viagens.isLoading || embarques.isLoading}
            error={viagens.error ?? embarques.error}
          />
          {viagens.data && embarques.data && (
            <DataTable
              minWidth="40rem"
              columns={columns}
              rows={rows}
              onRowClick={(v) =>
                navigate({ to: "/operacao/viagens/$tripId", params: { tripId: v.id } })
              }
              empty={
                somenteComEmbarque === "com" ? (
                  <EmptyState
                    icon={ScanLine}
                    title={`Sem leituras em ${data ? dataBR(data) : "esta data"}`}
                    message="Os acessos chegam pela integração das catracas do terminal."
                  />
                ) : (
                  <EmptyState message="Nenhuma viagem nesta data." />
                )
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
