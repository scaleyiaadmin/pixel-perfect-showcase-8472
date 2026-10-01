import { createFileRoute } from "@tanstack/react-router";
import { arrivals, companyName } from "@/data/mock";
import { cn } from "@/lib/utils";
import { BoardShell } from "./index";

export const Route = createFileRoute("/painel/chegadas")({
  head: () => ({
    meta: [
      { title: "Painel de Chegadas — Nova Rodoviária de Manhuaçu" },
      {
        name: "description",
        content:
          "Painel público de chegadas da Nova Rodoviária de Manhuaçu com horários, origens, empresas e plataformas.",
      },
      { property: "og:title", content: "Painel de Chegadas — Nova Rodoviária de Manhuaçu" },
      {
        property: "og:description",
        content: "Chegadas previstas no Terminal Rodoviário de Manhuaçu.",
      },
    ],
  }),
  component: BoardArrivals,
});

const status: Record<string, { label: string; className: string }> = {
  chegando: { label: "CHEGANDO", className: "bg-success text-success-foreground" },
  previsto: { label: "PREVISTO", className: "bg-info text-info-foreground" },
  atrasado: { label: "ATRASADO", className: "bg-danger text-danger-foreground" },
  chegou: {
    label: "CHEGOU",
    className: "bg-board-row text-board-foreground/70 border border-board-foreground/25",
  },
};

function BoardArrivals() {
  return (
    <BoardShell title="Chegadas">
      <div className="px-8 py-6">
        <p className="mb-4 rounded-md border border-warning/40 bg-warning/15 px-4 py-2 text-center text-sm font-semibold tracking-wide text-warning uppercase">
          Dados de exemplo · horários de chegada dependem do lançamento pela equipe do terminal
        </p>
        <div className="grid grid-cols-[7rem_1fr_1fr_8rem_14rem] gap-4 border-b border-board-foreground/20 pb-3 font-board text-xl tracking-[0.25em] uppercase text-board-foreground/60 md:text-2xl">
          <span>Horário</span>
          <span>Origem</span>
          <span>Empresa</span>
          <span className="text-center">Plataforma</span>
          <span className="text-center">Status</span>
        </div>

        {arrivals.map((a) => (
          <div
            key={a.id}
            className="grid grid-cols-[7rem_1fr_1fr_8rem_14rem] items-center gap-4 border-b border-board-foreground/10 py-4"
          >
            <span className="tabular font-board text-4xl font-bold md:text-5xl">{a.time}</span>
            <span className="font-board text-3xl font-semibold tracking-wide uppercase md:text-4xl">
              {a.origin}
            </span>
            <span className="font-board text-2xl tracking-wide text-board-foreground/75 uppercase md:text-3xl">
              {companyName(a.companyId)}
            </span>
            <span className="text-center font-board text-4xl font-bold md:text-5xl">
              {a.platform}
            </span>
            <span className="flex justify-center">
              <span
                className={cn(
                  "inline-flex min-w-[11rem] items-center justify-center rounded-md px-4 py-2 font-board text-xl font-bold tracking-[0.15em] uppercase md:text-2xl",
                  status[a.status].className,
                )}
              >
                {status[a.status].label}
              </span>
            </span>
          </div>
        ))}
      </div>
    </BoardShell>
  );
}
