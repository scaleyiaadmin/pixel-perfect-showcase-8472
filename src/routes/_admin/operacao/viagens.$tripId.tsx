import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Bus, Clock, MapPin, Ticket } from "lucide-react";
import {
  DataTable,
  EmptyState,
  PageHeader,
  QueryState,
  SectionCard,
  StatCard,
  StatusBadge,
  tripStatusTone,
  type Column,
  type Tone,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { brl, dataHora, hora, num } from "@/lib/format";
import type { Bilhete, EventoEmbarque } from "@/services/gestao-tipos";
import {
  dataBR,
  horaPrevista,
  nomeEmpresaViagem,
  tipoViagemLabel,
  usePlataformas,
  useViagem,
  type ViagemCompleta,
} from "@/services/operacao";
import { AcoesViagem } from "./viagens.index";

export const Route = createFileRoute("/_admin/operacao/viagens/$tripId")({
  head: () => ({
    meta: [
      { title: "Detalhe da viagem — SisRodov Manhuaçu" },
      {
        name: "description",
        content:
          "Detalhamento da viagem: empresa, plataforma, veículo, passagens, acessos e relato da empresa.",
      },
      { property: "og:title", content: "Detalhe da viagem — SisRodov Manhuaçu" },
      {
        property: "og:description",
        content: "Passagens, acessos, embarques e relato da empresa na viagem.",
      },
    ],
  }),
  component: TripDetail,
});

const conciliacaoTone: Record<string, { tone: Tone; label: string }> = {
  conferido: { tone: "success", label: "Conferido" },
  "em-analise": { tone: "warning", label: "Em análise" },
  "necessita-conferencia": { tone: "danger", label: "Necessita conferência" },
};

const bilheteTone: Record<Bilhete["status"], { tone: Tone; label: string }> = {
  emitida: { tone: "info", label: "Emitida" },
  utilizada: { tone: "success", label: "Utilizada" },
  cancelada: { tone: "danger", label: "Cancelada" },
  "nao-utilizada": { tone: "neutral", label: "Não utilizada" },
};

const eventoLabel: Record<EventoEmbarque["evento"], string> = {
  acesso: "Acesso",
  reentrada: "Reentrada",
  negado: "Negado",
};

const eventoStatusTone: Record<EventoEmbarque["status"], { tone: Tone; label: string }> = {
  confirmado: { tone: "success", label: "Confirmado" },
  pendente: { tone: "warning", label: "Pendente" },
  rejeitado: { tone: "danger", label: "Rejeitado" },
};

function TripDetail() {
  const { tripId } = Route.useParams();
  const viagem = useViagem(tripId);
  const plataformas = usePlataformas();

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/operacao/viagens">
          <ArrowLeft className="h-4 w-4" /> Voltar para viagens
        </Link>
      </Button>

      <QueryState isLoading={viagem.isLoading} error={viagem.error} />
      {viagem.data === null && <EmptyState message="Viagem não encontrada." />}
      {viagem.data && <Detalhe trip={viagem.data} plataformas={plataformas.data ?? []} />}
    </>
  );
}

function Detalhe({
  trip,
  plataformas,
}: {
  trip: ViagemCompleta;
  plataformas: NonNullable<ReturnType<typeof usePlataformas>["data"]>;
}) {
  const acessos = trip.eventos.filter(
    (e) => e.evento === "acesso" && e.status === "confirmado",
  ).length;
  const reentradas = trip.eventos.filter((e) => e.evento === "reentrada").length;
  const negados = trip.eventos.filter((e) => e.evento === "negado").length;
  const emitidos = trip.bilhetes.filter((b) => b.status !== "cancelada").length;
  const cancelados = trip.bilhetes.length - emitidos;
  const diferenca = trip.relato ? trip.relato.passageiros - acessos : null;

  const linhaDoTempo = [
    { em: trip.previsto_em, texto: "Horário previsto no terminal", previsto: true },
    { em: trip.chegou_em, texto: "Chegada registrada" },
    ...(trip.eventos.length
      ? [
          { em: trip.eventos.at(-1)!.ocorrido_em, texto: "Primeira leitura de catraca" },
          ...(trip.eventos.length > 1
            ? [{ em: trip.eventos[0].ocorrido_em, texto: "Última leitura de catraca" }]
            : []),
        ]
      : []),
    { em: trip.partiu_em, texto: "Partida registrada" },
    ...(trip.relato
      ? [
          {
            em: trip.relato.enviado_em,
            texto: `Relato da empresa: ${trip.relato.passageiros} passageiros`,
          },
        ]
      : []),
    ...(trip.conciliacao?.conferido_em
      ? [{ em: trip.conciliacao.conferido_em, texto: "Conferência concluída" }]
      : []),
  ]
    .filter((p): p is { em: string; texto: string; previsto?: boolean } => Boolean(p.em))
    .sort((a, b) => a.em.localeCompare(b.em));

  const colBilhetes: Column<Bilhete>[] = [
    {
      key: "codigo",
      header: "Bilhete",
      render: (b) => <span className="tabular">{b.codigo}</span>,
    },
    { key: "trecho", header: "Trecho", render: (b) => `${b.origem || "—"} → ${b.destino || "—"}` },
    {
      key: "valor",
      header: "Valor",
      align: "right",
      render: (b) => <span className="tabular">{b.valor !== null ? brl(b.valor) : "—"}</span>,
    },
    {
      key: "grat",
      header: "Gratuidade",
      render: (b) => <span className="text-muted-foreground">{b.gratuidade || "—"}</span>,
    },
    {
      key: "emitido",
      header: "Emitido em",
      render: (b) => (
        <span className="tabular text-muted-foreground">{dataHora(b.emitido_em)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (b) => (
        <StatusBadge tone={bilheteTone[b.status].tone}>{bilheteTone[b.status].label}</StatusBadge>
      ),
    },
  ];

  const colEventos: Column<EventoEmbarque>[] = [
    {
      key: "hora",
      header: "Horário",
      render: (e) => <span className="tabular font-semibold">{hora(e.ocorrido_em)}</span>,
    },
    { key: "disp", header: "Equipamento", render: (e) => e.dispositivo || "—" },
    {
      key: "bilhete",
      header: "Passagem",
      render: (e) => (
        <span className="tabular text-muted-foreground">{e.bilhete_codigo || "—"}</span>
      ),
    },
    { key: "evento", header: "Evento", render: (e) => eventoLabel[e.evento] },
    {
      key: "status",
      header: "Status",
      render: (e) => (
        <StatusBadge tone={eventoStatusTone[e.status].tone}>
          {eventoStatusTone[e.status].label}
        </StatusBadge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={`Viagem ${trip.numero || tipoViagemLabel[trip.tipo]}`}
        subtitle={`${trip.origem} → ${trip.destino} · ${dataBR(trip.data)}`}
        actions={
          <>
            <StatusBadge tone={tripStatusTone[trip.status].tone}>
              {tripStatusTone[trip.status].label}
            </StatusBadge>
            {trip.conciliacao && (
              <StatusBadge tone={conciliacaoTone[trip.conciliacao.situacao].tone} dot={false}>
                {conciliacaoTone[trip.conciliacao.situacao].label}
              </StatusBadge>
            )}
            <AcoesViagem viagem={trip} plataformas={plataformas} variant="botao" />
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <SectionCard title="Dados da viagem" bodyClassName="p-0">
          <dl className="grid grid-cols-2 gap-px bg-border md:grid-cols-3">
            <Item label="Empresa" value={nomeEmpresaViagem(trip)} />
            <Item label="Tipo" value={tipoViagemLabel[trip.tipo]} />
            <Item label="Linha" value={trip.linha ? trip.linha.descricao : "Lançada manualmente"} />
            <Item label="Origem" value={trip.origem} />
            <Item label="Destino" value={trip.destino} />
            <Item label="Data" value={dataBR(trip.data)} />
            <Item label="Previsto no terminal" value={horaPrevista(trip)} />
            <Item label="Chegada" value={trip.chegou_em ? hora(trip.chegou_em) : "—"} />
            <Item label="Partida" value={trip.partiu_em ? hora(trip.partiu_em) : "—"} />
            <Item label="Plataforma" value={trip.plataforma?.numero ?? "—"} />
            <Item label="Veículo" value={trip.veiculo || "—"} />
            <Item label="Atualizada em" value={dataHora(trip.atualizado_em)} />
          </dl>
          {trip.observacao && (
            <p className="border-t border-border px-5 py-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Observação:</span> {trip.observacao}
            </p>
          )}
          {!trip.previsto_em && trip.tipo !== "partida" && (
            <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
              A grade pública só informa o horário na cidade de origem. O horário no terminal chega
              pela integração da empresa ou pode ser lançado em Ações → Editar horário.
            </p>
          )}
        </SectionCard>

        <SectionCard title="Resumo das fontes">
          <ul className="space-y-3 text-sm">
            <Row label="Passagens emitidas (empresa)" value={emitidos} />
            <Row label="Passagens canceladas" value={cancelados} />
            <Row label="Acessos na catraca" value={acessos} />
            <Row label="Reentradas" value={reentradas} />
            <Row label="Acessos negados" value={negados} />
            <Row label="Relato da empresa" value={trip.relato ? trip.relato.passageiros : "—"} />
          </ul>
          <div className="mt-5 rounded-lg border border-border bg-muted/60 p-4">
            <p className="text-xs font-bold tracking-[0.12em] uppercase text-muted-foreground">
              Situação
            </p>
            <div className="mt-2">
              {trip.conciliacao ? (
                <StatusBadge tone={conciliacaoTone[trip.conciliacao.situacao].tone}>
                  {conciliacaoTone[trip.conciliacao.situacao].label}
                </StatusBadge>
              ) : (
                <StatusBadge tone="neutral">Sem conferência</StatusBadge>
              )}
            </div>
            {diferenca !== null && diferenca !== 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Diferença de {Math.abs(diferenca)} passageiros entre o relato da empresa e a
                catraca.
              </p>
            )}
            {!trip.relato && trip.bilhetes.length === 0 && trip.eventos.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Ainda não chegaram bilhetes, leituras de catraca nem relato da empresa para esta
                viagem. Eles são recebidos pela integração com o sistema da empresa e com as
                catracas.
              </p>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Passagens" value={num(emitidos)} icon={Ticket} />
        <StatCard label="Embarques (catraca)" value={num(acessos)} icon={Bus} tone="info" />
        <StatCard
          label="Plataforma"
          value={trip.plataforma?.numero ?? "—"}
          icon={MapPin}
          tone="neutral"
        />
        <StatCard
          label={trip.tipo === "chegada" ? "Chegada" : "Partida"}
          value={
            trip.tipo === "chegada"
              ? trip.chegou_em
                ? hora(trip.chegou_em)
                : "—"
              : trip.partiu_em
                ? hora(trip.partiu_em)
                : "—"
          }
          icon={Clock}
          tone="success"
          hint={`Previsto ${horaPrevista(trip)}`}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <SectionCard title="Linha do tempo">
          {linhaDoTempo.length === 0 ? (
            <EmptyState message="Nenhum registro de horário para esta viagem ainda." />
          ) : (
            <ol className="relative space-y-4 border-l border-border pl-5">
              {linhaDoTempo.map((p, i) => (
                <li key={i} className="relative">
                  <span
                    className={`absolute top-1.5 -left-[1.6rem] h-2.5 w-2.5 rounded-full ${p.previsto ? "bg-info" : "bg-primary"}`}
                  />
                  <p className="tabular text-xs text-muted-foreground">{dataHora(p.em)}</p>
                  <p className="text-sm font-medium">{p.texto}</p>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>

        <SectionCard
          title="Eventos de catraca"
          description="Leituras recebidas dos validadores de acesso"
          bodyClassName="p-0"
        >
          <DataTable
            columns={colEventos}
            rows={trip.eventos}
            emptyMessage="Nenhuma leitura de catraca vinculada a esta viagem."
          />
        </SectionCard>
      </div>

      <div className="mt-5">
        <SectionCard
          title="Bilhetes"
          description="Passagens emitidas pela empresa (BP-e) recebidas pela integração"
          bodyClassName="p-0"
        >
          <DataTable
            columns={colBilhetes}
            rows={trip.bilhetes}
            emptyMessage="Nenhum bilhete recebido da empresa para esta viagem."
          />
        </SectionCard>
      </div>
    </>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-5 py-4">
      <dt className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number | string }) {
  return (
    <li className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular font-display text-lg font-bold">{value}</span>
    </li>
  );
}
