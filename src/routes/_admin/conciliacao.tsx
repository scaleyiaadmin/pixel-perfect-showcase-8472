import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Bus, DoorOpen, FileText, Landmark, Ticket } from "lucide-react";
import {
  DataTable,
  DemoNote,
  EmptyState,
  FilterBar,
  PageHeader,
  QueryState,
  SectionCard,
  StatusBadge,
  reconciliationTone,
  type Column,
  type Tone,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { brl, dataHora, hojeISO, hora, num } from "@/lib/format";
import { usePermissao } from "@/services/acesso";
import { useEmpresas } from "@/services/dados-publicos";
import {
  dataISO,
  mapaEmpresas,
  mensagemErro,
  somarDias,
  useConciliacao,
  useConferirViagem,
  useConfigFinanceiro,
  type ConciliacaoViagem,
  type SituacaoConferencia,
  type StatusConciliacao,
} from "@/services/financeiro";

export const Route = createFileRoute("/_admin/conciliacao")({
  head: () => ({
    meta: [
      { title: "Conciliação 360° — SisRodov Manhuaçu" },
      {
        name: "description",
        content:
          "Cruzamento entre viagens, passagens, catracas, relatórios das empresas e taxas do terminal.",
      },
      { property: "og:title", content: "Conciliação 360° — SisRodov Manhuaçu" },
      {
        property: "og:description",
        content: "Identificação de diferenças entre as fontes de informação do terminal.",
      },
    ],
  }),
  component: ReconciliationPage,
});

const flow = [
  { label: "Viagem", icon: Bus },
  { label: "Passagens", icon: Ticket },
  { label: "Catraca", icon: DoorOpen },
  { label: "Relato da empresa", icon: FileText },
  { label: "Taxa do terminal", icon: Landmark },
];

const situationMap: Record<SituacaoConferencia, { tone: Tone; label: string }> = {
  "em-analise": { tone: "warning", label: "Em análise" },
  conferido: { tone: "success", label: "Conferido" },
  "necessita-conferencia": { tone: "info", label: "Necessita conferência" },
};

type Linha = ConciliacaoViagem & { id: string };

const TODOS = "todos";

function ReconciliationPage() {
  const [de, setDe] = useState(() => somarDias(hojeISO(), -30));
  const [ate, setAte] = useState(() => hojeISO());
  const [status, setStatus] = useState(TODOS);
  const [selected, setSelected] = useState<Linha | null>(null);

  const empresas = useEmpresas();
  const empresa = mapaEmpresas(empresas.data);
  const config = useConfigFinanceiro();
  const conciliacao = useConciliacao({ periodo: { de, ate } });

  const todas: Linha[] = useMemo(
    () => (conciliacao.data ?? []).map((c) => ({ ...c, id: c.viagem_id })),
    [conciliacao.data],
  );
  const rows = useMemo(
    () => todas.filter((c) => status === TODOS || c.status === status),
    [todas, status],
  );

  const contagem = useMemo(() => {
    const c = { conciliado: 0, analise: 0, divergencia: 0 };
    for (const r of todas) c[r.status] += 1;
    return c;
  }, [todas]);
  const total = Math.max(1, todas.length);

  const ultimaConciliada = todas.find((c) => c.status === "conciliado");
  const ultimaDivergente = todas.find((c) => c.status === "divergencia");

  const columns: Column<Linha>[] = [
    {
      key: "date",
      header: "Data",
      render: (d) => <span className="tabular">{dataISO(d.data)}</span>,
    },
    {
      key: "trip",
      header: "Viagem",
      render: (d) => (
        <span>
          <span className="tabular font-semibold">{d.numero || "—"}</span>
          <span className="block text-xs text-muted-foreground">
            {d.origem} → {d.destino}
          </span>
        </span>
      ),
    },
    { key: "company", header: "Empresa", render: (d) => empresa(d.empresa_id) },
    {
      key: "tickets",
      header: "Passagens",
      align: "right",
      render: (d) => <span className="tabular">{num(d.bilhetes)}</span>,
    },
    {
      key: "gate",
      header: "Catraca",
      align: "right",
      render: (d) => <span className="tabular">{num(d.acessos)}</span>,
    },
    {
      key: "report",
      header: "Relato",
      align: "right",
      render: (d) => <span className="tabular">{d.relato === null ? "—" : num(d.relato)}</span>,
    },
    {
      key: "diff",
      header: "Diferença",
      align: "right",
      render: (d) => <span className="tabular font-semibold">{num(d.diferenca)}</span>,
    },
    {
      key: "result",
      header: "Resultado",
      render: (d) => (
        <StatusBadge tone={reconciliationTone[d.status].tone}>
          {reconciliationTone[d.status].label}
        </StatusBadge>
      ),
    },
    {
      key: "situation",
      header: "Conferência",
      render: (d) => (
        <StatusBadge tone={situationMap[d.situacao_conferencia].tone}>
          {situationMap[d.situacao_conferencia].label}
        </StatusBadge>
      ),
    },
    {
      key: "action",
      header: "",
      align: "right",
      render: (d) => (
        <Button variant="outline" size="sm" onClick={() => setSelected(d)}>
          Analisar
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Conciliação 360°"
        subtitle="Cruze passagens, acessos na catraca e relatos das empresas para identificar divergências."
      />

      <SectionCard title="Fluxo da informação">
        <div className="flex flex-wrap items-center gap-2">
          {flow.map((f, i) => (
            <div key={f.label} className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
                <f.icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{f.label}</span>
              </div>
              {i < flow.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Indicator label="Conciliados" value={num(contagem.conciliado)} tone="success" />
          <Indicator label="Em análise" value={num(contagem.analise)} tone="warning" />
          <Indicator label="Divergências" value={num(contagem.divergencia)} tone="danger" />
        </div>
        <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted">
          <div
            className="bg-success"
            style={{ width: `${(contagem.conciliado / total) * 100}%` }}
          />
          <div className="bg-warning" style={{ width: `${(contagem.analise / total) * 100}%` }} />
          <div
            className="bg-danger"
            style={{ width: `${(contagem.divergencia / total) * 100}%` }}
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Viagens que já partiram no período. Conciliado = diferença entre as fontes até{" "}
          {config.data?.toleranciaConciliacao ?? 0} passageiro(s) (tolerância configurável); em
          análise = falta o relato da empresa.
        </p>
      </SectionCard>

      {(ultimaConciliada || ultimaDivergente) && (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {ultimaConciliada && (
            <TripReconciliationCard
              trip={ultimaConciliada}
              empresa={empresa(ultimaConciliada.empresa_id)}
              taxaEmbarque={config.data?.taxaEmbarque ?? null}
            />
          )}
          {ultimaDivergente && (
            <TripReconciliationCard
              trip={ultimaDivergente}
              empresa={empresa(ultimaDivergente.empresa_id)}
              taxaEmbarque={config.data?.taxaEmbarque ?? null}
              onAnalyze={() => setSelected(ultimaDivergente)}
            />
          )}
        </div>
      )}

      <div className="mt-6">
        <FilterBar>
          <div className="flex items-center gap-2 text-sm">
            <Label htmlFor="conc-de" className="text-muted-foreground">
              De
            </Label>
            <Input
              id="conc-de"
              type="date"
              className="h-9 w-[10rem]"
              value={de}
              max={ate}
              onChange={(e) => e.target.value && setDe(e.target.value)}
            />
            <Label htmlFor="conc-ate" className="text-muted-foreground">
              até
            </Label>
            <Input
              id="conc-ate"
              type="date"
              className="h-9 w-[10rem]"
              value={ate}
              min={de}
              onChange={(e) => e.target.value && setAte(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[12rem]">
              <SelectValue placeholder="Resultado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos os resultados</SelectItem>
              {(Object.keys(reconciliationTone) as StatusConciliacao[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {reconciliationTone[k].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterBar>
        <SectionCard
          title="Viagens conciliadas"
          description="Linguagem neutra: o sistema apenas apresenta as diferenças entre as fontes."
          bodyClassName="p-0"
        >
          <QueryState isLoading={conciliacao.isLoading} error={conciliacao.error} />
          {conciliacao.data &&
            (todas.length === 0 ? (
              <EmptyState message="Nenhuma viagem partida no período. A conciliação é montada quando as viagens são registradas como partidas e chegam bilhetes e relatos (integração das empresas) e acessos (catracas)." />
            ) : (
              <DataTable
                columns={columns}
                rows={rows}
                emptyMessage="Nenhuma viagem com esse resultado no período."
              />
            ))}
        </SectionCard>
      </div>

      <AnaliseSheet
        selected={selected}
        empresa={selected ? empresa(selected.empresa_id) : ""}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

function AnaliseSheet({
  selected,
  empresa,
  onClose,
}: {
  selected: Linha | null;
  empresa: string;
  onClose: () => void;
}) {
  const conferir = useConferirViagem();
  const { editar } = usePermissao("conciliacao");
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setObservacao(selected?.observacao ?? "");
    setErro(null);
  }, [selected]);

  async function salvar(situacao: "conferido" | "necessita-conferencia") {
    if (!selected) return;
    setErro(null);
    if (situacao === "necessita-conferencia" && !observacao.trim())
      return setErro("Descreva o que precisa ser conferido.");
    try {
      await conferir.mutateAsync({
        viagemId: selected.viagem_id,
        numero: selected.numero,
        situacao,
        observacao: observacao.trim(),
      });
      toast.success(
        situacao === "conferido"
          ? "Viagem marcada como conferida."
          : "Viagem marcada para conferência.",
      );
      onClose();
    } catch (e) {
      setErro(mensagemErro(e));
    }
  }

  return (
    <Sheet open={!!selected} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Análise da viagem</SheetTitle>
          <SheetDescription>
            {selected &&
              `${selected.numero || "Sem número"} · ${empresa} · ${dataISO(selected.data)}${
                selected.previsto_em ? ` ${hora(selected.previsto_em)}` : ""
              }`}
          </SheetDescription>
        </SheetHeader>
        {selected && (
          <div className="space-y-4 px-4 pb-6">
            <p className="text-sm text-muted-foreground">
              {selected.origem} → {selected.destino}
            </p>
            <Line label="Passagens válidas (emitidas/utilizadas)" value={selected.bilhetes} />
            <Line label="Passagens canceladas" value={selected.bilhetes_cancelados} />
            <Line label="Acessos confirmados na catraca" value={selected.acessos} />
            <Line label="Relato da empresa" value={selected.relato} />
            <Line label="Diferença apurada" value={selected.diferenca} highlight />
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={reconciliationTone[selected.status].tone}>
                {reconciliationTone[selected.status].label}
              </StatusBadge>
              <StatusBadge tone={situationMap[selected.situacao_conferencia].tone}>
                {situationMap[selected.situacao_conferencia].label}
              </StatusBadge>
            </div>
            {selected.conferido_em && (
              <p className="text-xs text-muted-foreground">
                Última conferência em {dataHora(selected.conferido_em)}.
              </p>
            )}
            {editar && (
              <>
            <div className="space-y-1.5">
              <Label htmlFor="conc-obs">Observação</Label>
              <Textarea
                id="conc-obs"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex.: empresa confirmou 2 passageiros embarcados fora da catraca (gratuidade)."
              />
            </div>
            {erro && <p className="text-sm text-danger">{erro}</p>}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => salvar("conferido")} disabled={conferir.isPending}>
                Marcar como conferida
              </Button>
              <Button
                variant="outline"
                onClick={() => salvar("necessita-conferencia")}
                disabled={conferir.isPending}
              >
                Necessita conferência
              </Button>
            </div>
              </>
            )}
            <DemoNote>
              O sistema identifica e apresenta a diferença entre as fontes, sem qualquer julgamento.
              A conferência fica registrada na auditoria.
            </DemoNote>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Indicator({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "warning" | "danger";
}) {
  const classes = {
    success: "border-success/25 bg-success-soft text-success",
    warning: "border-warning/30 bg-warning-soft text-warning-foreground",
    danger: "border-danger/25 bg-danger-soft text-danger",
  }[tone];
  return (
    <div className={`rounded-lg border p-3 ${classes}`}>
      <p className="text-xs font-semibold">{label}</p>
      <p className="tabular mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

function TripReconciliationCard({
  trip,
  empresa,
  taxaEmbarque,
  onAnalyze,
}: {
  trip: Linha;
  empresa: string;
  taxaEmbarque: number | null;
  onAnalyze?: () => void;
}) {
  return (
    <SectionCard
      title={`Viagem ${trip.numero || "sem número"}`}
      description={`${trip.origem} → ${trip.destino} · ${dataISO(trip.data)}${
        trip.previsto_em ? ` ${hora(trip.previsto_em)}` : ""
      } · ${empresa}`}
    >
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Metric label="Passagens válidas" value={num(trip.bilhetes)} />
        <Metric label="Cancelamentos" value={num(trip.bilhetes_cancelados)} />
        <Metric label="Acessos na catraca" value={num(trip.acessos)} />
        <Metric label="Relato empresa" value={trip.relato === null ? "—" : num(trip.relato)} />
        <Metric label="Diferença" value={num(trip.diferenca)} />
        <Metric
          label="Taxa estimada"
          value={taxaEmbarque === null ? "Não configurada" : brl(trip.acessos * taxaEmbarque)}
        />
      </dl>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        {trip.status === "conciliado" ? (
          <StatusBadge tone="success">Conciliado</StatusBadge>
        ) : (
          <div className="flex items-center gap-3">
            <StatusBadge tone="warning">Divergência identificada</StatusBadge>
            <span className="text-sm text-muted-foreground">
              Diferença: {trip.diferenca} passageiros
            </span>
          </div>
        )}
        {onAnalyze && (
          <Button variant="outline" size="sm" onClick={onAnalyze}>
            Analisar divergência
          </Button>
        )}
      </div>
    </SectionCard>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
      <dt className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="tabular mt-0.5 font-display text-lg font-bold">{value}</dd>
    </div>
  );
}

function Line({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | null;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`tabular font-display text-lg font-bold ${highlight ? "text-warning-foreground" : ""}`}
      >
        {value === null ? "—" : num(value)}
      </span>
    </div>
  );
}
