import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Building2, Clock, Route as RouteIcon } from "lucide-react";
import {
  DataTable,
  FilterBar,
  PageHeader,
  QueryState,
  SectionCard,
  SourceNote,
  StatCard,
  StatusBadge,
  type Column,
} from "@/components/common";
import {
  formatCnpj,
  partidasDoDia,
  useEmpresas,
  useHorarios,
  useLinhas,
  type Empresa,
} from "@/services/dados-publicos";
import { num } from "@/data/mock";

export const Route = createFileRoute("/_admin/empresas/")({
  head: () => ({
    meta: [
      { title: "Empresas de Transporte — SisRodov Manhuaçu" },
      {
        name: "description",
        content:
          "Empresas de transporte que operam no Terminal Rodoviário de Manhuaçu e seus indicadores.",
      },
      { property: "og:title", content: "Empresas de Transporte — SisRodov Manhuaçu" },
      { property: "og:description", content: "Empresas operadoras, linhas e horários." },
    ],
  }),
  component: CompaniesPage,
});

interface Row extends Empresa {
  linhas: number;
  partidasHoje: number;
}

function CompaniesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const empresas = useEmpresas();
  const linhas = useLinhas();
  const horarios = useHorarios();

  const rows = useMemo<Row[]>(() => {
    const hoje = partidasDoDia(horarios.data ?? [], new Date());
    const q = search.trim().toLowerCase();
    return (empresas.data ?? [])
      .filter((e) => !q || `${e.razao_social} ${e.cnpj}`.toLowerCase().includes(q))
      .map((e) => ({
        ...e,
        linhas: (linhas.data ?? []).filter((l) => l.empresa_id === e.id).length,
        partidasHoje: hoje.filter((h) => h.linha.empresa_id === e.id).length,
      }));
  }, [empresas.data, linhas.data, horarios.data, search]);

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Empresa",
      render: (c) => <span className="font-semibold">{c.razao_social}</span>,
    },
    {
      key: "cnpj",
      header: "CNPJ",
      render: (c) => <span className="tabular text-muted-foreground">{formatCnpj(c.cnpj)}</span>,
    },
    { key: "fonte", header: "Fonte", render: (c) => c.fonte },
    {
      key: "lines",
      header: "Linhas",
      align: "right",
      render: (c) => <span className="tabular">{c.linhas}</span>,
    },
    {
      key: "trips",
      header: "Partidas hoje",
      align: "right",
      render: (c) => <span className="tabular">{c.partidasHoje}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (c) => (
        <StatusBadge tone={c.ativa ? "success" : "neutral"}>
          {c.ativa ? "Ativa" : "Inativa"}
        </StatusBadge>
      ),
    },
  ];

  const partidasHoje = partidasDoDia(horarios.data ?? [], new Date()).length;

  return (
    <>
      <PageHeader
        title="Empresas de Transporte"
        subtitle="Empresas com linhas autorizadas que atendem Manhuaçu"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Empresas" value={empresas.data?.length ?? "—"} icon={Building2} />
        <StatCard label="Linhas" value={linhas.data?.length ?? "—"} icon={RouteIcon} tone="info" />
        <StatCard
          label="Partidas hoje"
          value={horarios.data ? num(partidasHoje) : "—"}
          icon={Clock}
          tone="success"
        />
      </div>

      <div className="mt-6">
        <FilterBar
          search={search}
          onSearch={setSearch}
          placeholder="Pesquisar empresa ou CNPJ..."
        />
        <SectionCard bodyClassName="p-0">
          <QueryState isLoading={empresas.isLoading} error={empresas.error} />
          {empresas.data && (
            <DataTable
              columns={columns}
              rows={rows}
              onRowClick={(c) =>
                navigate({ to: "/empresas/$companyId", params: { companyId: c.id } })
              }
            />
          )}
        </SectionCard>
        <SourceNote>
          Fonte: ANTT, Dados Abertos (linhas interestaduais). O DER-MG não publica a empresa
          operadora das linhas intermunicipais.
        </SourceNote>
      </div>
    </>
  );
}
