import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Building2 } from "lucide-react";
import {
  DataTable,
  EmptyState,
  PageHeader,
  QueryState,
  SectionCard,
  SourceNote,
  StatCard,
  StatusBadge,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  descreverDias,
  destinoDaPartida,
  formatCnpj,
  horaCurta,
  partidasDoDia,
  useEmpresas,
  useHorarios,
  useLinhas,
} from "@/services/dados-publicos";

export const Route = createFileRoute("/_admin/empresas/$companyId")({
  head: () => ({
    meta: [
      { title: "Detalhe da empresa — SisRodov Manhuaçu" },
      {
        name: "description",
        content: "Linhas e horários da empresa de transporte no Terminal Rodoviário de Manhuaçu.",
      },
      { property: "og:title", content: "Detalhe da empresa — SisRodov Manhuaçu" },
      { property: "og:description", content: "Linhas e horários da empresa." },
    ],
  }),
  component: CompanyDetail,
});

function CompanyDetail() {
  const { companyId } = Route.useParams();
  const empresas = useEmpresas();
  const linhas = useLinhas();
  const horarios = useHorarios();

  const company = empresas.data?.find((c) => c.id === companyId);
  const companyLines = (linhas.data ?? []).filter((l) => l.empresa_id === companyId);
  const companySchedules = (horarios.data ?? []).filter(
    (h) => h.linha.empresa_id === companyId && h.parte_de_manhuacu,
  );
  const today = partidasDoDia(companySchedules, new Date());

  const back = (
    <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
      <Link to="/empresas">
        <ArrowLeft className="h-4 w-4" /> Voltar para empresas
      </Link>
    </Button>
  );

  if (empresas.isLoading || empresas.error) {
    return (
      <>
        {back}
        <QueryState isLoading={empresas.isLoading} error={empresas.error} />
      </>
    );
  }
  if (!company) {
    return (
      <>
        {back}
        <EmptyState message="Empresa não encontrada." />
      </>
    );
  }

  return (
    <>
      {back}

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="grid h-16 w-16 place-items-center rounded-xl gradient-institutional text-primary-foreground">
          <Building2 className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold">{company.razao_social}</h1>
          <p className="text-sm text-muted-foreground">
            CNPJ {formatCnpj(company.cnpj)} · Fonte {company.fonte}
          </p>
        </div>
        <StatusBadge tone={company.ativa ? "success" : "neutral"}>
          {company.ativa ? "Ativa" : "Inativa"}
        </StatusBadge>
      </div>

      <PageHeader title="Painel da empresa" subtitle="Linhas autorizadas que atendem Manhuaçu" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Linhas" value={companyLines.length} />
        <StatCard
          label="Partidas de Manhuaçu por semana"
          value={companySchedules.reduce((s, h) => s + h.dias_semana.length, 0)}
          tone="info"
        />
        <StatCard label="Partidas hoje" value={today.length} tone="success" />
      </div>

      <div className="mt-6">
        <Tabs defaultValue="linhas">
          <TabsList className="flex-wrap">
            <TabsTrigger value="linhas">Linhas</TabsTrigger>
            <TabsTrigger value="horarios">Horários</TabsTrigger>
          </TabsList>

          <TabsContent value="linhas" className="mt-4">
            <SectionCard title="Linhas operadas" bodyClassName="p-0">
              <QueryState isLoading={linhas.isLoading} error={linhas.error} />
              {linhas.data && (
                <DataTable
                  columns={[
                    {
                      key: "code",
                      header: "Prefixo",
                      render: (l) => <span className="tabular font-semibold">{l.codigo}</span>,
                    },
                    { key: "desc", header: "Linha", render: (l) => l.descricao },
                    {
                      key: "rel",
                      header: "Em Manhuaçu",
                      render: (l) => <span className="capitalize">{l.relacao_manhuacu}</span>,
                    },
                    {
                      key: "cities",
                      header: "Cidades atendidas a partir de Manhuaçu",
                      render: (l) => (
                        <span className="text-muted-foreground">
                          {l.cidades_atendidas.join(", ")}
                        </span>
                      ),
                    },
                  ]}
                  rows={companyLines}
                />
              )}
            </SectionCard>
          </TabsContent>

          <TabsContent value="horarios" className="mt-4">
            <SectionCard title="Partidas do terminal de Manhuaçu" bodyClassName="p-0">
              <QueryState isLoading={horarios.isLoading} error={horarios.error} />
              {horarios.data && (
                <DataTable
                  columns={[
                    {
                      key: "time",
                      header: "Horário",
                      render: (h) => (
                        <span className="tabular font-semibold">{horaCurta(h.hora)}</span>
                      ),
                    },
                    { key: "dest", header: "Destino", render: (h) => destinoDaPartida(h) },
                    { key: "type", header: "Serviço", render: (h) => h.tipo_servico || "—" },
                    { key: "days", header: "Dias", render: (h) => descreverDias(h.dias_semana) },
                    {
                      key: "line",
                      header: "Linha",
                      render: (h) => (
                        <span className="tabular text-muted-foreground">{h.linha.codigo}</span>
                      ),
                    },
                  ]}
                  rows={companySchedules}
                  emptyMessage="A ANTT não publica horário de partida em Manhuaçu para as linhas desta empresa que só passam pela cidade."
                />
              )}
            </SectionCard>
          </TabsContent>
        </Tabs>
        <SourceNote>
          Fonte: ANTT, Dados Abertos (SIGMA). Passagens, embarques e taxas da empresa aparecem
          quando a integração com a empresa estiver ativa.
        </SourceNote>
      </div>
    </>
  );
}
