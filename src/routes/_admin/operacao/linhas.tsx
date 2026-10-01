import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  DataTable,
  FilterBar,
  PageHeader,
  QueryState,
  SectionCard,
  SourceNote,
  StatusBadge,
  type Column,
} from "@/components/common";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const relacaoLabel = {
  origem: "Parte de Manhuaçu",
  destino: "Termina em Manhuaçu",
  passagem: "Passa por Manhuaçu",
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
      render: (l) => <span className="tabular font-semibold">{l.codigo}</span>,
    },
    { key: "desc", header: "Linha", render: (l) => l.descricao },
    {
      key: "company",
      header: "Empresa",
      render: (l) => <span className="text-muted-foreground">{nomeEmpresa(l)}</span>,
    },
    { key: "rel", header: "Em Manhuaçu", render: (l) => relacaoLabel[l.relacao_manhuacu] },
    {
      key: "ambito",
      header: "Âmbito",
      render: (l) => (
        <StatusBadge tone={l.ambito === "interestadual" ? "info" : "primary"} dot={false}>
          {l.fonte === "ANTT" ? "Interestadual · ANTT" : "Intermunicipal · DER-MG"}
        </StatusBadge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Linhas"
        subtitle="Linhas autorizadas que atendem o Terminal Rodoviário de Manhuaçu"
      />
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Pesquisar linha, cidade ou empresa..."
      >
        <Select value={fonte} onValueChange={setFonte}>
          <SelectTrigger className="h-9 w-[14rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as linhas</SelectItem>
            <SelectItem value="ANTT">Interestaduais (ANTT)</SelectItem>
            <SelectItem value="DER-MG">Intermunicipais (DER-MG)</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>
      <SectionCard bodyClassName="p-0">
        <QueryState isLoading={linhas.isLoading} error={linhas.error} />
        {linhas.data && <DataTable columns={columns} rows={rows} />}
      </SectionCard>
      <SourceNote>
        Fontes: ANTT (SIGMA, Dados Abertos) e DER-MG (quadro de itinerários intermunicipais).
      </SourceNote>
    </>
  );
}
