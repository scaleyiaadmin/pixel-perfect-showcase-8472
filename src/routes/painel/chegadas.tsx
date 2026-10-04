import { createFileRoute } from "@tanstack/react-router";
import { hora } from "@/lib/format";
import { cn } from "@/lib/utils";
import { horaPrevista, useHoje, useViagensDoDia, type ViagemDetalhada } from "@/services/operacao";
import { BoardShell, empresaPainel, useAgora } from "./index";

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
  previsto: { label: "PREVISTO", className: "bg-info text-info-foreground" },
  atrasado: { label: "ATRASADO", className: "bg-danger text-danger-foreground" },
  cancelado: { label: "CANCELADO", className: "bg-danger text-danger-foreground" },
  chegou: {
    label: "CHEGOU",
    className: "bg-board-row text-board-foreground/70 border border-board-foreground/25",
  },
};

const MIN = 60_000;

function situacao(v: ViagemDetalhada) {
  if (v.status === "cancelada") return status.cancelado;
  if (v.chegou_em) return status.chegou;
  if (v.status === "atrasada") return status.atrasado;
  return status.previsto;
}

/**
 * Chegadas e passagens com horário no terminal conhecido (lançado pela equipe ou recebido
 * da empresa). Quem já chegou fica 15 minutos na tela; canceladas, 30 minutos.
 */
function noPainelDeChegadas(v: ViagemDetalhada, agora: number) {
  if (v.tipo === "partida") return false;
  const ref = v.previsto_em ?? v.chegou_em;
  if (!ref) return false;
  if (v.chegou_em) return new Date(v.chegou_em).getTime() > agora - 15 * MIN;
  const previsto = new Date(ref).getTime();
  if (v.status === "cancelada") return previsto > agora - 30 * MIN;
  if (v.status === "partiu" || v.status === "realizada") return false;
  return previsto > agora - 120 * MIN;
}

function BoardArrivals() {
  const hoje = useHoje();
  const agora = useAgora();
  const viagens = useViagensDoDia(hoje);

  const chegadas =
    agora && viagens.data
      ? viagens.data
          .filter((v) => noPainelDeChegadas(v, agora))
          .sort((a, b) =>
            (a.previsto_em ?? a.chegou_em!).localeCompare(b.previsto_em ?? b.chegou_em!),
          )
          .slice(0, 9)
      : [];

  return (
    <BoardShell title="Chegadas">
      <div className="px-8 py-6">
        <div className="grid grid-cols-[7rem_1fr_1fr_8rem_14rem] gap-4 border-b border-board-foreground/20 pb-3 font-board text-xl tracking-[0.25em] uppercase text-board-foreground/60 md:text-2xl">
          <span>Horário</span>
          <span>Origem</span>
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
        {viagens.data && chegadas.length === 0 && (
          <p className="py-10 text-center font-board text-2xl text-board-foreground/60">
            Nenhuma chegada com horário informado no momento.
          </p>
        )}

        {chegadas.map((v) => {
          const s = situacao(v);
          return (
            <div
              key={v.id}
              className="grid grid-cols-[7rem_1fr_1fr_8rem_14rem] items-center gap-4 border-b border-board-foreground/10 py-4"
            >
              <span className="tabular font-board text-4xl font-bold md:text-5xl">
                {v.previsto_em ? horaPrevista(v) : hora(v.chegou_em!)}
              </span>
              <span className="font-board text-3xl font-semibold tracking-wide uppercase md:text-4xl">
                {v.origem}
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
                    "inline-flex min-w-[11rem] items-center justify-center rounded-md px-4 py-2 font-board text-xl font-bold tracking-[0.15em] uppercase md:text-2xl",
                    s.className,
                  )}
                >
                  {s.label}
                </span>
              </span>
            </div>
          );
        })}

        <p className="mt-6 text-center text-sm tracking-wide text-board-foreground/50 uppercase">
          Horários de chegada informados pelas empresas e pela equipe do terminal
        </p>
      </div>
    </BoardShell>
  );
}
