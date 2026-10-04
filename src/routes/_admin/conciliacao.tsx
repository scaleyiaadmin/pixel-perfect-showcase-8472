import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Bus, DoorOpen, FileText, Landmark, Scale, Ticket } from "lucide-react";
import {
  DataTable,
  DateRangeFilter,
  DemoNote,
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
  reconciliationTone,
  type Column,
  type Tone,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { brl, dataHora, hojeISO, hora, num, tituloNome } from "@/lib/format";
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

/** Cidade em title-case mantendo a UF em maiúsculas ("CARATINGA/MG" → "Caratinga/MG"). */
function cidadeNome(c: string) {
  const m = c.match(/^(.*?)(\s*[/-]\s*)([A-Za-z]{2})$/);
  return m ? `${tituloNome(m[1])}${m[2]}${m[3].toUpperCase()}` : tituloNome(c);
}

const TODOS = "todos";

function ReconciliationPage() {
  const [de, setDe] = useState(() => somarDias(hojeISO(), -30));
  const [ate, setAte] = useState(() => hojeISO());
  const [status, setStatus] = useState(TODOS);
  const [selected, setSelected] = useState<Linha | null>(null);

  const empresas = useEmpresas();
  const nomeEmpresa = mapaEmpresas(empresas.data);
  const empresa = (id: string | null | undefined) => tituloNome(nomeEmpresa(id));
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
  const pct = (n: number) => Math.round((n / total) * 100);

  const ultimaConciliada = todas.find((c) => c.status === "conciliado");
  const ultimaDivergente = todas.find((c) => c.status === "divergencia");

  const columns: Column<Linha>[] = [
    {
      key: "date",
      header: "Data",
      nowrap: true,
      hideOnMobile: true,
      render: (d) => <span className="tabular">{dataISO(d.data)}</span>,
    },
    {
      key: "trip",
      header: "Viagem",
      mobile: "title",
      cellClassName: "min-w-[11rem]",
      render: (d) => (
        <span>
          <span className="tabular font-semibold">{d.numero || <Vazio />}</span>
          <span className="block text-xs font-normal text-muted-foreground">
            {cidadeNome(d.origem)} → {cidadeNome(d.destino)}
          </span>
        </span>
      ),
    },
    {
      key: "company",
      header: "Empresa",
      mobile: "subtitle",
      cellClassName: "min-w-[10rem]",
      render: (d) => (
        <>
          {empresa(d.empresa_id)}
          <span className="tabular md:hidden"> · {dataISO(d.data)}</span>
        </>
      ),
    },
    {
      key: "tickets",
      header: "Passagens",
      align: "right",
      mobile: "meta",
      render: (d) => <span className="tabular">{num(d.bilhetes)}</span>,
    },
    {
      key: "gate",
      header: "Catraca",
      align: "right",
      mobile: "meta",
      render: (d) => <span className="tabular">{num(d.acessos)}</span>,
    },
    {
      key: "report",
      header: "Relato",
      align: "right",
      mobile: "meta",
      render: (d) =>
        d.relato === null ? (
          <Vazio title="Relato não enviado" />
        ) : (
          <span className="tabular">{num(d.relato)}</span>
        ),
    },
    {
      key: "diff",
      header: "Diferença",
      align: "right",
      mobile: "meta",
      render: (d) => <span className="tabular font-semibold">{num(d.diferenca)}</span>,
    },
    {
      key: "result",
      header: "Resultado",
      mobile: "badge",
      render: (d) => (
        <StatusBadge tone={reconciliationTone[d.status].tone}>
          {reconciliationTone[d.status].label}
        </StatusBadge>
      ),
    },
    {
      key: "situation",
      header: "Conferência",
      mobile: "badge",
      render: (d) => (
        <StatusBadge size="sm" tone={situationMap[d.situacao_conferencia].tone}>
          {situationMap[d.situacao_conferencia].label}
        </StatusBadge>
      ),
    },
    {
      key: "action",
      header: "",
      align: "right",
      mobile: "action",
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

      <FilterBar>
        <DateRangeFilter
          label="Período"
          from={de}
          to={ate}
          onFromChange={(v) => v && setDe(v)}
          onToChange={(v) => v && setAte(v)}
        />
        <FilterSelect
          value={status}
          onValueChange={setStatus}
          placeholder="Resultado"
          allLabel="Todos os resultados"
          allValue={TODOS}
          options={(Object.keys(reconciliationTone) as StatusConciliacao[]).map((k) => ({
            value: k,
            label: reconciliationTone[k].label,
          }))}
        />
      </FilterBar>

      <SectionCard
        title="Resumo do período"
        description={`${num(todas.length)} ${todas.length === 1 ? "viagem partida" : "viagens partidas"} de ${dataISO(de)} a ${dataISO(ate)}`}
      >
        <StatGrid cols={3}>
          <StatCard
            variant="soft"
            tone="success"
            label="Conciliados"
            value={num(contagem.conciliado)}
            hint={todas.length ? `${pct(contagem.conciliado)}% das viagens` : undefined}
          />
          <StatCard
            variant="soft"
            tone="warning"
            label="Em análise"
            value={num(contagem.analise)}
            hint={todas.length ? `${pct(contagem.analise)}% das viagens` : undefined}
          />
          <StatCard
            variant="soft"
            tone="danger"
            label="Divergências"
            value={num(contagem.divergencia)}
            hint={todas.length ? `${pct(contagem.divergencia)}% das viagens` : undefined}
          />
        </StatGrid>

        <div className="mt-5">
          <div
            role="img"
            aria-label={
              todas.length
                ? `${pct(contagem.conciliado)}% conciliadas, ${pct(contagem.analise)}% em análise, ${pct(contagem.divergencia)}% com divergência`
                : "Sem viagens no período"
            }
            className="flex h-2 overflow-hidden rounded-full bg-muted"
          >
            <div className="bg-success" style={{ width: `${pct(contagem.conciliado)}%` }} />
            <div className="bg-warning" style={{ width: `${pct(contagem.analise)}%` }} />
            <div className="bg-danger" style={{ width: `${pct(contagem.divergencia)}%` }} />
          </div>
          <p className="mt-2 text-xs text-pretty text-muted-foreground">
            {todas.length === 0
              ? "Sem viagens partidas no período. A barra se preenche conforme as fontes chegam."
              : `Conciliado = diferença entre as fontes até ${config.data?.toleranciaConciliacao ?? 0} passageiro(s) (tolerância configurável); em análise = falta o relato da empresa.`}
          </p>
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <p className="mb-3 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Fontes cruzadas, nesta ordem
          </p>
          <ol className="grid gap-2.5 sm:grid-cols-5 sm:gap-2">
            {flow.map((f, i) => (
              <li
                key={f.label}
                className="relative flex items-center gap-3 sm:flex-col sm:gap-2 sm:text-center"
              >
                {i < flow.length - 1 && (
                  <>
                    {/* Conector vertical (celular) e horizontal (sm+), só decorativos. */}
                    <span
                      aria-hidden="true"
                      className="absolute top-8 bottom-[-0.625rem] left-4 w-px bg-border sm:hidden"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute top-4 right-[calc(-50%+1.25rem)] left-[calc(50%+1.25rem)] hidden h-px bg-border sm:block"
                    />
                  </>
                )}
                <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                  <f.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-sm leading-tight text-foreground">
                  <span className="tabular mr-1 text-xs text-muted-foreground">{i + 1}.</span>
                  {f.label}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </SectionCard>

      {(ultimaConciliada || ultimaDivergente) && (
        <div className="mt-6 grid items-start gap-5 lg:grid-cols-2">
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
        <SectionCard
          title="Viagens conciliadas"
          description="Linguagem neutra: o sistema apenas apresenta as diferenças entre as fontes."
          bodyClassName="p-0"
        >
          <QueryState isLoading={conciliacao.isLoading} error={conciliacao.error} />
          {conciliacao.data &&
            (todas.length === 0 ? (
              <EmptyState
                icon={Scale}
                title="Nenhuma viagem partida no período"
                message="A conciliação é montada quando as viagens são registradas como partidas e chegam bilhetes e relatos (integração das empresas) e acessos (catracas)."
              />
            ) : (
              <DataTable
                columns={columns}
                rows={rows}
                empty={
                  <EmptyState
                    message="Nenhuma viagem com esse resultado no período."
                    action={
                      <Button variant="outline" size="sm" onClick={() => setStatus(TODOS)}>
                        Ver todos os resultados
                      </Button>
                    }
                  />
                }
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
              {cidadeNome(selected.origem)} → {cidadeNome(selected.destino)}
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
      description={`${cidadeNome(trip.origem)} → ${cidadeNome(trip.destino)} · ${dataISO(trip.data)}${
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
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <StatusBadge tone="warning">Divergência identificada</StatusBadge>
            <span className="tabular text-sm text-muted-foreground">
              Diferença: {num(trip.diferenca)} passageiro(s)
            </span>
          </div>
        )}
        {onAnalyze && (
          <Button variant="outline" size="sm" onClick={onAnalyze} className="max-sm:w-full">
            Analisar divergência
          </Button>
        )}
      </div>
    </SectionCard>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-muted/60 px-3 py-2.5">
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
