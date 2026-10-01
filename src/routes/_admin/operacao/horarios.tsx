import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  EmptyState,
  FilterBar,
  PageHeader,
  QueryState,
  SectionCard,
  SourceNote,
  StatusBadge,
} from "@/components/common";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  descreverDias,
  destinoDaPartida,
  horaCurta,
  nomeEmpresa,
  operaEm,
  useHorarios,
} from "@/services/dados-publicos";

export const Route = createFileRoute("/_admin/operacao/horarios")({
  head: () => ({
    meta: [
      { title: "Horários — SisRodov Manhuaçu" },
      {
        name: "description",
        content: "Grade de partidas do Terminal Rodoviário de Manhuaçu por empresa e destino.",
      },
      { property: "og:title", content: "Horários — SisRodov Manhuaçu" },
      {
        property: "og:description",
        content: "Grade de partidas do terminal por empresa e destino.",
      },
    ],
  }),
  component: SchedulesPage,
});

function SchedulesPage() {
  const horarios = useHorarios();
  const [search, setSearch] = useState("");
  const [dia, setDia] = useState("todos");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const hoje = new Date();
    return (horarios.data ?? []).filter(
      (h) =>
        h.parte_de_manhuacu &&
        (dia === "todos" || operaEm(h, hoje)) &&
        (!q ||
          `${destinoDaPartida(h)} ${nomeEmpresa(h.linha)} ${h.linha.codigo}`
            .toLowerCase()
            .includes(q)),
    );
  }, [horarios.data, search, dia]);

  return (
    <>
      <PageHeader title="Horários" subtitle="Grade oficial de partidas do terminal de Manhuaçu" />

      <FilterBar search={search} onSearch={setSearch} placeholder="Pesquisar destino ou empresa...">
        <Select value={dia} onValueChange={setDia}>
          <SelectTrigger className="h-9 w-[12rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os dias</SelectItem>
            <SelectItem value="hoje">Só hoje</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      <SectionCard bodyClassName="p-0" title="Grade de partidas">
        <QueryState isLoading={horarios.isLoading} error={horarios.error} />
        {horarios.data && rows.length === 0 && <EmptyState message="Nenhuma partida encontrada." />}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <div className="min-w-[48rem]">
              <div className="grid grid-cols-[6rem_1fr_1fr_9rem_10rem] gap-3 border-b border-border bg-muted/60 px-5 py-3 text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground">
                <span>Horário</span>
                <span>Destino</span>
                <span>Empresa</span>
                <span>Dias</span>
                <span>Linha</span>
              </div>
              <div className="divide-y divide-border/60">
                {rows.map((h) => (
                  <div
                    key={h.id}
                    className="grid grid-cols-[6rem_1fr_1fr_9rem_10rem] items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/50"
                  >
                    <span className="tabular font-display text-xl font-bold">
                      {horaCurta(h.hora)}
                    </span>
                    <span className="truncate text-sm font-semibold">
                      {destinoDaPartida(h)}
                      {h.tipo_servico && (
                        <span className="ml-2 font-normal text-muted-foreground">
                          {h.tipo_servico}
                        </span>
                      )}
                    </span>
                    <span className="truncate text-sm text-muted-foreground">
                      {nomeEmpresa(h.linha)}
                    </span>
                    <span className="text-sm">{descreverDias(h.dias_semana)}</span>
                    <StatusBadge tone={h.linha.fonte === "ANTT" ? "info" : "primary"} dot={false}>
                      {h.linha.fonte} · {h.linha.codigo}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SectionCard>
      <SourceNote>
        Fontes: ANTT (SIGMA) e DER-MG. Linhas que só passam por Manhuaçu não aparecem: os órgãos
        publicam apenas a hora de saída no início da linha.
      </SourceNote>
    </>
  );
}
