import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import {
  DataTable,
  PageHeader,
  QueryState,
  SectionCard,
  StatCard,
  StatusBadge,
  type Column,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/format";
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
        company: empresa(t.empresa_id),
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
      render: (r) => <span className="font-semibold">{r.company}</span>,
    },
    {
      key: "amount",
      header: "Valor vencido",
      align: "right",
      render: (r) => <span className="tabular">{brl(r.amount)}</span>,
    },
    {
      key: "count",
      header: "Taxas",
      align: "right",
      render: (r) => <span className="tabular">{r.count}</span>,
    },
    {
      key: "comp",
      header: "Competências",
      render: (r) => (
        <span className="tabular text-muted-foreground">
          {[...r.competencias].sort().map(competenciaLegivel).join(", ")}
        </span>
      ),
    },
    {
      key: "due",
      header: "Vencimento mais antigo",
      render: (r) => <span className="tabular">{dataISO(r.oldestDue)}</span>,
    },
    {
      key: "days",
      header: "Dias em atraso",
      align: "right",
      render: (r) => <span className="tabular">{r.days}</span>,
    },
    {
      key: "status",
      header: "Situação",
      render: () => <StatusBadge tone="danger">Em aberto</StatusBadge>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Financeiro · Inadimplência"
        subtitle="Taxas vencidas e não quitadas, agrupadas por empresa"
        actions={
          editar ? (
            <Button variant="outline" onClick={recalcular} disabled={atualizar.isPending}>
              <RefreshCw className={`h-4 w-4 ${atualizar.isPending ? "animate-spin" : ""}`} />{" "}
              Atualizar situação
            </Button>
          ) : undefined
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Total vencido" value={brl(total)} tone="danger" />
        <StatCard label="Empresas com valores em aberto" value={rows.length} tone="neutral" />
      </div>
      <div className="mt-6">
        <SectionCard bodyClassName="p-0">
          <QueryState isLoading={taxas.isLoading} error={taxas.error} />
          {taxas.data && (
            <DataTable
              columns={columns}
              rows={rows}
              emptyMessage="Nenhum valor vencido. Taxas pendentes passam a inadimplentes automaticamente no dia seguinte ao vencimento (verificação diária às 06:00)."
            />
          )}
        </SectionCard>
        <p className="mt-3 text-xs text-muted-foreground italic">
          Relação apresentada apenas por valores, sem qualquer julgamento sobre as empresas. Valor
          vencido = valor da taxa menos pagamentos confirmados.
        </p>
      </div>
    </>
  );
}
