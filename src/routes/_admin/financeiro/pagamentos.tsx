import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock, HandCoins, Loader2, Receipt, Undo2 } from "lucide-react";
import {
  DataTable,
  EmptyState,
  FilterBar,
  FilterSelect,
  PageHeader,
  QueryState,
  SectionCard,
  SourceNote,
  StatCard,
  StatGrid,
  StatusBadge,
  Vazio,
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
import { brl, dataCurta, num, tituloNome } from "@/lib/format";
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

  const somar = (st: PagamentoComTaxa["status"]) => {
    const lista = rows.filter((p) => p.status === st);
    return { valor: lista.reduce((s, p) => s + p.valor, 0), qtd: lista.length };
  };
  const confirmado = somar("confirmado");
  const processando = somar("processando");
  const estornado = somar("estornado");
  const abertas = (taxasAbertas.data ?? []).filter(
    (t) => empresaId === TODOS || t.empresa_id === empresaId,
  );
  const emAberto = abertas.reduce((s, t) => s + t.saldo, 0);
  const qtdLabel = (n: number, um: string, varios: string) => `${num(n)} ${n === 1 ? um : varios}`;

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
      header: "Pago em",
      nowrap: true,
      mobile: "meta",
      render: (p) => <span className="tabular">{dataCurta(p.pago_em)}</span>,
    },
    {
      key: "company",
      header: "Empresa",
      mobile: "title",
      cellClassName: "min-w-[12rem]",
      render: (p) => tituloNome(empresa(p.empresa_id)),
    },
    {
      key: "fee",
      header: "Taxa",
      mobile: "subtitle",
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
      nowrap: true,
      mobile: "meta",
      render: (p) => <span className="tabular font-semibold">{brl(p.valor)}</span>,
    },
    {
      key: "method",
      header: "Meio",
      mobile: "meta",
      render: (p) => (
        <span>
          {p.meio || <Vazio />}
          {p.referencia_externa && (
            <span className="block text-xs text-muted-foreground">{p.referencia_externa}</span>
          )}
        </span>
      ),
    },
    {
      key: "origin",
      header: "Origem",
      nowrap: true,
      hideOnMobile: true,
      render: (p) => (
        <span className="text-muted-foreground">{p.integracao_id ? "Integração" : "Manual"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      mobile: "badge",
      render: (p) => (
        <StatusBadge tone={statusMap[p.status].tone}>{statusMap[p.status].label}</StatusBadge>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      mobile: "action",
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
        title="Pagamentos"
        subtitle="Pagamentos recebidos pela integração de pagamento ou lançados pela equipe."
        actions={
          editar ? (
            <Button onClick={() => setNovo(true)}>
              <HandCoins className="h-4 w-4" /> Registrar pagamento
            </Button>
          ) : undefined
        }
      />

      <StatGrid>
        <StatCard
          label="Confirmados"
          value={brl(confirmado.valor)}
          icon={CheckCircle2}
          tone="success"
          valueTone
          hint={qtdLabel(confirmado.qtd, "pagamento", "pagamentos")}
        />
        <StatCard
          label="Em processamento"
          value={brl(processando.valor)}
          icon={Loader2}
          tone="info"
          hint={qtdLabel(processando.qtd, "pagamento", "pagamentos")}
        />
        <StatCard
          label="Estornados"
          value={brl(estornado.valor)}
          icon={Undo2}
          tone="neutral"
          hint={qtdLabel(estornado.qtd, "estorno", "estornos")}
        />
        <StatCard
          label="Ainda em aberto"
          value={brl(emAberto)}
          icon={Clock}
          tone="warning"
          valueTone
          hint={qtdLabel(abertas.length, "taxa pendente", "taxas pendentes")}
        />
      </StatGrid>

      <div className="mt-6">
        <FilterBar>
          <FilterSelect
            value={empresaId}
            onValueChange={setEmpresaId}
            placeholder="Empresa"
            allLabel="Todas as empresas"
            allValue={TODOS}
            options={empresasComPagamento.map((e) => ({
              value: e.id,
              label: tituloNome(nomeDaEmpresa(e)),
            }))}
          />
          <FilterSelect
            value={status}
            onValueChange={setStatus}
            placeholder="Status"
            allLabel="Todos os status"
            allValue={TODOS}
            options={Object.entries(statusMap).map(([k, v]) => ({ value: k, label: v.label }))}
          />
        </FilterBar>

        <SectionCard title="Pagamentos" bodyClassName="p-0">
          <QueryState isLoading={pagamentos.isLoading} error={pagamentos.error} />
          {pagamentos.data && (
            <DataTable
              columns={columns}
              rows={rows}
              empty={
                pagamentos.data.length === 0 ? (
                  <EmptyState
                    icon={Receipt}
                    title="Nenhum pagamento registrado"
                    message="Os pagamentos chegam pela integração com o sistema de pagamento ou são lançados manualmente pela equipe financeira."
                  />
                ) : (
                  <EmptyState
                    message="Nenhum pagamento com esses filtros."
                    action={
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEmpresaId(TODOS);
                          setStatus(TODOS);
                        }}
                      >
                        Limpar filtros
                      </Button>
                    }
                  />
                )
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
                `${brl(estornar.valor)} de ${tituloNome(empresa(estornar.empresa_id))}${
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
