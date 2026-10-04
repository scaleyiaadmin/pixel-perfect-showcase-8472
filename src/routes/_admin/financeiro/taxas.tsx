import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  HandCoins,
  Lock,
  TrendingDown,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { brl, hojeISO, num, tituloNome } from "@/lib/format";
import { usePermissao } from "@/services/acesso";
import { useEmpresas } from "@/services/dados-publicos";
import {
  competenciaAnterior,
  competenciaLegivel,
  dataISO,
  mapaEmpresas,
  mensagemErro,
  nomeDaEmpresa,
  useCancelarTaxa,
  useConfigFinanceiro,
  useFecharCompetencia,
  useRegistrarPagamento,
  useTaxas,
  type StatusTaxa,
  type TaxaComSaldo,
} from "@/services/financeiro";

export const Route = createFileRoute("/_admin/financeiro/taxas")({
  head: () => ({
    meta: [
      { title: "Taxas — SisRodov Manhuaçu" },
      {
        name: "description",
        content:
          "Taxas do Terminal Rodoviário de Manhuaçu por empresa, competência, valor e vencimento.",
      },
      { property: "og:title", content: "Taxas — SisRodov Manhuaçu" },
      {
        property: "og:description",
        content: "Taxas por empresa, competência, valor e vencimento.",
      },
    ],
  }),
  component: FeesPage,
});

/* --------------------------- Compartilhado (financeiro) --------------------------- */

export const taxaTone: Record<StatusTaxa, { tone: Tone; label: string }> = {
  pago: { tone: "success", label: "Pago" },
  pendente: { tone: "warning", label: "Pendente" },
  inadimplente: { tone: "danger", label: "Inadimplente" },
  cancelada: { tone: "neutral", label: "Cancelada" },
};

export function TaxaStatusBadge({ status }: { status: StatusTaxa }) {
  return <StatusBadge tone={taxaTone[status].tone}>{taxaTone[status].label}</StatusBadge>;
}

/** Colunas da tabela de taxas; `acoes` acrescenta a coluna de botões. */
export function taxaColumns(
  empresa: (id: string) => string,
  acoes?: (t: TaxaComSaldo) => ReactNode,
): Column<TaxaComSaldo>[] {
  const cols: Column<TaxaComSaldo>[] = [
    {
      key: "number",
      header: "Número",
      nowrap: true,
      mobile: "subtitle",
      render: (t) => (
        <span className="tabular font-semibold md:text-foreground">
          {t.numero}
          <span className="font-normal md:hidden"> · {competenciaLegivel(t.competencia)}</span>
        </span>
      ),
    },
    {
      key: "company",
      header: "Empresa",
      mobile: "title",
      cellClassName: "min-w-[12rem]",
      render: (t) => tituloNome(empresa(t.empresa_id)),
    },
    {
      key: "comp",
      header: "Competência",
      nowrap: true,
      hideOnMobile: true,
      render: (t) => <span className="tabular">{competenciaLegivel(t.competencia)}</span>,
    },
    {
      key: "boardings",
      header: "Embarques",
      align: "right",
      hideOnMobile: true,
      render: (t) => <span className="tabular">{num(t.embarques)}</span>,
    },
    {
      key: "amount",
      header: "Valor",
      align: "right",
      nowrap: true,
      mobile: "meta",
      render: (t) => <span className="tabular">{brl(t.valor)}</span>,
    },
    {
      key: "balance",
      header: "Em aberto",
      align: "right",
      nowrap: true,
      mobile: "meta",
      render: (t) =>
        t.status === "cancelada" ? (
          <Vazio />
        ) : (
          <span className="tabular font-semibold">{brl(t.saldo)}</span>
        ),
    },
    {
      key: "due",
      header: "Vencimento",
      nowrap: true,
      mobile: "meta",
      render: (t) => <span className="tabular">{dataISO(t.vencimento)}</span>,
    },
    {
      key: "status",
      header: "Status",
      mobile: "badge",
      render: (t) => <TaxaStatusBadge status={t.status} />,
    },
  ];
  if (acoes)
    cols.push({ key: "actions", header: "", align: "right", mobile: "action", render: acoes });
  return cols;
}

/** Aviso quando a taxa por embarque / vencimento ainda não foram definidos. */
export function AvisoConfiguracaoTaxa() {
  const config = useConfigFinanceiro();
  // Só quem pode fechar a competência lê/ajusta a cobrança (o RLS de configurações é da equipe).
  const { editar } = usePermissao("financeiro");
  if (!editar || !config.data) return null;
  const faltando = [
    config.data.taxaEmbarque === null && "taxa por embarque",
    config.data.diaVencimento === null && "dia de vencimento",
  ].filter(Boolean);
  if (faltando.length === 0) return null;
  return (
    <div
      role="status"
      className="mb-6 flex flex-col gap-3 rounded-2xl bg-warning-soft p-4 text-warning-foreground sm:flex-row sm:items-center sm:gap-4 sm:px-5"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-card/70">
        <AlertTriangle className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">Cobrança não configurada</p>
        <p className="mt-0.5 text-sm text-pretty opacity-90">
          Defina {faltando.join(" e ")} para que as taxas possam ser geradas no fechamento da
          competência.
        </p>
      </div>
      <Button
        asChild
        variant="outline"
        size="sm"
        className="shrink-0 border-transparent bg-card shadow-sm max-sm:h-10 max-sm:w-full"
      >
        <Link to="/configuracoes">
          Abrir configurações <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}

export function RegistrarPagamentoDialog({
  taxa,
  taxas,
  open,
  onOpenChange,
}: {
  /** Taxa já escolhida (botão na linha). Sem ela, o diálogo mostra a lista de `taxas`. */
  taxa?: TaxaComSaldo | null;
  taxas?: TaxaComSaldo[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const empresas = useEmpresas();
  const empresa = mapaEmpresas(empresas.data);
  const registrar = useRegistrarPagamento();
  const [taxaId, setTaxaId] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hojeISO());
  const [meio, setMeio] = useState("PIX");
  const [referencia, setReferencia] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const abertas = (taxas ?? []).filter((t) => t.status !== "cancelada" && t.saldo > 0);
  const escolhida = taxa ?? abertas.find((t) => t.id === taxaId) ?? null;

  function reset(t?: TaxaComSaldo | null) {
    setTaxaId(t?.id ?? "");
    setValor(t ? t.saldo.toFixed(2).replace(".", ",") : "");
    setData(hojeISO());
    setMeio("PIX");
    setReferencia("");
    setErro(null);
  }

  useEffect(() => {
    if (open) reset(taxa);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, taxa?.id]);

  async function salvar() {
    setErro(null);
    if (!escolhida) return setErro("Escolha a taxa que está sendo paga.");
    const v = Number(valor.replace(/\./g, "").replace(",", "."));
    if (!(v > 0)) return setErro("Informe um valor maior que zero.");
    if (!data || data > hojeISO()) return setErro("Informe uma data de pagamento até hoje.");
    try {
      await registrar.mutateAsync({ taxa: escolhida, valor: v, data, meio, referencia });
      toast.success(`Pagamento registrado na taxa ${escolhida.numero}.`);
      onOpenChange(false);
    } catch (e) {
      setErro(mensagemErro(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pagamento manual</DialogTitle>
          <DialogDescription>
            Use quando o pagamento não chegou pela integração (comprovante recebido pela equipe).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {taxa ? (
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm">
              <p className="font-semibold">
                {taxa.numero} · {tituloNome(empresa(taxa.empresa_id))}
              </p>
              <p className="text-muted-foreground">
                Competência {competenciaLegivel(taxa.competencia)} · valor {brl(taxa.valor)} · em
                aberto {brl(taxa.saldo)}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Taxa</Label>
              <Select
                value={taxaId}
                onValueChange={(id) => {
                  setTaxaId(id);
                  const t = abertas.find((x) => x.id === id);
                  if (t) setValor(t.saldo.toFixed(2).replace(".", ","));
                }}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={abertas.length ? "Escolha a taxa" : "Nenhuma taxa em aberto"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {abertas.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.numero} · {tituloNome(empresa(t.empresa_id))} · {brl(t.saldo)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pg-valor">Valor (R$)</Label>
              <Input
                id="pg-valor"
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pg-data">Data do pagamento</Label>
              <Input
                id="pg-data"
                type="date"
                max={hojeISO()}
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Meio</Label>
              <Select value={meio} onValueChange={setMeio}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["PIX", "Boleto", "Transferência", "DAM", "Dinheiro", "Outro"].map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pg-ref">Referência / comprovante</Label>
              <Input
                id="pg-ref"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Nº do comprovante"
              />
            </div>
          </div>
          {erro && <p className="text-sm text-danger">{erro}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={registrar.isPending}>
            {registrar.isPending ? "Registrando..." : "Registrar pagamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelarTaxaDialog({ taxa, onClose }: { taxa: TaxaComSaldo | null; onClose: () => void }) {
  const cancelar = useCancelarTaxa();
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  async function confirmar() {
    if (!taxa) return;
    setErro(null);
    if (!motivo.trim()) return setErro("Informe o motivo do cancelamento.");
    try {
      await cancelar.mutateAsync({ taxa, motivo: motivo.trim() });
      toast.success(`Taxa ${taxa.numero} cancelada.`);
      setMotivo("");
      onClose();
    } catch (e) {
      setErro(mensagemErro(e));
    }
  }

  return (
    <Dialog
      open={!!taxa}
      onOpenChange={(o) => {
        if (!o) {
          setMotivo("");
          setErro(null);
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar taxa {taxa?.numero}</DialogTitle>
          <DialogDescription>
            A taxa deixa de ser cobrada e não é gerada de novo para a mesma competência. Esta ação
            fica registrada na auditoria.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="cancel-motivo">Motivo</Label>
          <Textarea
            id="cancel-motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: embarques contestados e revisados com a empresa"
          />
        </div>
        {erro && <p className="text-sm text-danger">{erro}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Voltar
          </Button>
          <Button variant="destructive" onClick={confirmar} disabled={cancelar.isPending}>
            {cancelar.isPending ? "Cancelando..." : "Cancelar taxa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FecharCompetenciaDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const fechar = useFecharCompetencia();
  const config = useConfigFinanceiro();
  const [competencia, setCompetencia] = useState(competenciaAnterior());
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCompetencia(competenciaAnterior());
      setErro(null);
    }
  }, [open]);

  async function confirmar() {
    setErro(null);
    if (!/^\d{4}-\d{2}$/.test(competencia)) return setErro("Escolha o mês da competência.");
    try {
      const geradas = await fechar.mutateAsync(competencia);
      toast.success(
        geradas
          ? `${geradas} taxa(s) gerada(s) para ${competenciaLegivel(competencia)}.`
          : `Nenhuma taxa nova para ${competenciaLegivel(competencia)} (sem embarques ou já geradas).`,
      );
      onOpenChange(false);
    } catch (e) {
      setErro(mensagemErro(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fechar competência</DialogTitle>
          <DialogDescription>
            Gera uma taxa por empresa que opera no terminal, com os embarques confirmados na catraca
            no mês × a taxa por embarque configurada. Taxas já geradas não são recriadas. O
            fechamento do mês anterior também roda automaticamente todo dia 1º às 06:30.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fc-comp">Competência</Label>
            <Input
              id="fc-comp"
              type="month"
              max={competenciaAnterior()}
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
            />
          </div>
          {config.data && (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                <dt className="text-xs text-muted-foreground">Taxa por embarque</dt>
                <dd className="font-semibold">
                  {config.data.taxaEmbarque === null
                    ? "Não configurada"
                    : brl(config.data.taxaEmbarque)}
                </dd>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                <dt className="text-xs text-muted-foreground">Vencimento</dt>
                <dd className="font-semibold">
                  {config.data.diaVencimento === null
                    ? "Não configurado"
                    : `Dia ${config.data.diaVencimento} do mês seguinte`}
                </dd>
              </div>
            </dl>
          )}
          {erro && <p className="text-sm text-danger">{erro}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={fechar.isPending}>
            {fechar.isPending ? "Gerando taxas..." : "Fechar competência"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------ Página ------------------------------------ */

const TODOS = "todos";

function FeesPage() {
  const [competencia, setCompetencia] = useState(TODOS);
  const [empresaId, setEmpresaId] = useState(TODOS);
  const [status, setStatus] = useState(TODOS);
  const [fecharAberto, setFecharAberto] = useState(false);
  const [pagar, setPagar] = useState<TaxaComSaldo | null>(null);
  const [cancelar, setCancelar] = useState<TaxaComSaldo | null>(null);
  const { editar } = usePermissao("financeiro");

  const empresas = useEmpresas();
  const empresa = mapaEmpresas(empresas.data);
  // Todas as taxas (para as opções de filtro); o filtro é aplicado em memória.
  const taxas = useTaxas();

  const competencias = useMemo(
    () => [...new Set((taxas.data ?? []).map((t) => t.competencia))].sort().reverse(),
    [taxas.data],
  );
  const empresasComTaxa = useMemo(() => {
    const ids = new Set((taxas.data ?? []).map((t) => t.empresa_id));
    return (empresas.data ?? []).filter((e) => ids.has(e.id));
  }, [taxas.data, empresas.data]);

  const rows = useMemo(
    () =>
      (taxas.data ?? []).filter(
        (t) =>
          (competencia === TODOS || t.competencia === competencia) &&
          (empresaId === TODOS || t.empresa_id === empresaId) &&
          (status === TODOS || t.status === status),
      ),
    [taxas.data, competencia, empresaId, status],
  );

  const totais = useMemo(() => {
    const soma = (f: (t: TaxaComSaldo) => boolean, v: (t: TaxaComSaldo) => number) =>
      rows.filter(f).reduce((s, t) => s + v(t), 0);
    return {
      emitido: soma(
        (t) => t.status !== "cancelada",
        (t) => t.valor,
      ),
      pago: soma(
        (t) => t.status !== "cancelada",
        (t) => Math.min(t.pago, t.valor),
      ),
      pendente: soma(
        (t) => t.status === "pendente",
        (t) => t.saldo,
      ),
      inadimplente: soma(
        (t) => t.status === "inadimplente",
        (t) => t.saldo,
      ),
    };
  }, [rows]);

  const columns = taxaColumns(
    (id) => empresa(id),
    editar
      ? (t) =>
          t.status === "pendente" || t.status === "inadimplente" ? (
            <div className="flex justify-end gap-1.5">
              <Button variant="outline" size="sm" onClick={() => setPagar(t)}>
                <HandCoins className="h-3.5 w-3.5" /> Pagamento
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCancelar(t)}
                aria-label={`Cancelar taxa ${t.numero}`}
                title="Cancelar taxa"
              >
                <Ban className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : null
      : undefined,
  );

  const semTaxas = taxas.data && taxas.data.length === 0;

  return (
    <>
      <PageHeader
        title="Taxas"
        subtitle="Taxas de uso do terminal geradas no fechamento de cada competência."
        actions={
          editar ? (
            <Button onClick={() => setFecharAberto(true)}>
              <Lock className="h-4 w-4" /> Fechar competência
            </Button>
          ) : undefined
        }
      />
      <AvisoConfiguracaoTaxa />

      <StatGrid>
        <StatCard
          label="Taxas emitidas"
          value={brl(totais.emitido)}
          icon={CircleDollarSign}
          tone="primary"
        />
        <StatCard
          label="Pagas"
          value={brl(totais.pago)}
          icon={CheckCircle2}
          tone="success"
          valueTone
        />
        <StatCard
          label="Pendentes"
          value={brl(totais.pendente)}
          icon={Clock}
          tone="warning"
          valueTone
        />
        <StatCard
          label="Inadimplentes"
          value={brl(totais.inadimplente)}
          icon={TrendingDown}
          tone="danger"
          valueTone
        />
      </StatGrid>

      <div className="mt-6">
        <FilterBar>
          <FilterSelect
            value={competencia}
            onValueChange={setCompetencia}
            placeholder="Competência"
            allLabel="Todas as competências"
            allValue={TODOS}
            options={competencias.map((c) => ({ value: c, label: competenciaLegivel(c) }))}
            className="sm:min-w-[14rem]"
          />
          <FilterSelect
            value={empresaId}
            onValueChange={setEmpresaId}
            placeholder="Empresa"
            allLabel="Todas as empresas"
            allValue={TODOS}
            options={empresasComTaxa.map((e) => ({
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
            options={Object.entries(taxaTone).map(([k, v]) => ({ value: k, label: v.label }))}
          />
        </FilterBar>

        <SectionCard title="Taxas" bodyClassName="p-0">
          <QueryState isLoading={taxas.isLoading} error={taxas.error} />
          {taxas.data && (
            <DataTable
              columns={columns}
              rows={rows}
              empty={
                semTaxas ? (
                  <EmptyState
                    icon={CircleDollarSign}
                    title="Nenhuma taxa gerada ainda"
                    message="As taxas são criadas no fechamento da competência, a partir dos embarques confirmados na catraca de cada empresa."
                  />
                ) : (
                  <EmptyState
                    message="Nenhuma taxa com esses filtros."
                    action={
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCompetencia(TODOS);
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
          Valor = embarques confirmados na catraca no mês × taxa por embarque vigente no fechamento.
          Pagamentos confirmados que cobrem o valor marcam a taxa como paga; taxas pendentes
          vencidas passam a inadimplentes todo dia às 06:00.
        </SourceNote>
      </div>

      <FecharCompetenciaDialog open={fecharAberto} onOpenChange={setFecharAberto} />
      <RegistrarPagamentoDialog
        taxa={pagar}
        open={!!pagar}
        onOpenChange={(o) => !o && setPagar(null)}
      />
      <CancelarTaxaDialog taxa={cancelar} onClose={() => setCancelar(null)} />
    </>
  );
}
