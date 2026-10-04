import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Maximize2 } from "lucide-react";
import { PrefeituraLogo, RodoviariaLogo } from "@/components/brand/Logos";
import { TZ } from "@/lib/format";
import {
  emAberto,
  horaPrevista,
  nomeEmpresaViagem,
  useHoje,
  useViagensDoDia,
  type ViagemDetalhada,
} from "@/services/operacao";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/painel/")({
  head: () => ({
    meta: [
      { title: "Painel de Partidas — Nova Rodoviária de Manhuaçu" },
      {
        name: "description",
        content:
          "Painel público de partidas da Nova Rodoviária de Manhuaçu com horários, destinos, empresas e plataformas.",
      },
      { property: "og:title", content: "Painel de Partidas — Nova Rodoviária de Manhuaçu" },
      {
        property: "og:description",
        content:
          "Horários, destinos, empresas e plataformas em tempo real no terminal de Manhuaçu.",
      },
    ],
  }),
  component: BoardDepartures,
});

const boardStatus: Record<string, { label: string; className: string }> = {
  embarque: { label: "EMBARQUE", className: "bg-success text-success-foreground" },
  "ultima-chamada": { label: "ÚLTIMA CHAMADA", className: "bg-warning text-warning-foreground" },
  atrasada: { label: "ATRASADO", className: "bg-danger text-danger-foreground" },
  prevista: { label: "PREVISTO", className: "bg-info text-info-foreground" },
  partiu: {
    label: "PARTIU",
    className: "bg-board-row text-board-foreground/70 border border-board-foreground/25",
  },
  realizada: {
    label: "PARTIU",
    className: "bg-board-row text-board-foreground/70 border border-board-foreground/25",
  },
  cancelada: { label: "CANCELADO", className: "bg-danger text-danger-foreground" },
};

export function BoardShell({ title, children }: { title: string; children: React.ReactNode }) {
  const [clock, setClock] = useState("");
  const [today, setToday] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(
        now.toLocaleTimeString("pt-BR", {
          timeZone: TZ,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
      setToday(
        now.toLocaleDateString("pt-BR", {
          timeZone: TZ,
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const goFullscreen = () => {
    if (typeof document !== "undefined" && document.documentElement.requestFullscreen) {
      void document.documentElement.requestFullscreen();
    }
  };

  return (
    <div className="min-h-screen gradient-board text-board-foreground">
      <header className="flex flex-wrap items-center justify-between gap-6 border-b border-board-foreground/15 px-8 py-6">
        <RodoviariaLogo inverted size="lg" />
        <div className="text-center">
          <h1 className="font-display text-3xl font-extrabold tracking-[0.12em] uppercase md:text-4xl">
            Nova Rodoviária de Manhuaçu
          </h1>
          <p className="mt-1 font-board text-2xl font-semibold tracking-[0.4em] uppercase text-sidebar-primary">
            {title}
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="tabular font-board text-5xl leading-none font-bold">{clock}</p>
            <p className="text-xs tracking-[0.2em] uppercase text-board-foreground/60">{today}</p>
          </div>
          <PrefeituraLogo inverted />
        </div>
      </header>

      {children}

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-board-foreground/15 px-8 py-5 text-sm text-board-foreground/70">
        <div className="flex gap-4">
          <Link
            to="/painel"
            className="font-board text-xl tracking-[0.2em] uppercase hover:text-board-foreground"
          >
            Partidas
          </Link>
          <Link
            to="/painel/chegadas"
            className="font-board text-xl tracking-[0.2em] uppercase hover:text-board-foreground"
          >
            Chegadas
          </Link>
        </div>
        <span>SisRodov Manhuaçu · Informação, controle e transparência em cada embarque</span>
        <div className="flex items-center gap-3">
          <button
            onClick={goFullscreen}
            className="flex items-center gap-2 rounded-lg border border-board-foreground/25 px-3 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors hover:bg-board-row"
          >
            <Maximize2 className="h-4 w-4" /> Tela cheia
          </button>
          <Link
            to="/dashboard"
            className="rounded-lg border border-board-foreground/25 px-3 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors hover:bg-board-row"
          >
            Voltar ao sistema
          </Link>
        </div>
      </footer>
    </div>
  );
}

/** Relógio do painel para os filtros (atualiza a cada 30 s). */
export function useAgora() {
  const [agora, setAgora] = useState<number | null>(null);
  useEffect(() => {
    setAgora(Date.now());
    const id = window.setInterval(() => setAgora(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return agora;
}

const MIN = 60_000;

/** Empresa curta para o painel. */
export const empresaPainel = (v: ViagemDetalhada) => nomeEmpresaViagem(v);

/**
 * Viagens que aparecem no painel de partidas: saem do terminal (partida ou passagem),
 * têm horário conhecido ou já estão em embarque, e ainda não se encerraram
 * (as que partiram ficam 5 minutos; as canceladas, até 30 minutos depois do previsto).
 */
function noPainelDePartidas(v: ViagemDetalhada, agora: number) {
  if (v.tipo === "chegada") return false;
  const emEmbarque = v.status === "embarque" || v.status === "ultima-chamada";
  const previsto = v.previsto_em ? new Date(v.previsto_em).getTime() : null;
  if (!previsto && !emEmbarque && !v.chegou_em) return false;
  if (v.status === "partiu" || v.status === "realizada") {
    return v.partiu_em ? new Date(v.partiu_em).getTime() > agora - 5 * MIN : false;
  }
  if (v.status === "cancelada") return previsto ? previsto > agora - 30 * MIN : false;
  if (emEmbarque || v.chegou_em) return true;
  // Previstas/atrasadas sem atualização somem 2 h depois do horário.
  return emAberto(v) && previsto !== null && previsto > agora - 120 * MIN;
}

function BoardDepartures() {
  const hoje = useHoje();
  const agora = useAgora();
  const viagens = useViagensDoDia(hoje);

  const proximas =
    agora && viagens.data
      ? viagens.data.filter((v) => noPainelDePartidas(v, agora)).slice(0, 9)
      : [];

  return (
    <BoardShell title="Partidas">
      <div className="px-8 py-6">
        <div className="grid grid-cols-[7rem_1fr_1fr_8rem_14rem] gap-4 border-b border-board-foreground/20 pb-3 font-board text-xl tracking-[0.25em] uppercase text-board-foreground/60 md:text-2xl">
          <span>Horário</span>
          <span>Destino</span>
          <span>Empresa</span>
          <span className="text-center">Plataforma</span>
          <span className="text-center">Status</span>
        </div>

        {(!hoje || viagens.isLoading) && (
          <p className="py-10 text-center font-board text-2xl text-board-foreground/60">
            Carregando…
          </p>
        )}
        {viagens.error && !viagens.data && (
          <p className="py-10 text-center font-board text-2xl text-board-foreground/60">
            Painel temporariamente indisponível.
          </p>
        )}
        {viagens.data && proximas.length === 0 && (
          <p className="py-10 text-center font-board text-2xl text-board-foreground/60">
            Sem mais partidas programadas hoje.
          </p>
        )}

        {proximas.map((v) => {
          const status = boardStatus[v.status] ?? boardStatus.prevista;
          return (
            <div
              key={v.id}
              className="grid grid-cols-[7rem_1fr_1fr_8rem_14rem] items-center gap-4 border-b border-board-foreground/10 py-4"
            >
              <span className="tabular font-board text-4xl font-bold md:text-5xl">
                {horaPrevista(v)}
              </span>
              <span className="font-board text-3xl font-semibold tracking-wide uppercase md:text-4xl">
                {v.destino}
              </span>
              <span className="font-board text-2xl tracking-wide text-board-foreground/75 uppercase md:text-3xl">
                {empresaPainel(v)}
              </span>
              <span
                className={cn(
                  "text-center font-board text-4xl font-bold md:text-5xl",
                  !v.plataforma && "text-board-foreground/50",
                )}
              >
                {v.plataforma?.numero ?? "—"}
              </span>
              <span className="flex justify-center">
                <span
                  className={cn(
                    "inline-flex min-w-[11rem] items-center justify-center gap-2 rounded-md px-4 py-2 font-board text-xl font-bold tracking-[0.15em] uppercase md:text-2xl",
                    status.className,
                  )}
                >
                  {status.label}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </BoardShell>
  );
}
