import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  DataTable,
  FilterBar,
  FilterSelect,
  PageHeader,
  QueryState,
  SectionCard,
  SourceNote,
  StatusBadge,
  Vazio,
  type Column,
  type Tone,
} from "@/components/common";
import { tituloNome } from "@/lib/format";
import { nomeEmpresa, useLinhas, type Linha } from "@/services/dados-publicos";

export const Route = createFileRoute("/_admin/operacao/linhas")({
  head: () => ({
    meta: [
      { title: "Linhas — SisRodov Manhuaçu" },
      {
        name: "description",
        content: "Linhas interestaduais (ANTT) e intermunicipais (DER-MG) que atendem Manhuaçu.",
      },
      { property: "og:title", content: "Linhas — SisRodov Manhuaçu" },
      { property: "og:description", content: "Linhas, prefixos, empresas e cidades atendidas." },
    ],
  }),
  component: LinesPage,
});

/** Relação da linha com Manhuaçu: badge curto + explicação completa na dica. */
const relacao: Record<Linha["relacao_manhuacu"], { label: string; title: string; tone: Tone }> = {
  origem: { label: "Origem", title: "Parte de Manhuaçu", tone: "success" },
  destino: { label: "Destino", title: "Termina em Manhuaçu", tone: "info" },
  passagem: { label: "Passagem", title: "Passa por Manhuaçu", tone: "neutral" },
};

function LinesPage() {
  const [search, setSearch] = useState("");
  const [fonte, setFonte] = useState("todas");
  const linhas = useLinhas();

  const rows = useMemo(
    () =>
      (linhas.data ?? []).filter((l) => {
        const q = search.trim().toLowerCase();
        return (
          (fonte === "todas" || l.fonte === fonte) &&
          (!q ||
            `${l.codigo} ${l.descricao} ${nomeEmpresa(l)} ${l.cidades_atendidas.join(" ")}`
              .toLowerCase()
              .includes(q))
        );
      }),
    [linhas.data, search, fonte],
  );

  const columns: Column<Linha>[] = [
    {
      key: "code",
      header: "Código",
      nowrap: true,
      mobile: "meta",
      render: (l) => <span className="tabular font-semibold">{l.codigo}</span>,
    },
    {
      key: "desc",
      header: "Linha",
      mobile: "title",
      cellClassName: "min-w-[10rem] font-medium",
      render: (l) => tituloNome(l.descricao),
    },
    {
      key: "company",
      header: "Empresa",
      mobile: "subtitle",
      cellClassName: "min-w-[9rem] text-muted-foreground",
      render: (l) =>
        l.empresa?.razao_social ? (
          tituloNome(l.empresa.razao_social)
        ) : (
          <Vazio title={l.fonte === "DER-MG" ? "Não informada pelo DER-MG" : "Não informada"} />
        ),
    },
    {
      key: "rel",
      header: "Em Manhuaçu",
      nowrap: true,
      mobile: "meta",
      render: (l) => {
        const r = relacao[l.relacao_manhuacu];
        return (
          <span title={r.title}>
            <StatusBadge size="sm" tone={r.tone} dot={false}>
              {r.label}
            </StatusBadge>
          </span>
        );
      },
    },
    {
      key: "ambito",
      header: "Âmbito",
      nowrap: true,
      mobile: "badge",
      render: (l) => (
        <span title={l.fonte === "ANTT" ? "Interestadual · ANTT" : "Intermunicipal · DER-MG"}>
          <StatusBadge
            size="sm"
            tone={l.ambito === "interestadual" ? "info" : "primary"}
            dot={false}
          >
            {l.fonte === "ANTT" ? "ANTT" : "DER-MG"}
          </StatusBadge>
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Linhas"
        subtitle="Linhas autorizadas que atendem o Terminal Rodoviário de Manhuaçu"
      />
      <FilterBar search={search} onSearch={setSearch} placeholder="Buscar linha ou cidade">
        <FilterSelect
          value={fonte}
          onValueChange={setFonte}
          aria-label="Tipo de linha"
          allLabel="Todas as linhas"
          allValue="todas"
          options={[
            { value: "ANTT", label: "Interestaduais (ANTT)" },
            { value: "DER-MG", label: "Intermunicipais (DER-MG)" },
          ]}
        />
      </FilterBar>
      <SectionCard bodyClassName="p-0">
        <QueryState isLoading={linhas.isLoading} error={linhas.error} />
        {linhas.data && <DataTable minWidth="40rem" columns={columns} rows={rows} />}
      </SectionCard>
      <SourceNote>
        Fontes: ANTT (SIGMA, Dados Abertos) e DER-MG (quadro de itinerários intermunicipais).
      </SourceNote>
    </>
  );
}
