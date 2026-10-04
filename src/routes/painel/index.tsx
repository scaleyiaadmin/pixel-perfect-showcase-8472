import { createFileRoute } from "@tanstack/react-router";
import { cidadeNome } from "@/lib/format";
import {
  emAberto,
  horaPrevista,
  useHoje,
  useViagensDoDia,
  type ViagemDetalhada,
} from "@/services/operacao";
import {
  BoardShell,
  BoardTable,
  empresaPainel,
  useAgora,
  type LinhaPainel,
  type StatusPainel,
} from "@/components/painel/PainelPublico";

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

const MIN = 60_000;

const statusPartida = (v: ViagemDetalhada): StatusPainel => {
  switch (v.status) {
    case "embarque":
    case "ultima-chamada":
    case "atrasada":
    case "cancelada":
    case "partiu":
      return v.status;
    case "realizada":
      return "partiu";
    default:
      return "prevista";
  }
};

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
  // Atraso marcado pela equipe: fica até 2 h depois do horário.
  if (v.status === "atrasada") return previsto !== null && previsto > agora - 120 * MIN;
  // Previstas sem atualização somem 10 min depois do horário
  // (o backend ainda não marca atraso automaticamente).
  return emAberto(v) && previsto !== null && previsto > agora - 10 * MIN;
}

function BoardDepartures() {
  const hoje = useHoje();
  const agora = useAgora();
  const viagens = useViagensDoDia(hoje);

  const proximas =
    agora && viagens.data ? viagens.data.filter((v) => noPainelDePartidas(v, agora)) : [];
  const idDestaque = proximas.find((v) => emAberto(v))?.id;

  const linhas: LinhaPainel[] = proximas.map((v) => ({
    id: v.id,
    hora: horaPrevista(v),
    local: cidadeNome(v.destino),
    empresa: empresaPainel(v),
    plataforma: v.plataforma ? String(v.plataforma.numero) : null,
    status: statusPartida(v),
    destaque: v.id === idDestaque,
  }));

  return (
    <BoardShell tela="partidas">
      <BoardTable
        linhas={linhas}
        colunaLocal="Destino"
        carregando={!hoje || !agora || viagens.isLoading}
        erro={Boolean(viagens.error && !viagens.data)}
        vazio={{
          titulo: "Sem mais partidas programadas hoje",
          detalhe: "Consulte o guichê da sua empresa para outras opções de viagem.",
        }}
      />
    </BoardShell>
  );
}
