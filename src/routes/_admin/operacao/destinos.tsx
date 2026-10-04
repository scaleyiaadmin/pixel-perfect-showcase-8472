import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDown, MapPin, Ticket } from "lucide-react";
import { EmptyState, PageHeader, QueryState, SectionCard, SourceNote } from "@/components/common";
import { Button } from "@/components/ui/button";
import { mesAno, useLinhas, usePassagensMensais } from "@/services/dados-publicos";
import { num, tituloNome } from "@/lib/format";

export const Route = createFileRoute("/_admin/operacao/destinos")({
  head: () => ({
    meta: [
      { title: "Destinos — SisRodov Manhuaçu" },
      {
        name: "description",
        content:
          "Cidades atendidas a partir do Terminal Rodoviário de Manhuaçu e passagens interestaduais por destino.",
      },
      { property: "og:title", content: "Destinos — SisRodov Manhuaçu" },
      { property: "og:description", content: "Destinos mais utilizados e cidades atendidas." },
    ],
  }),
  component: DestinationsPage,
});

const MANHUACU = "Manhuaçu";

/** Cidade em title-case mantendo a UF em maiúsculas ("CARATINGA/MG" → "Caratinga/MG"). */
function cidadeNome(c: string) {
  const m = c.match(/^(.*?)(\s*[/-]\s*)([A-Za-z]{2})$/);
  return m ? `${tituloNome(m[1])}${m[2]}${m[3].toUpperCase()}` : tituloNome(c);
}
/** Quantos itens aparecem antes do "ver todos" (mantém os dois cartões equilibrados). */
const TOP_RANKING = 10;
const TOP_CIDADES = 30;

function DestinationsPage() {
  const [rankingCompleto, setRankingCompleto] = useState(false);
  const [cidadesCompletas, setCidadesCompletas] = useState(false);
  const passagens = usePassagensMensais();
  const linhas = useLinhas();

  const { mes, ranking } = useMemo(() => {
    const data = passagens.data ?? [];
    const ultimo = data.reduce((m, p) => (p.mes_emissao > m ? p.mes_emissao : m), "");
    const porDestino = new Map<string, { saida: number; chegada: number }>();
    for (const p of data) {
      if (p.mes_emissao !== ultimo) continue;
      const saindo = p.origem === MANHUACU;
      const cidade = saindo ? `${p.destino}/${p.uf_destino}` : `${p.origem}/${p.uf_origem}`;
      const d = porDestino.get(cidade) ?? { saida: 0, chegada: 0 };
      if (saindo) d.saida += p.quantidade;
      else d.chegada += p.quantidade;
      porDestino.set(cidade, d);
    }
    return {
      mes: ultimo,
      ranking: [...porDestino.entries()]
        .map(([cidade, d]) => ({ cidade, ...d, total: d.saida + d.chegada }))
        .sort((a, b) => b.total - a.total),
    };
  }, [passagens.data]);

  const cidades = useMemo(() => {
    const set = new Map<string, Set<string>>();
    for (const l of linhas.data ?? []) {
      for (const c of l.cidades_atendidas) {
        const fontes = set.get(c) ?? new Set();
        fontes.add(l.fonte);
        set.set(c, fontes);
      }
    }
    return [...new Set([...set.keys()].map(cidadeNome))].sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
  }, [linhas.data]);

  const max = Math.max(1, ...ranking.map((r) => r.total));
  const rankingVisivel = rankingCompleto ? ranking : ranking.slice(0, TOP_RANKING);
  const cidadesVisiveis = cidadesCompletas ? cidades : cidades.slice(0, TOP_CIDADES);

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Destinos"
        subtitle="Cidades ligadas ao Terminal Rodoviário de Manhuaçu."
      />

      <div className="grid items-start gap-5 lg:grid-cols-[1.3fr_1fr]">
        <SectionCard
          title="Passagens interestaduais por cidade"
          description={
            mes ? `Bilhetes emitidos em ${mesAno(mes)}, saindo de e chegando a Manhuaçu` : undefined
          }
        >
          <QueryState isLoading={passagens.isLoading} error={passagens.error} />
          {passagens.data && ranking.length === 0 && (
            <EmptyState
              compact
              icon={Ticket}
              title="Sem passagens importadas"
              message="Os dados vêm da ANTT (MONITRIIP) e são atualizados automaticamente todo dia."
            />
          )}
          {ranking.length > 0 && (
            <ol className="space-y-4">
              {rankingVisivel.map((d, i) => (
                <li key={d.cidade}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm">
                    <span className="min-w-0 font-semibold">
                      <span className="tabular mr-1.5 text-xs font-normal text-muted-foreground">
                        {i + 1}.
                      </span>
                      {cidadeNome(d.cidade)}
                    </span>
                    <span className="tabular text-xs text-muted-foreground sm:text-sm">
                      {num(d.saida)} saindo · {num(d.chegada)} chegando
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(d.total / max) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
          {ranking.length > TOP_RANKING && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 -ml-2 text-primary"
              aria-expanded={rankingCompleto}
              onClick={() => setRankingCompleto((v) => !v)}
            >
              {rankingCompleto
                ? "Mostrar só as principais"
                : `Ver todas as ${num(ranking.length)} cidades`}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${rankingCompleto ? "rotate-180" : ""}`}
              />
            </Button>
          )}
          <SourceNote>
            Fonte: ANTT, MONITRIIP (Dados Abertos). Não inclui linhas dentro de MG.
          </SourceNote>
        </SectionCard>

        <SectionCard
          title="Cidades atendidas"
          description={
            cidades.length
              ? `${num(cidades.length)} cidades com linha autorizada a partir de Manhuaçu`
              : "Com linha autorizada a partir de Manhuaçu"
          }
        >
          <QueryState isLoading={linhas.isLoading} error={linhas.error} />
          {linhas.data && cidades.length === 0 && (
            <EmptyState
              compact
              icon={MapPin}
              title="Nenhuma cidade importada"
              message="As cidades vêm das seções das linhas da ANTT e dos itinerários do DER-MG."
            />
          )}
          {cidades.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 sm:gap-2">
              {cidadesVisiveis.map((c) => (
                <li
                  key={c}
                  className="max-w-full truncate rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground"
                  title={c}
                >
                  {c}
                </li>
              ))}
            </ul>
          )}
          {cidades.length > TOP_CIDADES && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 -ml-2 text-primary"
              aria-expanded={cidadesCompletas}
              onClick={() => setCidadesCompletas((v) => !v)}
            >
              {cidadesCompletas ? "Mostrar menos" : `Ver todas as ${num(cidades.length)} cidades`}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${cidadesCompletas ? "rotate-180" : ""}`}
              />
            </Button>
          )}
          <SourceNote>Fontes: ANTT (seções das linhas) e DER-MG (itinerários).</SourceNote>
        </SectionCard>
      </div>
    </>
  );
}
