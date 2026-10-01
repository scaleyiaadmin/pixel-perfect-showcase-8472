import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Maximize2 } from "lucide-react";
import { PrefeituraLogo, RodoviariaLogo } from "@/components/brand/Logos";
import {
  destinoDaPartida,
  horaCurta,
  nomeEmpresa,
  partidasDoDia,
  useHorarios,
} from "@/services/dados-publicos";
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
        now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      );
      setToday(now.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }));
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

function BoardDepartures() {
  const horarios = useHorarios();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Próximas partidas programadas; saem da tela 5 minutos depois do horário.
  const proximas = now
    ? partidasDoDia(horarios.data ?? [], now)
        .filter((h) => {
          const [hh, mm] = h.hora.split(":").map(Number);
          return hh * 60 + mm >= now.getHours() * 60 + now.getMinutes() - 5;
        })
        .slice(0, 9)
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

        {horarios.isLoading && (
          <p className="py-10 text-center font-board text-2xl text-board-foreground/60">
            Carregando…
          </p>
        )}
        {horarios.error && (
          <p className="py-10 text-center font-board text-2xl text-board-foreground/60">
            Painel temporariamente indisponível.
          </p>
        )}
        {horarios.data && proximas.length === 0 && (
          <p className="py-10 text-center font-board text-2xl text-board-foreground/60">
            Sem mais partidas programadas hoje.
          </p>
        )}

        {proximas.map((h) => {
          const status = boardStatus.prevista;
          return (
            <div
              key={h.id}
              className="grid grid-cols-[7rem_1fr_1fr_8rem_14rem] items-center gap-4 border-b border-board-foreground/10 py-4"
            >
              <span className="tabular font-board text-4xl font-bold md:text-5xl">
                {horaCurta(h.hora)}
              </span>
              <span className="font-board text-3xl font-semibold tracking-wide uppercase md:text-4xl">
                {destinoDaPartida(h)}
              </span>
              <span className="font-board text-2xl tracking-wide text-board-foreground/75 uppercase md:text-3xl">
                {h.linha.empresa?.razao_social ??
                  (h.linha.fonte === "DER-MG" ? "Intermunicipal" : nomeEmpresa(h.linha))}
              </span>
              <span className="text-center font-board text-4xl font-bold text-board-foreground/50 md:text-5xl">
                —
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
