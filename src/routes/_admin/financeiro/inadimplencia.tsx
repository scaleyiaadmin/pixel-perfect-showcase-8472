import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { toast } from "sonner";
import { Building2, CalendarClock, CircleCheck, RefreshCw, TrendingDown } from "lucide-react";
import {
  DataTable,
  EmptyState,
  PageHeader,
  QueryState,
  SectionCard,
  SourceNote,
  StatCard,
  StatGrid,
  StatusBadge,
  toneText,
  type Column,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { brl, num, tituloNome } from "@/lib/format";
import { usePermissao } from "@/services/acesso";
import { useEmpresas } from "@/services/dados-publicos";
import {
  competenciaLegivel,
  dataISO,
  diasDesde,
  emAtraso,
  mapaEmpresas,
  mensagemErro,
  useAtualizarInadimplencia,
  useTaxas,
} from "@/services/financeiro";

export const Route = createFileRoute("/_admin/financeiro/inadimplencia")({
  head: () => ({
    meta: [
      { title: "Inadimplência — SisRodov Manhuaçu" },
      {
        name: "description",
        content: "Valores vencidos de taxas do Terminal Rodoviário de Manhuaçu por empresa.",
      },
      { property: "og:title", content: "Inadimplência — SisRodov Manhuaçu" },
      {
        property: "og:description",
        content: "Valores vencidos de taxas por empresa, em linguagem neutra.",
      },
    ],
  }),
  component: OverduePage,
});

interface Row {
  id: string;
  company: string;
  amount: number;
  count: number;
  competencias: string[];
  oldestDue: string;
  days: number;
}

function OverduePage() {
  const empresas = useEmpresas();
  const empresa = mapaEmpresas(empresas.data);
  const taxas = useTaxas({ status: ["pendente", "inadimplente"] });
  const atualizar = useAtualizarInadimplencia();
  const { editar } = usePermissao("financeiro");

  const rows: Row[] = useMemo(() => {
    const porEmpresa = new Map<string, Row>();
    for (const t of taxas.data ?? []) {
      // Inclui pendentes já vencidas que o job diário ainda não marcou.
      if (!emAtraso(t) || t.saldo <= 0) continue;
      const r = porEmpresa.get(t.empresa_id) ?? {
        id: t.empresa_id,
        company: tituloNome(empresa(t.empresa_id)),
        amount: 0,
        count: 0,
        competencias: [],
        oldestDue: t.vencimento,
        days: 0,
      };
      r.amount += t.saldo;
      r.count += 1;
      r.competencias.push(t.competencia);
      if (t.vencimento < r.oldestDue) r.oldestDue = t.vencimento;
      r.days = diasDesde(r.oldestDue);
      porEmpresa.set(t.empresa_id, r);
    }
    return [...porEmpresa.values()].sort((a, b) => b.amount - a.amount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taxas.data, empresas.data]);

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const maiorAtraso = rows.reduce((m, r) => Math.max(m, r.days), 0);

  async function recalcular() {
    try {
      const n = await atualizar.mutateAsync();
      toast.success(n ? `${n} taxa(s) marcada(s) como inadimplente.` : "Situação já atualizada.");
    } catch (e) {
      toast.error(mensagemErro(e));
    }
  }

  const columns: Column<Row>[] = [
    {
      key: "company",
      header: "Empresa",
      mobile: "title",
      cellClassName: "min-w-[12rem]",
      render: (r) => <span className="font-semibold">{r.company}</span>,
    },
    {
      key: "amount",
      header: "Valor vencido",
      align: "right",
      nowrap: true,
      mobile: "meta",
      render: (r) => <span className="tabular font-semibold">{brl(r.amount)}</span>,
    },
    {
      key: "count",
      header: "Taxas",
      align: "right",
      mobile: "meta",
      render: (r) => <span className="tabular">{num(r.count)}</span>,
    },
    {
      key: "comp",
      header: "Competências",
      mobile: "subtitle",
      render: (r) => (
        <span className="tabular text-muted-foreground">
          {[...r.competencias].sort().map(competenciaLegivel).join(", ")}
        </span>
      ),
    },
    {
      key: "due",
      header: "Venc. mais antigo",
      nowrap: true,
      mobile: "meta",
      render: (r) => <span className="tabular">{dataISO(r.oldestDue)}</span>,
    },
    {
      key: "days",
      header: "Dias em atraso",
      align: "right",
      mobile: "meta",
      render: (r) => <span className="tabular">{r.days}</span>,
    },
    {
      key: "status",
      header: "Situação",
      mobile: "badge",
      render: () => <StatusBadge tone="danger">Em aberto</StatusBadge>,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Financeiro"
        title="Inadimplência"
        subtitle="Taxas vencidas e não quitadas, agrupadas por empresa."
        actions={
          editar ? (
            <Button variant="outline" onClick={recalcular} disabled={atualizar.isPending}>
              <RefreshCw className={`h-4 w-4 ${atualizar.isPending ? "animate-spin" : ""}`} />{" "}
              Atualizar situação
            </Button>
          ) : undefined
        }
      />
      <StatGrid cols={3}>
        <StatCard
          label="Total vencido"
          value={<span className={toneText.danger}>{brl(total)}</span>}
          icon={TrendingDown}
          tone="danger"
        />
        <StatCard
          label="Empresas com valores em aberto"
          value={num(rows.length)}
          icon={Building2}
          tone="neutral"
        />
        <StatCard
          label="Maior atraso"
          value={rows.length ? `${num(maiorAtraso)} ${maiorAtraso === 1 ? "dia" : "dias"}` : "—"}
          icon={CalendarClock}
          tone="warning"
        />
      </StatGrid>
      <div className="mt-6">
        <SectionCard title="Valores vencidos por empresa" bodyClassName="p-0">
          <QueryState isLoading={taxas.isLoading} error={taxas.error} />
          {taxas.data && (
            <DataTable
              columns={columns}
              rows={rows}
              empty={
                <EmptyState
                  icon={CircleCheck}
                  title="Nenhum valor vencido"
                  message="Taxas pendentes passam a inadimplentes automaticamente no dia seguinte ao vencimento (verificação diária às 06:00)."
                />
              }
            />
          )}
        </SectionCard>
        <SourceNote>
          Relação apresentada apenas por valores, sem qualquer julgamento sobre as empresas. Valor
          vencido = valor da taxa menos pagamentos confirmados.
        </SourceNote>
      </div>
    </>
  );
}
