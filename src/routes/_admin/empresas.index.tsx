import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Building2, CalendarCheck, Clock, Route as RouteIcon } from "lucide-react";
import {
  DataTable,
  FilterBar,
  PageHeader,
  QueryState,
  SectionCard,
  SourceNote,
  StatCard,
  StatGrid,
  StatusBadge,
  Vazio,
  ouVazio,
  type Column,
} from "@/components/common";
import {
  formatCnpj,
  partidasDoDia,
  useEmpresas,
  useHorarios,
  useLinhas,
} from "@/services/dados-publicos";
import {
  nomeExibicao,
  podeVer,
  usePerfil,
  useTaxasTodas,
  useViagensDoDia,
  type EmpresaCadastro,
} from "@/services/acesso";
import { brl, hojeISO, num, tituloNome } from "@/lib/format";

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

interface Row extends EmpresaCadastro {
  linhas: number;
  partidasHoje: number;
  viagensHoje: number;
  taxasEmAberto: number;
}

function CompaniesPage() {
  const navigate = useNavigate();
  const { perfil } = usePerfil();
  const [search, setSearch] = useState("");
  const empresas = useEmpresas();
  const linhas = useLinhas();
  const horarios = useHorarios();
  const viagens = useViagensDoDia(hojeISO());
  const verFinanceiro = podeVer(perfil?.papel, "financeiro") && perfil?.papel !== "empresa";
  const taxas = useTaxasTodas(verFinanceiro);

  // Usuário de empresa só vê a própria empresa.
  const empresaPropria = perfil?.papel === "empresa" ? perfil.empresa_id : null;
  useEffect(() => {
    if (empresaPropria)
      navigate({
        to: "/empresas/$companyId",
        params: { companyId: empresaPropria },
        replace: true,
      });
  }, [empresaPropria, navigate]);

  const rows = useMemo<Row[]>(() => {
    const partidas = partidasDoDia(horarios.data ?? [], new Date());
    const q = search.trim().toLowerCase();
    return ((empresas.data ?? []) as EmpresaCadastro[])
      .filter(
        (e) =>
          !q ||
          `${e.razao_social} ${e.nome_fantasia ?? ""} ${e.cnpj} ${e.codigo_antt ?? ""}`
            .toLowerCase()
            .includes(q),
      )
      .map((e) => ({
        ...e,
        linhas: (linhas.data ?? []).filter((l) => l.empresa_id === e.id).length,
        partidasHoje: partidas.filter((h) => h.linha.empresa_id === e.id).length,
        viagensHoje: (viagens.data ?? []).filter((v) => v.empresa_id === e.id).length,
        taxasEmAberto: (taxas.data ?? [])
          .filter(
            (t) =>
              t.empresa_id === e.id && (t.status === "pendente" || t.status === "inadimplente"),
          )
          .reduce((s, t) => s + Number(t.valor), 0),
      }));
  }, [empresas.data, linhas.data, horarios.data, viagens.data, taxas.data, search]);

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Empresa",
      mobile: "title",
      cellClassName: "min-w-[14rem]",
      render: (c) => (
        <span className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-border"
            style={c.cor ? { backgroundColor: c.cor } : undefined}
          />
          <span className="min-w-0">
            <span className="block font-semibold text-foreground">
              {tituloNome(nomeExibicao(c))}
            </span>
            {c.nome_fantasia?.trim() && (
              <span
                className="block truncate text-xs font-normal text-muted-foreground"
                title={c.razao_social}
              >
                {tituloNome(c.razao_social)}
              </span>
            )}
          </span>
        </span>
      ),
    },
    {
      key: "cnpj",
      header: "CNPJ",
      nowrap: true,
      mobile: "subtitle",
      render: (c) => <span className="tabular text-muted-foreground">{formatCnpj(c.cnpj)}</span>,
    },
    {
      key: "fonte",
      header: "Fonte",
      hideOnMobile: true,
      nowrap: true,
      // Some no tablet para a tabela caber sem rolagem (a fonte aparece no detalhe).
      className: "hidden xl:table-cell",
      cellClassName: "hidden xl:table-cell",
      render: (c) => ouVazio(c.fonte),
    },
    {
      key: "lines",
      header: "Linhas",
      align: "right",
      nowrap: true,
      mobile: "meta",
      render: (c) => <span className="tabular">{c.linhas}</span>,
    },
    {
      key: "trips",
      header: "Partidas hoje",
      align: "right",
      nowrap: true,
      mobile: "meta",
      render: (c) => <span className="tabular">{c.partidasHoje}</span>,
    },
    {
      key: "viagens",
      header: "Viagens hoje",
      align: "right",
      nowrap: true,
      mobile: "meta",
      render: (c) => (viagens.data ? <span className="tabular">{c.viagensHoje}</span> : <Vazio />),
    },
    ...(verFinanceiro
      ? [
          {
            key: "taxas",
            header: "Taxas em aberto",
            align: "right" as const,
            nowrap: true,
            mobile: "meta" as const,
            render: (c: Row) =>
              taxas.data && c.taxasEmAberto > 0 ? (
                <span className="tabular font-medium">{brl(c.taxasEmAberto)}</span>
              ) : (
                <Vazio />
              ),
          },
        ]
      : []),
    {
      key: "status",
      header: "Status",
      mobile: "badge",
      render: (c) =>
        !c.ativa ? (
          <StatusBadge size="sm" tone="neutral">
            Inativa
          </StatusBadge>
        ) : c.opera_no_terminal ? (
          <StatusBadge size="sm" tone="success">
            No terminal
          </StatusBadge>
        ) : (
          <StatusBadge size="sm" tone="neutral">
            Fora do terminal
          </StatusBadge>
        ),
    },
  ];

  const partidasHoje = partidasDoDia(horarios.data ?? [], new Date()).length;
  const viagensHoje = viagens.data?.length;

  if (empresaPropria) return <QueryState isLoading error={null} />;

  return (
    <>
      <PageHeader
        title="Empresas de transporte"
        subtitle="Empresas com linhas autorizadas que atendem Manhuaçu."
      />

      <StatGrid>
        <StatCard label="Empresas" value={empresas.data?.length ?? "—"} icon={Building2} />
        <StatCard label="Linhas" value={linhas.data?.length ?? "—"} icon={RouteIcon} tone="info" />
        <StatCard
          label="Partidas hoje"
          value={horarios.data ? num(partidasHoje) : "—"}
          hint="Pelos horários publicados"
          icon={Clock}
          tone="success"
        />
        <StatCard
          label="Viagens hoje"
          value={viagensHoje === undefined ? "—" : num(viagensHoje)}
          hint={viagensHoje === 0 ? "Via integração ou lançamento da equipe" : undefined}
          icon={CalendarCheck}
          tone="warning"
        />
      </StatGrid>

      <div className="mt-6">
        <FilterBar search={search} onSearch={setSearch} placeholder="Buscar empresa ou CNPJ" />
        <SectionCard bodyClassName="p-0">
          <QueryState isLoading={empresas.isLoading} error={empresas.error} />
          {(viagens.error || taxas.error) && (
            <p className="border-b border-border px-4 py-2 text-xs text-danger">
              Não foi possível carregar {viagens.error ? "as viagens de hoje" : "as taxas"}.
            </p>
          )}
          {empresas.data && (
            <DataTable
              columns={columns}
              rows={rows}
              emptyMessage={
                search.trim()
                  ? "Nenhuma empresa encontrada para a busca."
                  : "Nenhuma empresa cadastrada."
              }
              onRowClick={(c) =>
                navigate({ to: "/empresas/$companyId", params: { companyId: c.id } })
              }
            />
          )}
        </SectionCard>
        <SourceNote>
          Fonte: ANTT, Dados Abertos (linhas interestaduais). O DER-MG não publica a empresa
          operadora das linhas intermunicipais. Viagens e taxas vêm das integrações com as empresas
          e dos lançamentos da equipe do terminal.
        </SourceNote>
      </div>
    </>
  );
}
