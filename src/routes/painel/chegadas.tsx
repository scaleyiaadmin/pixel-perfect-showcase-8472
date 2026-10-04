import { createFileRoute } from "@tanstack/react-router";
import { cidadeNome, hora } from "@/lib/format";
import { horaPrevista, useHoje, useViagensDoDia, type ViagemDetalhada } from "@/services/operacao";
import {
  BoardShell,
  BoardTable,
  empresaPainel,
  useAgora,
  type LinhaPainel,
  type StatusPainel,
} from "@/components/painel/PainelPublico";

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

const MIN = 60_000;

function situacao(v: ViagemDetalhada): StatusPainel {
  if (v.status === "cancelada") return "cancelada";
  if (v.chegou_em) return "chegou";
  if (v.status === "atrasada") return "atrasada";
  return "prevista";
}

/**
 * Chegadas e passagens com horário no terminal conhecido (lançado pela equipe ou recebido
 * da empresa). Quem já chegou fica 15 minutos na tela; canceladas, 30 minutos.
 * Previstas sem atualização somem 30 minutos depois do horário (atraso marcado: 2 h).
 */
function noPainelDeChegadas(v: ViagemDetalhada, agora: number) {
  if (v.tipo === "partida") return false;
  const ref = v.previsto_em ?? v.chegou_em;
  if (!ref) return false;
  if (v.chegou_em) return new Date(v.chegou_em).getTime() > agora - 15 * MIN;
  const previsto = new Date(ref).getTime();
  if (v.status === "cancelada") return previsto > agora - 30 * MIN;
  if (v.status === "partiu" || v.status === "realizada") return false;
  if (v.status === "atrasada") return previsto > agora - 120 * MIN;
  return previsto > agora - 30 * MIN;
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
      : [];
  const idDestaque = chegadas.find((v) => !v.chegou_em && v.status !== "cancelada")?.id;

  const linhas: LinhaPainel[] = chegadas.map((v) => ({
    id: v.id,
    hora: v.previsto_em ? horaPrevista(v) : hora(v.chegou_em!),
    local: cidadeNome(v.origem),
    empresa: empresaPainel(v),
    plataforma: v.plataforma ? String(v.plataforma.numero) : null,
    status: situacao(v),
    destaque: v.id === idDestaque,
  }));

  return (
    <BoardShell
      tela="chegadas"
      nota="Horários de chegada informados pelas empresas e pela equipe do terminal."
    >
      <BoardTable
        linhas={linhas}
        colunaLocal="Origem"
        carregando={!hoje || !agora || viagens.isLoading}
        erro={Boolean(viagens.error && !viagens.data)}
        vazio={{
          titulo: "Nenhuma chegada prevista no momento",
          detalhe:
            "Os horários aparecem aqui assim que as empresas ou a equipe do terminal os informam.",
        }}
      />
    </BoardShell>
  );
}
