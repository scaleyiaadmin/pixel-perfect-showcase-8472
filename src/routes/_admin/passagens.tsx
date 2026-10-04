import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Ticket, TicketX, TicketCheck, TicketSlash } from "lucide-react";
import {
  DataTable,
  DateRangeFilter,
  EmptyState,
  FilterBar,
  FilterSelect,
  PageHeader,
  QueryState,
  SectionCard,
  SourceNote,
  StatCard,
  StatGrid,
  StatusBadge,
  Vazio,
  type Column,
  type Tone,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { brl, dataHora, hojeISO, num, tituloNome } from "@/lib/format";
import { mesAno, useEmpresas, usePassagensMensais } from "@/services/dados-publicos";
import { mapaEmpresas, useBilhetes, type BilheteComViagem } from "@/services/financeiro";

export const Route = createFileRoute("/_admin/passagens")({
  head: () => ({
    meta: [
      { title: "Passagens — SisRodov Manhuaçu" },
      {
        name: "description",
        content:
          "Passagens emitidas, utilizadas e canceladas nas viagens do Terminal Rodoviário de Manhuaçu.",
      },
      { property: "og:title", content: "Passagens — SisRodov Manhuaçu" },
      {
        property: "og:description",
        content: "Controle de passagens emitidas, utilizadas e canceladas.",
      },
    ],
  }),
  component: TicketsPage,
});

const statusMap: Record<BilheteComViagem["status"], { tone: Tone; label: string }> = {
  emitida: { tone: "info", label: "Emitida" },
  utilizada: { tone: "success", label: "Utilizada" },
  cancelada: { tone: "danger", label: "Cancelada" },
  "nao-utilizada": { tone: "warning", label: "Não utilizada" },
};

function TicketsPage() {
  return (
    <>
      <PageHeader
        title="Passagens"
        subtitle="Bilhetes informados pelas empresas e resumo público da ANTT."
      />
      <Tabs defaultValue="bilhetes">
        <TabsList className="mb-5 w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="bilhetes" className="shrink-0">
            Bilhetes das empresas
          </TabsTrigger>
          <TabsTrigger value="antt" className="shrink-0">
            Resumo ANTT
          </TabsTrigger>
        </TabsList>
        <TabsContent value="bilhetes">
          <BilhetesTab />
        </TabsContent>
        <TabsContent value="antt">
          <ResumoAnttTab />
        </TabsContent>
      </Tabs>
    </>
  );
}

/* ------------------------------- Bilhetes ------------------------------- */

/** Cidade em title-case mantendo a UF em maiúsculas ("CARATINGA/MG" → "Caratinga/MG"). */
function cidadeNome(c: string) {
  const m = c.match(/^(.*?)(\s*[/-]\s*)([A-Za-z]{2})$/);
  return m ? `${tituloNome(m[1])}${m[2]}${m[3].toUpperCase()}` : tituloNome(c);
}

/** Nome de cidade em title-case ou traço cinza quando ausente. */
const ouVazioNome = (v: string | null | undefined) => (v ? cidadeNome(v) : <Vazio />);

function BilhetesTab() {
  const [de, setDe] = useState(() => hojeISO());
  const [ate, setAte] = useState(() => hojeISO());
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");

  const empresas = useEmpresas();
  const nomeEmpresa = mapaEmpresas(empresas.data);
  const empresa = (id: string | null | undefined) => tituloNome(nomeEmpresa(id));
  const bilhetes = useBilhetes({ periodo: { de, ate } });

  const todos = bilhetes.data ?? [];
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return todos.filter(
      (t) =>
        (!q ||
          `${t.codigo} ${t.origem} ${t.destino} ${empresa(t.empresa_id)} ${t.viagem?.numero ?? ""}`
            .toLowerCase()
            .includes(q)) &&
        (status === "todos" || t.status === status),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todos, search, status, empresas.data]);

  const contar = (s: BilheteComViagem["status"]) => todos.filter((t) => t.status === s).length;
  const hoje = de === hojeISO() && ate === hojeISO();

  const columns: Column<BilheteComViagem>[] = [
    {
      key: "code",
      header: "Passagem",
      nowrap: true,
      mobile: "meta",
      render: (t) => <span className="tabular font-semibold">{t.codigo}</span>,
    },
    {
      key: "trip",
      header: "Viagem",
      nowrap: true,
      hideOnMobile: true,
      render: (t) =>
        t.viagem?.numero ? (
          <span className="tabular text-muted-foreground">{t.viagem.numero}</span>
        ) : (
          <Vazio />
        ),
    },
    {
      key: "company",
      header: "Empresa",
      mobile: "subtitle",
      cellClassName: "min-w-[10rem]",
      render: (t) => (
        <>
          {empresa(t.empresa_id)}
          {t.viagem?.numero && (
            <span className="tabular md:hidden"> · Viagem {t.viagem.numero}</span>
          )}
        </>
      ),
    },
    {
      key: "origin",
      header: "Origem",
      hideOnMobile: true,
      cellClassName: "min-w-[8rem]",
      render: (t) => ouVazioNome(t.origem),
    },
    {
      key: "dest",
      header: "Destino",
      mobile: "title",
      cellClassName: "min-w-[8rem]",
      render: (t) => (
        <>
          <span className="md:hidden">{ouVazioNome(t.origem)} → </span>
          {ouVazioNome(t.destino)}
        </>
      ),
    },
    {
      key: "value",
      header: "Valor",
      align: "right",
      nowrap: true,
      mobile: "meta",
      render: (t) =>
        t.gratuidade ? (
          <span className="text-muted-foreground">{t.gratuidade}</span>
        ) : t.valor === null ? (
          <Vazio />
        ) : (
          <span className="tabular">{brl(t.valor)}</span>
        ),
    },
    {
      key: "issued",
      header: "Emissão",
      nowrap: true,
      mobile: "meta",
      render: (t) => (
        <span className="tabular text-muted-foreground">{dataHora(t.emitido_em)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      mobile: "badge",
      render: (t) => (
        <StatusBadge tone={statusMap[t.status].tone}>{statusMap[t.status].label}</StatusBadge>
      ),
    },
  ];

  return (
    <>
      <StatGrid>
        <StatCard
          label={hoje ? "Emitidas hoje" : "Emitidas no período"}
          value={num(todos.length)}
          icon={Ticket}
          tone="primary"
        />
        <StatCard
          label="Canceladas"
          value={num(contar("cancelada"))}
          icon={TicketX}
          tone="danger"
        />
        <StatCard
          label="Utilizadas"
          value={num(contar("utilizada"))}
          icon={TicketCheck}
          tone="success"
        />
        <StatCard
          label="Não utilizadas"
          value={num(contar("nao-utilizada"))}
          icon={TicketSlash}
          tone="warning"
        />
      </StatGrid>

      <div className="mt-6">
        <FilterBar search={search} onSearch={setSearch} placeholder="Buscar passagem ou destino">
          <DateRangeFilter
            label="Emissão"
            from={de}
            to={ate}
            onFromChange={(v) => v && setDe(v)}
            onToChange={(v) => v && setAte(v)}
          />
          <FilterSelect
            value={status}
            onValueChange={setStatus}
            placeholder="Status"
            allLabel="Todos os status"
            options={Object.entries(statusMap).map(([k, v]) => ({ value: k, label: v.label }))}
          />
        </FilterBar>

        <SectionCard title="Bilhetes" bodyClassName="p-0">
          <QueryState isLoading={bilhetes.isLoading} error={bilhetes.error} />
          {bilhetes.data && (
            <DataTable
              columns={columns}
              rows={rows}
              empty={
                todos.length === 0 ? (
                  <EmptyState
                    icon={Ticket}
                    title="Nenhum bilhete no período"
                    message="Os bilhetes chegam pela integração das empresas de ônibus (os mesmos registros de venda e cancelamento enviados à ANTT/MONITRIIP)."
                  />
                ) : (
                  <EmptyState
                    message="Nenhum bilhete com esses filtros."
                    action={
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearch("");
                          setStatus("todos");
                        }}
                      >
                        Limpar filtros
                      </Button>
                    }
                  />
                )
              }
            />
          )}
        </SectionCard>
        <SourceNote>
          Fonte: sistemas de venda das empresas, via integração. Nenhum dado pessoal de passageiro é
          armazenado.
        </SourceNote>
      </div>
    </>
  );
}

/* ----------------------------- Resumo ANTT ------------------------------ */

const MANHUACU = "Manhuaçu";

interface LinhaResumo {
  id: string;
  origem: string;
  destino: string;
  sentido: "saida" | "chegada";
  quantidade: number;
  normal: number;
  descontos: number;
  valorMedio: number;
}

function ResumoAnttTab() {
  const passagens = usePassagensMensais();
  const meses = useMemo(
    () => [...new Set((passagens.data ?? []).map((p) => p.mes_emissao))].sort().reverse(),
    [passagens.data],
  );
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const mes = escolhido ?? meses[0] ?? "";

  const rows: LinhaResumo[] = useMemo(() => {
    const mapa = new Map<string, LinhaResumo & { somaValor: number }>();
    for (const p of passagens.data ?? []) {
      if (p.mes_emissao !== mes) continue;
      const origem = `${p.origem}/${p.uf_origem}`;
      const destino = `${p.destino}/${p.uf_destino}`;
      const id = `${origem}>${destino}`;
      const r = mapa.get(id) ?? {
        id,
        origem,
        destino,
        sentido: p.origem === MANHUACU ? "saida" : "chegada",
        quantidade: 0,
        normal: 0,
        descontos: 0,
        valorMedio: 0,
        somaValor: 0,
      };
      r.quantidade += p.quantidade;
      if (p.tipo_gratuidade.startsWith("Tarifa Normal")) r.normal += p.quantidade;
      else r.descontos += p.quantidade;
      r.somaValor += Number(p.valor_medio) * p.quantidade;
      mapa.set(id, r);
    }
    return [...mapa.values()]
      .map(({ somaValor, ...r }) => ({
        ...r,
        valorMedio: r.quantidade ? somaValor / r.quantidade : 0,
      }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [passagens.data, mes]);

  const saindo = rows.filter((r) => r.sentido === "saida").reduce((s, r) => s + r.quantidade, 0);
  const chegando = rows
    .filter((r) => r.sentido === "chegada")
    .reduce((s, r) => s + r.quantidade, 0);
  const descontos = rows.reduce((s, r) => s + r.descontos, 0);

  const columns: Column<LinhaResumo>[] = [
    {
      key: "origin",
      header: "Origem",
      hideOnMobile: true,
      cellClassName: "min-w-[9rem]",
      render: (r) => r.origem,
    },
    {
      key: "dest",
      header: "Destino",
      mobile: "title",
      cellClassName: "min-w-[9rem]",
      render: (r) => (
        <>
          <span className="md:hidden">{r.origem} → </span>
          {r.destino}
        </>
      ),
    },
    {
      key: "dir",
      header: "Sentido",
      mobile: "badge",
      render: (r) =>
        r.sentido === "saida" ? (
          <StatusBadge tone="primary">Saindo</StatusBadge>
        ) : (
          <StatusBadge tone="info">Chegando</StatusBadge>
        ),
    },
    {
      key: "qty",
      header: "Passagens",
      align: "right",
      mobile: "meta",
      render: (r) => <span className="tabular font-semibold">{num(r.quantidade)}</span>,
    },
    {
      key: "normal",
      header: "Tarifa normal",
      align: "right",
      mobile: "meta",
      render: (r) => <span className="tabular">{num(r.normal)}</span>,
    },
    {
      key: "disc",
      header: "Gratuidade/desconto",
      mobileLabel: "Gratuidade",
      align: "right",
      mobile: "meta",
      render: (r) => <span className="tabular">{num(r.descontos)}</span>,
    },
    {
      key: "avg",
      header: "Valor médio",
      align: "right",
      nowrap: true,
      mobile: "meta",
      render: (r) => <span className="tabular">{brl(r.valorMedio)}</span>,
    },
  ];

  return (
    <>
      <StatGrid cols={3}>
        <StatCard label="Saindo de Manhuaçu" value={num(saindo)} icon={Ticket} tone="primary" />
        <StatCard
          label="Chegando a Manhuaçu"
          value={num(chegando)}
          icon={TicketCheck}
          tone="info"
        />
        <StatCard
          label="Com gratuidade ou desconto"
          value={num(descontos)}
          icon={TicketSlash}
          tone="neutral"
        />
      </StatGrid>
      <div className="mt-6">
        <FilterBar>
          <FilterSelect
            value={mes}
            onValueChange={setEscolhido}
            disabled={meses.length === 0}
            placeholder="Mês de emissão"
            aria-label="Mês de emissão"
            options={meses.map((m) => ({ value: m, label: `Emitidas em ${mesAno(m)}` }))}
          />
        </FilterBar>
        <SectionCard
          title="Passagens interestaduais por trecho"
          description={mes ? `Bilhetes emitidos em ${mesAno(mes)}` : undefined}
          bodyClassName="p-0"
        >
          <QueryState isLoading={passagens.isLoading} error={passagens.error} />
          {passagens.data &&
            (rows.length === 0 ? (
              <EmptyState
                icon={Ticket}
                title="Sem dados públicos importados"
                message="O resumo vem da ANTT (MONITRIIP, dados abertos) e é atualizado automaticamente todo dia."
              />
            ) : (
              <DataTable columns={columns} rows={rows} />
            ))}
        </SectionCard>
        <SourceNote>
          Fonte: ANTT, MONITRIIP (Dados Abertos), publicado com alguns meses de atraso. Não inclui
          linhas dentro de MG.
        </SourceNote>
      </div>
    </>
  );
}
