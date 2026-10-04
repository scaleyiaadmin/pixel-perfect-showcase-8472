import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { MapPin } from "lucide-react";
import { EmptyState, PageHeader, QueryState, SectionCard, SourceNote } from "@/components/common";
import { mesAno, useLinhas, usePassagensMensais } from "@/services/dados-publicos";
import { num } from "@/lib/format";

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

function DestinationsPage() {
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
    return [...set.keys()].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [linhas.data]);

  const max = Math.max(1, ...ranking.map((r) => r.total));

  return (
    <>
      <PageHeader title="Destinos" subtitle="Cidades ligadas ao Terminal Rodoviário de Manhuaçu" />

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <SectionCard
          title="Passagens interestaduais por cidade"
          description={
            mes ? `Bilhetes emitidos em ${mesAno(mes)}, saindo de e chegando a Manhuaçu` : undefined
          }
        >
          <QueryState isLoading={passagens.isLoading} error={passagens.error} />
          {passagens.data && ranking.length === 0 && (
            <EmptyState message="Sem passagens importadas. Os dados vêm da ANTT (MONITRIIP) e são atualizados automaticamente todo dia." />
          )}
          <ul className="space-y-4">
            {ranking.map((d) => (
              <li key={d.cidade}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{d.cidade}</span>
                  <span className="tabular text-muted-foreground">
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
          </ul>
          <SourceNote>
            Fonte: ANTT, MONITRIIP (Dados Abertos). Não inclui linhas dentro de MG.
          </SourceNote>
        </SectionCard>

        <SectionCard
          title="Cidades atendidas"
          description="Com linha autorizada a partir de Manhuaçu"
        >
          <QueryState isLoading={linhas.isLoading} error={linhas.error} />
          <div className="mx-auto mb-5 w-fit rounded-lg gradient-institutional px-5 py-3 text-center text-primary-foreground">
            <MapPin className="mx-auto h-5 w-5" />
            <p className="mt-1 font-display text-sm font-bold tracking-wide uppercase">Manhuaçu</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {cidades.map((c) => (
              <span
                key={c}
                className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium"
              >
                {c}
              </span>
            ))}
          </div>
          <SourceNote>Fontes: ANTT (seções das linhas) e DER-MG (itinerários).</SourceNote>
        </SectionCard>
      </div>
    </>
  );
}
