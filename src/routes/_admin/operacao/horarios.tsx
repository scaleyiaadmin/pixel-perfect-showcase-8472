import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  DataTable,
  EmptyState,
  FilterBar,
  FilterSelect,
  PageHeader,
  QueryState,
  SectionCard,
  SourceNote,
  StatusBadge,
  Vazio,
  type Column,
} from "@/components/common";
import { cidadeNome, num, tituloNome } from "@/lib/format";
import {
  descreverDias,
  destinoDaPartida,
  horaCurta,
  nomeEmpresa,
  operaEm,
  useHorarios,
  type Horario,
  type Linha,
} from "@/services/dados-publicos";

/** Empresa da linha em caixa mista; sem empresa publicada mostra o traço com a explicação. */
function EmpresaLinha({ linha }: { linha: Linha }) {
  if (linha.empresa?.razao_social) return <>{tituloNome(linha.empresa.razao_social)}</>;
  return <Vazio title={linha.fonte === "DER-MG" ? "Não informada pelo DER-MG" : "Não informada"} />;
}

const colunas: Column<Horario>[] = [
  {
    key: "hora",
    header: "Horário",
    nowrap: true,
    mobile: "meta",
    render: (h) => <span className="tabular font-semibold">{horaCurta(h.hora)}</span>,
  },
  {
    key: "destino",
    header: "Destino",
    mobile: "title",
    cellClassName: "min-w-[9rem]",
    render: (h) => (
      <span className="font-medium">
        {cidadeNome(destinoDaPartida(h))}
        {h.tipo_servico && (
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {tituloNome(h.tipo_servico)}
          </span>
        )}
      </span>
    ),
  },
  {
    key: "empresa",
    header: "Empresa",
    mobile: "subtitle",
    cellClassName: "min-w-[9rem] text-muted-foreground",
    render: (h) => <EmpresaLinha linha={h.linha} />,
  },
  {
    key: "dias",
    header: "Dias",
    mobile: "meta",
    cellClassName: "min-w-[7rem]",
    render: (h) => descreverDias(h.dias_semana),
  },
  {
    key: "linha",
    header: "Linha",
    nowrap: true,
    mobile: "badge",
    render: (h) => (
      <StatusBadge size="sm" tone={h.linha.fonte === "ANTT" ? "info" : "primary"} dot={false}>
        {h.linha.fonte} · {h.linha.codigo}
      </StatusBadge>
    ),
  },
];

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

      <FilterBar search={search} onSearch={setSearch} placeholder="Buscar destino ou empresa">
        <FilterSelect
          value={dia}
          onValueChange={setDia}
          aria-label="Dias de operação"
          options={[
            { value: "todos", label: "Todos os dias" },
            { value: "hoje", label: "Só hoje" },
          ]}
        />
      </FilterBar>

      <SectionCard
        bodyClassName="p-0"
        title="Grade de partidas"
        description={horarios.data ? `${num(rows.length)} horários` : undefined}
      >
        <QueryState isLoading={horarios.isLoading} error={horarios.error} />
        {horarios.data && (
          <DataTable
            minWidth="40rem"
            columns={colunas}
            rows={rows}
            empty={<EmptyState message="Nenhuma partida encontrada com esses filtros." />}
          />
        )}
      </SectionCard>
      <SourceNote>
        Fontes: ANTT (SIGMA) e DER-MG. Linhas que só passam por Manhuaçu não aparecem: os órgãos
        publicam apenas a hora de saída no início da linha.
      </SourceNote>
    </>
  );
}
