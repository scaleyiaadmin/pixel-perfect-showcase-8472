import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Ticket, TicketX, TicketCheck, TicketSlash } from "lucide-react";
import {
  DataTable,
  EmptyState,
  FilterBar,
  PageHeader,
  QueryState,
  SectionCard,
  SourceNote,
  StatCard,
  StatusBadge,
  type Column,
  type Tone,
} from "@/components/common";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { brl, dataHora, hojeISO, num } from "@/lib/format";
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
        subtitle="Bilhetes informados pelas empresas e resumo público da ANTT"
      />
      <Tabs defaultValue="bilhetes">
        <TabsList className="mb-5">
          <TabsTrigger value="bilhetes">Bilhetes das empresas</TabsTrigger>
          <TabsTrigger value="antt">Resumo mensal ANTT</TabsTrigger>
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

function BilhetesTab() {
  const [de, setDe] = useState(() => hojeISO());
  const [ate, setAte] = useState(() => hojeISO());
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");

  const empresas = useEmpresas();
  const empresa = mapaEmpresas(empresas.data);
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
      render: (t) => <span className="tabular font-semibold">{t.codigo}</span>,
    },
    {
      key: "trip",
      header: "Viagem",
      render: (t) => (
        <span className="tabular text-muted-foreground">{t.viagem?.numero || "—"}</span>
      ),
    },
    { key: "company", header: "Empresa", render: (t) => empresa(t.empresa_id) },
    { key: "origin", header: "Origem", render: (t) => t.origem || "—" },
    { key: "dest", header: "Destino", render: (t) => t.destino || "—" },
    {
      key: "value",
      header: "Valor",
      align: "right",
      render: (t) => (
        <span className="tabular">
          {t.gratuidade ? (
            <span className="text-muted-foreground">{t.gratuidade}</span>
          ) : t.valor === null ? (
            "—"
          ) : (
            brl(t.valor)
          )}
        </span>
      ),
    },
    {
      key: "issued",
      header: "Emissão",
      render: (t) => (
        <span className="tabular text-muted-foreground">{dataHora(t.emitido_em)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (t) => (
        <StatusBadge tone={statusMap[t.status].tone}>{statusMap[t.status].label}</StatusBadge>
      ),
    },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={hoje ? "Emitidas hoje" : "Emitidas no período"}
          value={num(todos.length)}
          icon={Ticket}
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
      </div>

      <div className="mt-6">
        <FilterBar
          search={search}
          onSearch={setSearch}
          placeholder="Pesquisar passagem, viagem, empresa ou destino..."
        >
          <div className="flex items-center gap-2 text-sm">
            <Label htmlFor="bil-de" className="text-muted-foreground">
              Emissão de
            </Label>
            <Input
              id="bil-de"
              type="date"
              className="h-9 w-[10rem]"
              value={de}
              max={ate}
              onChange={(e) => e.target.value && setDe(e.target.value)}
            />
            <Label htmlFor="bil-ate" className="text-muted-foreground">
              até
            </Label>
            <Input
              id="bil-ate"
              type="date"
              className="h-9 w-[10rem]"
              value={ate}
              min={de}
              onChange={(e) => e.target.value && setAte(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[12rem]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {Object.entries(statusMap).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterBar>

        <SectionCard bodyClassName="p-0">
          <QueryState isLoading={bilhetes.isLoading} error={bilhetes.error} />
          {bilhetes.data && (
            <DataTable
              columns={columns}
              rows={rows}
              emptyMessage={
                todos.length === 0
                  ? "Nenhum bilhete no período. Os bilhetes chegam pela integração das empresas de ônibus (os mesmos registros de venda e cancelamento enviados à ANTT/MONITRIIP)."
                  : "Nenhum bilhete com esses filtros."
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
    { key: "origin", header: "Origem", render: (r) => r.origem },
    { key: "dest", header: "Destino", render: (r) => r.destino },
    {
      key: "dir",
      header: "Sentido",
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
      render: (r) => <span className="tabular font-semibold">{num(r.quantidade)}</span>,
    },
    {
      key: "normal",
      header: "Tarifa normal",
      align: "right",
      render: (r) => <span className="tabular">{num(r.normal)}</span>,
    },
    {
      key: "disc",
      header: "Gratuidade/desconto",
      align: "right",
      render: (r) => <span className="tabular">{num(r.descontos)}</span>,
    },
    {
      key: "avg",
      header: "Valor médio",
      align: "right",
      render: (r) => <span className="tabular">{brl(r.valorMedio)}</span>,
    },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Saindo de Manhuaçu" value={num(saindo)} icon={Ticket} />
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
      </div>
      <div className="mt-6">
        <FilterBar>
          <Select value={mes} onValueChange={setEscolhido} disabled={meses.length === 0}>
            <SelectTrigger className="h-9 w-[12rem]">
              <SelectValue placeholder="Mês de emissão" />
            </SelectTrigger>
            <SelectContent>
              {meses.map((m) => (
                <SelectItem key={m} value={m}>
                  Emitidas em {mesAno(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterBar>
        <SectionCard
          title="Passagens interestaduais por trecho"
          description={mes ? `Bilhetes emitidos em ${mesAno(mes)}` : undefined}
          bodyClassName="p-0"
        >
          <QueryState isLoading={passagens.isLoading} error={passagens.error} />
          {passagens.data &&
            (rows.length === 0 ? (
              <EmptyState message="Sem dados públicos importados. O resumo vem da ANTT (MONITRIIP, dados abertos) e é atualizado automaticamente todo dia." />
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
