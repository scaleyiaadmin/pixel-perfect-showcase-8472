import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, HandCoins, Loader2, Undo2 } from "lucide-react";
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
  type Tone,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { brl, dataCurta } from "@/lib/format";
import { usePermissao } from "@/services/acesso";
import { useEmpresas } from "@/services/dados-publicos";
import {
  competenciaLegivel,
  mapaEmpresas,
  mensagemErro,
  nomeDaEmpresa,
  useEstornarPagamento,
  usePagamentos,
  useTaxas,
  type PagamentoComTaxa,
} from "@/services/financeiro";
import { RegistrarPagamentoDialog } from "./taxas";

export const Route = createFileRoute("/_admin/financeiro/pagamentos")({
  head: () => ({
    meta: [
      { title: "Pagamentos — SisRodov Manhuaçu" },
      {
        name: "description",
        content: "Pagamentos das taxas do Terminal Rodoviário de Manhuaçu por empresa e data.",
      },
      { property: "og:title", content: "Pagamentos — SisRodov Manhuaçu" },
      { property: "og:description", content: "Pagamentos de taxas por empresa e data." },
    ],
  }),
  component: PaymentsPage,
});

const statusMap: Record<PagamentoComTaxa["status"], { tone: Tone; label: string }> = {
  confirmado: { tone: "success", label: "Confirmado" },
  processando: { tone: "info", label: "Processando" },
  estornado: { tone: "neutral", label: "Estornado" },
};

const TODOS = "todos";

function PaymentsPage() {
  const [empresaId, setEmpresaId] = useState(TODOS);
  const [status, setStatus] = useState(TODOS);
  const [novo, setNovo] = useState(false);
  const [estornar, setEstornar] = useState<PagamentoComTaxa | null>(null);

  const empresas = useEmpresas();
  const empresa = mapaEmpresas(empresas.data);
  const pagamentos = usePagamentos();
  const taxasAbertas = useTaxas({ status: ["pendente", "inadimplente"] });
  const estorno = useEstornarPagamento();
  const { editar } = usePermissao("financeiro");

  const rows = useMemo(
    () =>
      (pagamentos.data ?? []).filter(
        (p) =>
          (empresaId === TODOS || p.empresa_id === empresaId) &&
          (status === TODOS || p.status === status),
      ),
    [pagamentos.data, empresaId, status],
  );

  const empresasComPagamento = useMemo(() => {
    const ids = new Set((pagamentos.data ?? []).map((p) => p.empresa_id));
    return (empresas.data ?? []).filter((e) => ids.has(e.id));
  }, [pagamentos.data, empresas.data]);

  const confirmado = rows.filter((p) => p.status === "confirmado").reduce((s, p) => s + p.valor, 0);
  const processando = rows
    .filter((p) => p.status === "processando")
    .reduce((s, p) => s + p.valor, 0);

  async function confirmarEstorno() {
    if (!estornar) return;
    try {
      await estorno.mutateAsync(estornar);
      toast.success("Pagamento estornado.");
      setEstornar(null);
    } catch (e) {
      toast.error(mensagemErro(e));
    }
  }

  const columns: Column<PagamentoComTaxa>[] = [
    {
      key: "paid",
      header: "Data pagamento",
      render: (p) => <span className="tabular">{dataCurta(p.pago_em)}</span>,
    },
    { key: "company", header: "Empresa", render: (p) => empresa(p.empresa_id) },
    {
      key: "fee",
      header: "Taxa",
      render: (p) =>
        p.taxa ? (
          <span className="tabular">
            {p.taxa.numero}{" "}
            <span className="text-muted-foreground">
              ({competenciaLegivel(p.taxa.competencia)})
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">Sem taxa vinculada</span>
        ),
    },
    {
      key: "amount",
      header: "Valor",
      align: "right",
      render: (p) => <span className="tabular">{brl(p.valor)}</span>,
    },
    {
      key: "method",
      header: "Meio",
      render: (p) => (
        <span>
          {p.meio || "—"}
          {p.referencia_externa && (
            <span className="block text-xs text-muted-foreground">{p.referencia_externa}</span>
          )}
        </span>
      ),
    },
    {
      key: "origin",
      header: "Origem",
      render: (p) => (
        <span className="text-muted-foreground">
          {p.integracao_id ? "Integração" : "Lançamento manual"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (p) => (
        <StatusBadge tone={statusMap[p.status].tone}>{statusMap[p.status].label}</StatusBadge>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (p) =>
        editar && p.status === "confirmado" ? (
          <Button variant="ghost" size="sm" onClick={() => setEstornar(p)}>
            <Undo2 className="h-3.5 w-3.5" /> Estornar
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Financeiro · Pagamentos"
        subtitle="Pagamentos recebidos pela integração de pagamento ou lançados pela equipe"
        actions={
          editar ? (
            <Button onClick={() => setNovo(true)}>
              <HandCoins className="h-4 w-4" /> Registrar pagamento
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Confirmados" value={brl(confirmado)} icon={CheckCircle2} tone="success" />
        <StatCard label="Em processamento" value={brl(processando)} icon={Loader2} tone="info" />
      </div>

      <div className="mt-6">
        <FilterBar>
          <Select value={empresaId} onValueChange={setEmpresaId}>
            <SelectTrigger className="h-9 w-[16rem]">
              <SelectValue placeholder="Empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todas as empresas</SelectItem>
              {empresasComPagamento.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {nomeDaEmpresa(e)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[11rem]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos os status</SelectItem>
              {Object.entries(statusMap).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterBar>

        <SectionCard bodyClassName="p-0">
          <QueryState isLoading={pagamentos.isLoading} error={pagamentos.error} />
          {pagamentos.data && (
            <DataTable
              columns={columns}
              rows={rows}
              emptyMessage={
                pagamentos.data.length === 0
                  ? "Nenhum pagamento registrado. Os pagamentos chegam pela integração com o sistema de pagamento ou são lançados manualmente pela equipe financeira."
                  : "Nenhum pagamento com esses filtros."
              }
            />
          )}
        </SectionCard>
        <SourceNote>
          Estornar mantém o registro com status "Estornado"; se a taxa deixar de estar coberta, ela
          volta a pendente (ou inadimplente, se já venceu).
        </SourceNote>
      </div>

      <RegistrarPagamentoDialog taxas={taxasAbertas.data} open={novo} onOpenChange={setNovo} />

      <Dialog open={!!estornar} onOpenChange={(o) => !o && setEstornar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Estornar pagamento</DialogTitle>
            <DialogDescription>
              {estornar &&
                `${brl(estornar.valor)} de ${empresa(estornar.empresa_id)}${
                  estornar.taxa ? ` na taxa ${estornar.taxa.numero}` : ""
                }, pago em ${dataCurta(estornar.pago_em)}. A ação fica registrada na auditoria.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEstornar(null)}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={confirmarEstorno} disabled={estorno.isPending}>
              {estorno.isPending ? "Estornando..." : "Confirmar estorno"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
