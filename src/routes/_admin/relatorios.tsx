import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Bus,
  Download,
  Printer,
  Search,
  Ticket,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  DataTable,
  DateRangeFilter,
  EmptyState,
  FilterBar,
  PageHeader,
  QueryState,
  SectionCard,
  type Column,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { MarcaSisRodovPrefeitura } from "@/components/brand/Logos";
import { cn } from "@/lib/utils";
import { brl, dataHora, hojeISO, num, tituloNome } from "@/lib/format";
import { mesAno, useEmpresas, usePassagensMensais } from "@/services/dados-publicos";
import {
  baixarCsv,
  competenciaLegivel,
  dataISO,
  inicioDoMes,
  mapaEmpresas,
  useConciliacao,
  useConfigFinanceiro,
  usePagamentos,
  useTaxas,
  useViagensPeriodo,
  type Periodo,
} from "@/services/financeiro";

export const Route = createFileRoute("/_admin/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — SisRodov Manhuaçu" },
      {
        name: "description",
        content:
          "Central de relatórios do Terminal Rodoviário de Manhuaçu: viagens, embarques, financeiro, conciliação e passagens.",
      },
      { property: "og:title", content: "Relatórios — SisRodov Manhuaçu" },
      { property: "og:description", content: "Relatórios gerenciais e operacionais do terminal." },
    ],
  }),
  component: ReportsPage,
});

type IdRelatorio = "movimento" | "embarques" | "financeiro" | "conciliacao" | "passagens";

const relatorios: {
  id: IdRelatorio;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    id: "movimento",
    title: "Movimento diário de viagens",
    description: "Viagens por dia e situação, com os embarques confirmados na catraca.",
    icon: Bus,
  },
  {
    id: "embarques",
    title: "Embarques por empresa",
    description: "Viagens partidas, acessos na catraca, bilhetes e relatos por empresa.",
    icon: Building2,
  },
  {
    id: "financeiro",
    title: "Financeiro por competência",
    description: "Taxas emitidas, pagas, pendentes e inadimplentes em cada competência.",
    icon: Wallet,
  },
  {
    id: "conciliacao",
    title: "Conciliação",
    description: "Viagens com bilhetes, catraca e relato da empresa e a diferença entre as fontes.",
    icon: Search,
  },
  {
    id: "passagens",
    title: "Passagens vendidas (ANTT)",
    description:
      "Passagens interestaduais por destino e mês de emissão, dos dados abertos da ANTT.",
    icon: Ticket,
  },
];

/** Conteúdo de um relatório: indicadores + tabela (a mesma usada no CSV). */
interface DadosRelatorio {
  metricas: { label: string; value: string }[];
  cabecalho: string[];
  /** Colunas alinhadas à direita (índices). */
  direita: number[];
  linhas: (string | number)[][];
  vazio: string;
  fonte: string;
}

function ReportsPage() {
  const [preview, setPreview] = useState<IdRelatorio | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>(() => ({ de: inicioDoMes(), ate: hojeISO() }));

  if (preview) {
    return (
      <ReportPreview
        id={preview}
        periodo={periodo}
        onPeriodo={setPeriodo}
        onBack={() => setPreview(null)}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle="Relatórios gerados a partir dos dados registrados no sistema. Escolha o período e abra o relatório para exportar ou imprimir."
      />
      <SeletorPeriodo periodo={periodo} onChange={setPeriodo} />
      {/* 5 relatórios sem buraco: 2 colunas (o último ocupa a linha) e, no desktop, 3 + 2. */}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {relatorios.map((r, i) => (
          <li
            key={r.id}
            className={cn(
              "flex",
              i < 3 ? "lg:col-span-2" : "lg:col-span-3",
              "sm:max-lg:last:odd:col-span-2",
            )}
          >
            <button
              type="button"
              onClick={() => setPreview(r.id)}
              className="surface-card card-hover group flex w-full items-start gap-4 p-4 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none sm:p-5"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <r.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-base leading-snug font-bold text-foreground">{r.title}</span>
                <span className="mt-1 text-sm text-pretty text-muted-foreground">
                  {r.description}
                </span>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  Abrir relatório
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function SeletorPeriodo({
  periodo,
  onChange,
  children,
}: {
  periodo: Periodo;
  onChange: (p: Periodo) => void;
  children?: ReactNode;
}) {
  return (
    <div className="no-print">
      <FilterBar>
        <DateRangeFilter
          label="Período"
          from={periodo.de}
          to={periodo.ate}
          onFromChange={(v) => v && onChange({ ...periodo, de: v })}
          onToChange={(v) => v && onChange({ ...periodo, ate: v })}
        />
        {children}
      </FilterBar>
    </div>
  );
}

function ReportPreview({
  id,
  periodo,
  onPeriodo,
  onBack,
}: {
  id: IdRelatorio;
  periodo: Periodo;
  onPeriodo: (p: Periodo) => void;
  onBack: () => void;
}) {
  const def = relatorios.find((r) => r.id === id)!;
  const config = useConfigFinanceiro();
  const Corpo = {
    movimento: RelMovimento,
    embarques: RelEmbarques,
    financeiro: RelFinanceiro,
    conciliacao: RelConciliacao,
    passagens: RelPassagens,
  }[id];

  return (
    <Corpo periodo={periodo}>
      {(dados, carregando, erro) => {
        const pronto = !carregando && !erro && dados;
        return (
          <>
            <div className="no-print mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 w-fit">
                <ArrowLeft className="h-4 w-4" /> Voltar para relatórios
              </Button>
              <div className="flex flex-wrap gap-2 max-sm:[&>*]:flex-1">
                <Button
                  variant="outline"
                  disabled={!pronto || dados.linhas.length === 0}
                  onClick={() =>
                    dados &&
                    baixarCsv(`${id}-${periodo.de}-a-${periodo.ate}`, dados.cabecalho, dados.linhas)
                  }
                >
                  <Download className="h-4 w-4" /> Exportar CSV
                </Button>
                <Button onClick={() => window.print()} disabled={!pronto}>
                  <Printer className="h-4 w-4" /> Imprimir relatório
                </Button>
              </div>
            </div>
            <SeletorPeriodo periodo={periodo} onChange={onPeriodo} />

            <div className="surface-card p-4 sm:p-8">
              <header className="flex flex-wrap items-center justify-center gap-4 border-b border-border pb-6 sm:justify-between sm:gap-6">
                <MarcaSisRodovPrefeitura size="md" />
                <div className="w-full text-center sm:w-auto sm:text-right">
                  <p className="text-sm font-bold tracking-[0.12em] uppercase">Relatório oficial</p>
                  <p className="text-xs tracking-wide text-muted-foreground uppercase">
                    {config.data?.nomeTerminal ?? "Terminal Rodoviário de Manhuaçu"}
                  </p>
                </div>
              </header>

              <div className="py-6 text-center">
                <h1 className="text-lg font-bold tracking-wide text-balance uppercase sm:text-xl">
                  {def.title}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Período: {dataISO(periodo.de)} a {dataISO(periodo.ate)}
                </p>
              </div>

              <QueryState isLoading={carregando} error={erro} />
              {pronto && (
                <>
                  {dados.metricas.length > 0 && (
                    <div
                      className={cn(
                        "grid grid-cols-2 gap-x-4 gap-y-5 border-y border-border py-6",
                        dados.metricas.length === 4
                          ? "sm:grid-cols-4"
                          : "sm:grid-cols-3 lg:grid-cols-5",
                        "max-sm:[&>*:last-child:nth-child(odd)]:col-span-2",
                      )}
                    >
                      {dados.metricas.map((m) => (
                        <Metric key={m.label} label={m.label} value={m.value} />
                      ))}
                    </div>
                  )}
                  <div className="mt-6">
                    {dados.linhas.length === 0 ? (
                      <EmptyState title="Nada para mostrar no período" message={dados.vazio} />
                    ) : (
                      <TabelaRelatorio dados={dados} />
                    )}
                  </div>
                </>
              )}

              <footer className="mt-8 border-t border-border pt-5 text-center text-xs text-muted-foreground">
                <p>Prefeitura Municipal de Manhuaçu · Nova Rodoviária de Manhuaçu · SisRodov</p>
                {dados && <p className="mt-1">{dados.fonte}</p>}
                <p className="mt-1 italic">Gerado em {dataHora(new Date().toISOString())}.</p>
              </footer>
            </div>
          </>
        );
      }}
    </Corpo>
  );
}

function TabelaRelatorio({ dados }: { dados: DadosRelatorio }) {
  type Row = { id: string; cells: (string | number)[] };
  const columns: Column<Row>[] = dados.cabecalho.map((h, i) => ({
    key: String(i),
    header: h,
    align: dados.direita.includes(i) ? "right" : "left",
    render: (r) => {
      const v = r.cells[i];
      return <span className="tabular">{typeof v === "number" ? num(v) : v}</span>;
    },
  }));
  const rows: Row[] = dados.linhas.map((cells, i) => ({ id: String(i), cells }));
  return <DataTable columns={columns} rows={rows} />;
}

type PropsRelatorio = {
  periodo: Periodo;
  children: (dados: DadosRelatorio | null, carregando: boolean, erro: unknown) => ReactNode;
};

/* ------------------------------ Relatórios ------------------------------ */

const STATUS_VIAGEM: Record<string, string> = {
  prevista: "Prevista",
  embarque: "Embarque",
  "ultima-chamada": "Última chamada",
  partiu: "Partiu",
  realizada: "Realizada",
  atrasada: "Atrasada",
  cancelada: "Cancelada",
};

function RelMovimento({ periodo, children }: PropsRelatorio) {
  const viagens = useViagensPeriodo(periodo);
  const conc = useConciliacao({ periodo });

  const dados = useMemo((): DadosRelatorio | null => {
    if (!viagens.data || !conc.data) return null;
    const acessos = new Map<string, number>();
    for (const c of conc.data) acessos.set(c.data, (acessos.get(c.data) ?? 0) + c.acessos);
    const dias = new Map<string, Record<string, number>>();
    for (const v of viagens.data) {
      const d = dias.get(v.data) ?? {};
      d.total = (d.total ?? 0) + 1;
      d[v.status] = (d[v.status] ?? 0) + 1;
      d[`tipo:${v.tipo}`] = (d[`tipo:${v.tipo}`] ?? 0) + 1;
      dias.set(v.data, d);
    }
    const linhas = [...dias.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, d]) => [
        dataISO(data),
        d.total ?? 0,
        d["tipo:partida"] ?? 0,
        (d["tipo:chegada"] ?? 0) + (d["tipo:passagem"] ?? 0),
        (d.partiu ?? 0) + (d.realizada ?? 0),
        d.atrasada ?? 0,
        d.cancelada ?? 0,
        acessos.get(data) ?? 0,
      ]);
    const soma = (i: number) => linhas.reduce((s, l) => s + Number(l[i]), 0);
    return {
      metricas: [
        { label: "Viagens", value: num(viagens.data.length) },
        { label: "Partidas/realizadas", value: num(soma(4)) },
        { label: "Atrasadas", value: num(soma(5)) },
        { label: "Canceladas", value: num(soma(6)) },
        { label: "Embarques (catraca)", value: num(soma(7)) },
      ],
      cabecalho: [
        "Data",
        "Viagens",
        "Partidas",
        "Chegadas/passagens",
        "Realizadas",
        "Atrasadas",
        "Canceladas",
        "Embarques",
      ],
      direita: [1, 2, 3, 4, 5, 6, 7],
      linhas,
      vazio:
        "Nenhuma viagem registrada no período. As viagens são geradas dos horários publicados, lançadas pela operação ou recebidas pela integração das empresas.",
      fonte: `Situações consideradas: ${Object.values(STATUS_VIAGEM).join(", ")}. Embarques = acessos confirmados na catraca.`,
    };
  }, [viagens.data, conc.data]);

  return <>{children(dados, viagens.isLoading || conc.isLoading, viagens.error ?? conc.error)}</>;
}

function RelEmbarques({ periodo, children }: PropsRelatorio) {
  const empresas = useEmpresas();
  const conc = useConciliacao({ periodo });
  const config = useConfigFinanceiro();

  const dados = useMemo((): DadosRelatorio | null => {
    if (!conc.data || !empresas.data) return null;
    const empresa = mapaEmpresas(empresas.data);
    const taxa = config.data?.taxaEmbarque ?? null;
    const porEmpresa = new Map<
      string,
      { viagens: number; acessos: number; bilhetes: number; relato: number }
    >();
    for (const c of conc.data) {
      const k = c.empresa_id ?? "";
      const r = porEmpresa.get(k) ?? { viagens: 0, acessos: 0, bilhetes: 0, relato: 0 };
      r.viagens += 1;
      r.acessos += c.acessos;
      r.bilhetes += c.bilhetes;
      r.relato += c.relato ?? 0;
      porEmpresa.set(k, r);
    }
    const linhas = [...porEmpresa.entries()]
      .sort(([, a], [, b]) => b.acessos - a.acessos)
      .map(([id, r]) => [
        id ? tituloNome(empresa(id)) : "Empresa não identificada",
        r.viagens,
        r.acessos,
        r.bilhetes,
        r.relato,
        taxa === null ? "—" : brl(r.acessos * taxa),
      ]);
    const total = conc.data.reduce((s, c) => s + c.acessos, 0);
    return {
      metricas: [
        { label: "Empresas", value: num(porEmpresa.size) },
        { label: "Viagens partidas", value: num(conc.data.length) },
        { label: "Embarques (catraca)", value: num(total) },
        {
          label: "Taxa estimada",
          value: taxa === null ? "Não configurada" : brl(total * taxa),
        },
      ],
      cabecalho: [
        "Empresa",
        "Viagens",
        "Embarques (catraca)",
        "Bilhetes válidos",
        "Relato da empresa",
        "Taxa estimada",
      ],
      direita: [1, 2, 3, 4, 5],
      linhas,
      vazio:
        "Nenhuma viagem partida no período. Os embarques chegam das catracas e das empresas pela integração.",
      fonte:
        "Taxa estimada = embarques × taxa por embarque atual; o valor oficial é o da taxa gerada no fechamento da competência.",
    };
  }, [conc.data, empresas.data, config.data]);

  return <>{children(dados, conc.isLoading || empresas.isLoading, conc.error ?? empresas.error)}</>;
}

function RelFinanceiro({ periodo, children }: PropsRelatorio) {
  const taxas = useTaxas();
  const pagamentos = usePagamentos({ periodo });

  const dados = useMemo((): DadosRelatorio | null => {
    if (!taxas.data || !pagamentos.data) return null;
    const de = periodo.de.slice(0, 7);
    const ate = periodo.ate.slice(0, 7);
    const comps = new Map<
      string,
      {
        qtd: number;
        embarques: number;
        emitido: number;
        pago: number;
        pendente: number;
        inad: number;
        canc: number;
      }
    >();
    for (const t of taxas.data) {
      if (t.competencia < de || t.competencia > ate) continue;
      const r = comps.get(t.competencia) ?? {
        qtd: 0,
        embarques: 0,
        emitido: 0,
        pago: 0,
        pendente: 0,
        inad: 0,
        canc: 0,
      };
      if (t.status === "cancelada") {
        r.canc += t.valor;
      } else {
        r.qtd += 1;
        r.embarques += t.embarques;
        r.emitido += t.valor;
        r.pago += Math.min(t.pago, t.valor);
        if (t.status === "pendente") r.pendente += t.saldo;
        if (t.status === "inadimplente") r.inad += t.saldo;
      }
      comps.set(t.competencia, r);
    }
    const linhas = [...comps.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([c, r]) => [
        competenciaLegivel(c),
        r.qtd,
        r.embarques,
        brl(r.emitido),
        brl(r.pago),
        brl(r.pendente),
        brl(r.inad),
        brl(r.canc),
      ]);
    const tot = [...comps.values()].reduce(
      (s, r) => ({
        emitido: s.emitido + r.emitido,
        pago: s.pago + r.pago,
        pendente: s.pendente + r.pendente,
        inad: s.inad + r.inad,
      }),
      { emitido: 0, pago: 0, pendente: 0, inad: 0 },
    );
    const recebido = pagamentos.data
      .filter((p) => p.status === "confirmado")
      .reduce((s, p) => s + p.valor, 0);
    return {
      metricas: [
        { label: "Taxas emitidas", value: brl(tot.emitido) },
        { label: "Pagas", value: brl(tot.pago) },
        { label: "Pendentes", value: brl(tot.pendente) },
        { label: "Inadimplência", value: brl(tot.inad) },
        { label: "Recebido no período", value: brl(recebido) },
      ],
      cabecalho: [
        "Competência",
        "Taxas",
        "Embarques",
        "Emitido",
        "Pago",
        "Pendente",
        "Inadimplente",
        "Cancelado",
      ],
      direita: [1, 2, 3, 4, 5, 6, 7],
      linhas,
      vazio:
        "Nenhuma taxa nas competências do período. As taxas são geradas no fechamento de cada competência a partir dos embarques confirmados na catraca.",
      fonte: `Competências de ${competenciaLegivel(de)} a ${competenciaLegivel(ate)}. "Recebido no período" soma pagamentos confirmados com data dentro do período.`,
    };
  }, [taxas.data, pagamentos.data, periodo]);

  return (
    <>{children(dados, taxas.isLoading || pagamentos.isLoading, taxas.error ?? pagamentos.error)}</>
  );
}

const RESULTADO: Record<string, string> = {
  conciliado: "Conciliado",
  analise: "Em análise",
  divergencia: "Divergência",
};
const CONFERENCIA: Record<string, string> = {
  "em-analise": "Em análise",
  conferido: "Conferido",
  "necessita-conferencia": "Necessita conferência",
};

function RelConciliacao({ periodo, children }: PropsRelatorio) {
  const empresas = useEmpresas();
  const conc = useConciliacao({ periodo });

  const dados = useMemo((): DadosRelatorio | null => {
    if (!conc.data || !empresas.data) return null;
    const empresa = mapaEmpresas(empresas.data);
    const contar = (s: string) => conc.data.filter((c) => c.status === s).length;
    return {
      metricas: [
        { label: "Viagens", value: num(conc.data.length) },
        { label: "Conciliadas", value: num(contar("conciliado")) },
        { label: "Em análise", value: num(contar("analise")) },
        { label: "Divergências", value: num(contar("divergencia")) },
        {
          label: "Conferidas",
          value: num(conc.data.filter((c) => c.situacao_conferencia === "conferido").length),
        },
      ],
      cabecalho: [
        "Data",
        "Viagem",
        "Empresa",
        "Trecho",
        "Bilhetes",
        "Catraca",
        "Relato",
        "Diferença",
        "Resultado",
        "Conferência",
        "Observação",
      ],
      direita: [4, 5, 6, 7],
      linhas: conc.data.map((c) => [
        dataISO(c.data),
        c.numero || "—",
        tituloNome(empresa(c.empresa_id)),
        `${c.origem} → ${c.destino}`,
        c.bilhetes,
        c.acessos,
        c.relato ?? "—",
        c.diferenca,
        RESULTADO[c.status],
        CONFERENCIA[c.situacao_conferencia],
        c.observacao ?? "",
      ]),
      vazio:
        "Nenhuma viagem partida no período. A conciliação cruza bilhetes e relatos das empresas com os acessos das catracas, recebidos pela integração.",
      fonte: "O relatório apenas apresenta as diferenças entre as fontes, sem qualquer julgamento.",
    };
  }, [conc.data, empresas.data]);

  return <>{children(dados, conc.isLoading || empresas.isLoading, conc.error ?? empresas.error)}</>;
}

const MANHUACU = "Manhuaçu";

function RelPassagens({ periodo, children }: PropsRelatorio) {
  const passagens = usePassagensMensais();

  const dados = useMemo((): DadosRelatorio | null => {
    if (!passagens.data) return null;
    const de = `${periodo.de.slice(0, 7)}-01`;
    const ate = `${periodo.ate.slice(0, 7)}-01`;
    const mapa = new Map<
      string,
      { mes: string; cidade: string; saida: number; chegada: number; valor: number }
    >();
    for (const p of passagens.data) {
      if (p.mes_emissao < de || p.mes_emissao > ate) continue;
      const saindo = p.origem === MANHUACU;
      const cidade = saindo ? `${p.destino}/${p.uf_destino}` : `${p.origem}/${p.uf_origem}`;
      const k = `${p.mes_emissao}|${cidade}`;
      const r = mapa.get(k) ?? { mes: p.mes_emissao, cidade, saida: 0, chegada: 0, valor: 0 };
      if (saindo) r.saida += p.quantidade;
      else r.chegada += p.quantidade;
      r.valor += Number(p.valor_medio) * p.quantidade;
      mapa.set(k, r);
    }
    const lista = [...mapa.values()].sort(
      (a, b) => a.mes.localeCompare(b.mes) || b.saida + b.chegada - (a.saida + a.chegada),
    );
    const total = lista.reduce((s, r) => s + r.saida + r.chegada, 0);
    const saida = lista.reduce((s, r) => s + r.saida, 0);
    return {
      metricas: [
        { label: "Passagens", value: num(total) },
        { label: "Saindo de Manhuaçu", value: num(saida) },
        { label: "Chegando a Manhuaçu", value: num(total - saida) },
        { label: "Cidades", value: num(new Set(lista.map((r) => r.cidade)).size) },
      ],
      cabecalho: ["Mês de emissão", "Cidade", "Saindo", "Chegando", "Total", "Valor médio"],
      direita: [2, 3, 4, 5],
      linhas: lista.map((r) => {
        const qtd = r.saida + r.chegada;
        return [mesAno(r.mes), r.cidade, r.saida, r.chegada, qtd, brl(qtd ? r.valor / qtd : 0)];
      }),
      vazio:
        "Sem passagens da ANTT para os meses do período. Os dados abertos são publicados com alguns meses de atraso; escolha um período mais antigo.",
      fonte:
        "Fonte: ANTT, MONITRIIP (Dados Abertos), importado automaticamente todo dia. Não inclui linhas dentro de MG.",
    };
  }, [passagens.data, periodo]);

  return <>{children(dados, passagens.isLoading, passagens.error)}</>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground">
        {label}
      </p>
      <p className="tabular mt-0.5 text-lg font-bold">{value}</p>
    </div>
  );
}
