import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Clock, DoorOpen, ScanLine, TriangleAlert } from "lucide-react";
import {
  DataTable,
  EmptyState,
  PageHeader,
  QueryState,
  SectionCard,
  StatCard,
  StatGrid,
  StatusBadge,
  Vazio,
  type Column,
  type Tone,
} from "@/components/common";
import { Input } from "@/components/ui/input";
import { hora, num, tituloNome } from "@/lib/format";
import type { EventoEmbarque } from "@/services/gestao-tipos";
import {
  dataBR,
  horaPrevista,
  useEventosEmbarque,
  useHoje,
  type EventoEmbarqueDetalhado,
} from "@/services/operacao";

export const Route = createFileRoute("/_admin/controle-embarque")({
  head: () => ({
    meta: [
      { title: "Controle de Embarque — SisRodov Manhuaçu" },
      {
        name: "description",
        content:
          "Acessos registrados nas catracas do Terminal Rodoviário de Manhuaçu e eventos de embarque.",
      },
      { property: "og:title", content: "Controle de Embarque — SisRodov Manhuaçu" },
      {
        property: "og:description",
        content: "Catracas, acessos e eventos de embarque do terminal.",
      },
    ],
  }),
  component: GateControlPage,
});

const statusTone: Record<EventoEmbarque["status"], { tone: Tone; label: string }> = {
  confirmado: { tone: "success", label: "Confirmado" },
  pendente: { tone: "warning", label: "Pendente" },
  rejeitado: { tone: "danger", label: "Rejeitado" },
};

const eventoLabel: Record<EventoEmbarque["evento"], string> = {
  acesso: "Acesso",
  reentrada: "Reentrada",
  negado: "Acesso negado",
};

/** Equipamento sem leitura há mais que isso aparece como "sem leitura recente". */
const RECENTE_MS = 15 * 60 * 1000;

function GateControlPage() {
  const hoje = useHoje();
  const [data, setData] = useState<string | null>(null);
  const [agora, setAgora] = useState(0);

  useEffect(() => {
    if (hoje && !data) setData(hoje);
  }, [hoje, data]);

  useEffect(() => {
    setAgora(Date.now());
    const id = window.setInterval(() => setAgora(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const eventos = useEventosEmbarque(data);
  const lista = useMemo(() => eventos.data ?? [], [eventos.data]);

  const { acessos, pendentes, dispositivos } = useMemo(() => {
    const porDispositivo = new Map<
      string,
      { nome: string; acessos: number; reentradas: number; negados: number; ultimo: string }
    >();
    let acessos = 0;
    let pendentes = 0;
    for (const e of lista) {
      if (e.evento === "acesso" && e.status === "confirmado") acessos++;
      if (e.status === "pendente") pendentes++;
      const nome = e.dispositivo || "Não identificado";
      const d = porDispositivo.get(nome) ?? {
        nome,
        acessos: 0,
        reentradas: 0,
        negados: 0,
        ultimo: e.ocorrido_em,
      };
      if (e.evento === "acesso" && e.status === "confirmado") d.acessos++;
      if (e.evento === "reentrada") d.reentradas++;
      if (e.evento === "negado") d.negados++;
      if (e.ocorrido_em > d.ultimo) d.ultimo = e.ocorrido_em;
      porDispositivo.set(nome, d);
    }
    return {
      acessos,
      pendentes,
      dispositivos: [...porDispositivo.values()].sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR"),
      ),
    };
  }, [lista]);

  const ultimo = lista[0];
  const ativos = dispositivos.filter(
    (d) => agora - new Date(d.ultimo).getTime() < RECENTE_MS,
  ).length;
  const eHoje = data === hoje;

  const columns: Column<EventoEmbarqueDetalhado>[] = [
    {
      key: "time",
      header: "Horário",
      nowrap: true,
      mobile: "meta",
      render: (e) => <span className="tabular font-semibold">{hora(e.ocorrido_em)}</span>,
    },
    {
      key: "event",
      header: "Evento",
      nowrap: true,
      mobile: "title",
      render: (e) => eventoLabel[e.evento],
    },
    {
      key: "device",
      header: "Equipamento",
      mobile: "subtitle",
      render: (e) => e.dispositivo || <Vazio title="Equipamento não identificado" />,
    },
    {
      key: "trip",
      header: "Viagem",
      mobile: "meta",
      cellClassName: "min-w-[10rem]",
      render: (e) =>
        e.viagem ? (
          <span className="text-muted-foreground">
            <span className="tabular">{horaPrevista(e.viagem)}</span> ·{" "}
            {tituloNome(e.viagem.tipo === "chegada" ? e.viagem.origem : e.viagem.destino)}
          </span>
        ) : (
          <Vazio title="Sem viagem vinculada" />
        ),
    },
    {
      key: "ticket",
      header: "Passagem",
      nowrap: true,
      hideOnMobile: true,
      render: (e) =>
        e.bilhete_codigo ? (
          <span className="tabular text-muted-foreground">{e.bilhete_codigo}</span>
        ) : (
          <Vazio />
        ),
    },
    {
      key: "status",
      header: "Status",
      nowrap: true,
      mobile: "badge",
      render: (e) => (
        <StatusBadge size="sm" tone={statusTone[e.status].tone}>
          {statusTone[e.status].label}
        </StatusBadge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Controle de Embarque"
        subtitle="Acompanhamento dos acessos registrados nas catracas do terminal"
        actions={
          <label className="flex items-center gap-2 text-sm">
            <span className="shrink-0 font-medium text-muted-foreground">Data</span>
            <Input
              type="date"
              value={data ?? ""}
              onChange={(e) => e.target.value && setData(e.target.value)}
              className="tabular h-11 w-full bg-card sm:h-9 sm:w-[10.5rem]"
            />
          </label>
        }
      />

      <StatGrid>
        <StatCard
          label={eHoje ? "Acessos hoje" : `Acessos em ${data ? dataBR(data) : ""}`}
          value={eventos.data ? num(acessos) : "—"}
          icon={DoorOpen}
        />
        <StatCard
          label={eHoje ? "Equipamentos ativos" : "Equipamentos com leitura"}
          value={eventos.data ? (eHoje ? ativos : dispositivos.length) : "—"}
          icon={ScanLine}
          tone="success"
          hint={
            eHoje && eventos.data
              ? `nos últimos 15 min · ${dispositivos.length} com leitura hoje`
              : undefined
          }
        />
        <StatCard
          label="Último acesso"
          value={ultimo ? hora(ultimo.ocorrido_em) : "—"}
          icon={Clock}
          tone="info"
          hint={ultimo?.dispositivo || undefined}
        />
        <StatCard
          label="Eventos pendentes"
          value={eventos.data ? pendentes : "—"}
          icon={TriangleAlert}
          tone="warning"
        />
      </StatGrid>

      <QueryState isLoading={!data || eventos.isLoading} error={eventos.error} />

      {eventos.data && dispositivos.length > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          {dispositivos.map((g) => {
            const recente = eHoje && agora - new Date(g.ultimo).getTime() < RECENTE_MS;
            return (
              <div key={g.nome} className="surface-card min-w-0 rounded-xl bg-card p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 font-display text-lg font-bold break-words">{g.nome}</p>
                  <ScanLine
                    className={`h-5 w-5 shrink-0 ${recente ? "text-success" : "text-muted-foreground"}`}
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-3">
                  {recente ? (
                    <StatusBadge tone="success">Lendo agora</StatusBadge>
                  ) : (
                    <StatusBadge tone="neutral">Última leitura {hora(g.ultimo)}</StatusBadge>
                  )}
                </div>
                <p className="tabular mt-3 text-sm text-muted-foreground">
                  {num(g.acessos)} acessos · {num(g.reentradas)} reentradas · {num(g.negados)}{" "}
                  negados
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        <SectionCard
          title="Eventos de embarque"
          description="Leituras recebidas das catracas · atualização automática a cada 30 s"
          bodyClassName="p-0"
        >
          {eventos.data && lista.length === 0 ? (
            <EmptyState
              icon={ScanLine}
              title={`Sem leituras em ${data ? dataBR(data) : "esta data"}`}
              message="Os acessos chegam sozinhos quando as catracas forem integradas em Integrações."
            />
          ) : (
            eventos.data && (
              <DataTable minWidth="40rem" columns={columns} rows={lista.slice(0, 300)} />
            )
          )}
        </SectionCard>
        {lista.length > 300 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Mostrando as 300 leituras mais recentes de {num(lista.length)}.
          </p>
        )}
      </div>
    </>
  );
}
