import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Check,
  Copy,
  DatabaseZap,
  KeyRound,
  Plus,
  PlugZap,
  RadioTower,
} from "lucide-react";
import {
  DataTable,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dataHora, num, tituloNome } from "@/lib/format";
import { usePermissao } from "@/services/acesso";
import { formatCnpj, useEmpresas, useImportacoes } from "@/services/dados-publicos";
import type { EventoIntegracao } from "@/services/gestao-tipos";
import {
  EXEMPLOS,
  ROTULO_EVENTO,
  TIPOS_EVENTO,
  TIPOS_INTEGRACAO,
  URL_INGESTAO,
  exemploCurl,
  rotuloTipoIntegracao,
  useCriarIntegracao,
  useEventosIntegracao,
  useIntegracoes,
  useReativarIntegracao,
  useRevogarIntegracao,
  type FiltroEventos,
  type IntegracaoComEmpresa,
  type TipoIntegracao,
} from "@/services/integracoes";

export const Route = createFileRoute("/_admin/integracoes")({
  head: () => ({
    meta: [
      { title: "Integrações — SisRodov Manhuaçu" },
      {
        name: "description",
        content:
          "Chaves de integração, eventos recebidos das empresas, catracas e pagamento, e importação de dados públicos.",
      },
      { property: "og:title", content: "Integrações — SisRodov Manhuaçu" },
      {
        property: "og:description",
        content: "Recebimento automático de dados no terminal rodoviário.",
      },
    ],
  }),
  component: IntegrationsPage,
});

const statusEventoTone: Record<string, { tone: Tone; label: string }> = {
  processado: { tone: "success", label: "Processado" },
  ignorado: { tone: "neutral", label: "Ignorado" },
  erro: { tone: "danger", label: "Erro" },
};

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
// Abreviações em inglês também aparecem em alguns arquivos da ANTT.
const MESES_EN = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

/**
 * Competência legível e única ("out/2026") a partir dos formatos gravados pelas
 * importações: "2026-10" (DER-MG), "2026-08-01" e "Out2026"/"Set2026" (ANTT).
 */
function formatarCompetencia(valor: string | null | undefined): string | null {
  const v = (valor ?? "").trim();
  if (!v) return null;
  const iso = /^(\d{4})-(\d{2})(?:-\d{2})?/.exec(v);
  if (iso) {
    const m = Number(iso[2]);
    if (m >= 1 && m <= 12) return `${MESES[m - 1]}/${iso[1]}`;
  }
  const abrev = /^([a-zà-ú]{3})[a-zà-ú]*[\s/._-]*(\d{4})$/i.exec(v);
  if (abrev) {
    const nome = abrev[1].toLowerCase();
    const i = MESES.indexOf(nome) >= 0 ? MESES.indexOf(nome) : MESES_EN.indexOf(nome);
    if (i >= 0) return `${MESES[i]}/${abrev[2]}`;
  }
  return v;
}

const ROTULO_RECURSO: Record<string, string> = {
  horarios: "Horários",
  linhas: "Linhas",
  passagens: "Passagens",
  empresas: "Empresas",
  secoes: "Seções",
  itinerarios: "Itinerários",
};

const rotuloRecurso = (r: string) =>
  ROTULO_RECURSO[r.toLowerCase()] ?? r.charAt(0).toUpperCase() + r.slice(1);

const mensagemErro = (e: unknown) =>
  e instanceof Error ? e.message : "Não foi possível concluir a operação.";

function IntegrationsPage() {
  const integracoes = useIntegracoes();
  const [criando, setCriando] = useState(false);
  const { editar } = usePermissao("integracoes");
  const lista = integracoes.data ?? [];
  const ativas = lista.filter((i) => i.ativa).length;
  const ultimo = lista
    .map((i) => i.ultimo_evento_em)
    .filter((x): x is string => !!x)
    .sort()
    .at(-1);

  return (
    <>
      <PageHeader
        title="Integrações"
        subtitle="Sistemas externos que enviam dados ao terminal: empresas de ônibus (os mesmos registros do MONITRIIP/ANTT), catracas e pagamento."
        actions={
          editar ? (
            <Button onClick={() => setCriando(true)}>
              <Plus className="h-4 w-4" /> Nova integração
            </Button>
          ) : undefined
        }
      />

      <StatGrid cols={3} className="mb-6">
        <StatCard
          label="Integrações ativas"
          value={integracoes.isLoading ? "…" : num(ativas)}
          hint={lista.length === 1 ? "1 cadastrada" : `${num(lista.length)} cadastradas`}
          icon={PlugZap}
        />
        <StatCard
          label="Último evento"
          value={ultimo ? dataHora(ultimo) : "—"}
          hint={ultimo ? "De qualquer integração" : "Nenhum evento recebido ainda"}
          icon={RadioTower}
          tone="info"
        />
        <ImportacaoResumo />
      </StatGrid>

      <Tabs defaultValue="integracoes">
        <TabsList>
          <TabsTrigger value="integracoes">Integrações</TabsTrigger>
          <TabsTrigger value="eventos">Eventos recebidos</TabsTrigger>
          <TabsTrigger value="publicos">Dados públicos</TabsTrigger>
          <TabsTrigger value="como">Como integrar</TabsTrigger>
        </TabsList>

        <TabsContent value="integracoes" className="mt-4">
          <ListaIntegracoes
            integracoes={lista}
            isLoading={integracoes.isLoading}
            error={integracoes.error}
            onCriar={() => setCriando(true)}
          />
        </TabsContent>
        <TabsContent value="eventos" className="mt-4">
          <EventosRecebidos integracoes={lista} />
        </TabsContent>
        <TabsContent value="publicos" className="mt-4">
          <DadosPublicos />
        </TabsContent>
        <TabsContent value="como" className="mt-4">
          <ComoIntegrar />
        </TabsContent>
      </Tabs>

      <NovaIntegracaoDialog open={criando} onOpenChange={setCriando} />
    </>
  );
}

/* ------------------------------ Integrações ------------------------------ */

function ListaIntegracoes({
  integracoes,
  isLoading,
  error,
  onCriar,
}: {
  integracoes: IntegracaoComEmpresa[];
  isLoading: boolean;
  error: unknown;
  onCriar: () => void;
}) {
  const revogar = useRevogarIntegracao();
  const reativar = useReativarIntegracao();
  const { editar } = usePermissao("integracoes");
  const [revogando, setRevogando] = useState<IntegracaoComEmpresa | null>(null);
  const falha = revogar.error ?? reativar.error;

  const colunas: Column<IntegracaoComEmpresa>[] = [
    {
      key: "nome",
      header: "Integração",
      mobile: "title",
      cellClassName: "min-w-[12rem]",
      render: (i) => (
        <div className="min-w-0">
          <p className="font-semibold">{i.nome}</p>
          {i.descricao && (
            <p className="text-xs font-normal text-muted-foreground">{i.descricao}</p>
          )}
        </div>
      ),
    },
    {
      key: "tipo",
      header: "Tipo",
      mobile: "subtitle",
      render: (i) => rotuloTipoIntegracao(i.tipo),
    },
    {
      key: "empresa",
      header: "Empresa",
      mobile: "meta",
      cellClassName: "min-w-[12rem]",
      render: (i) =>
        i.empresa ? (
          <div>
            <p>{tituloNome(i.empresa.razao_social)}</p>
            <p className="tabular text-xs whitespace-nowrap text-muted-foreground">
              {formatCnpj(i.empresa.cnpj)}
            </p>
          </div>
        ) : (
          <Vazio />
        ),
    },
    {
      key: "chave",
      header: "Chave",
      nowrap: true,
      mobile: "meta",
      render: (i) => (
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{i.chave_prefixo}…</code>
      ),
    },
    {
      key: "ativa",
      header: "Situação",
      mobile: "badge",
      render: (i) => (
        <StatusBadge size="sm" tone={i.ativa ? "success" : "neutral"}>
          {i.ativa ? "Ativa" : "Revogada"}
        </StatusBadge>
      ),
    },
    {
      key: "ultimo",
      header: "Último evento",
      nowrap: true,
      mobile: "meta",
      render: (i) =>
        i.ultimo_evento_em ? (
          <span className="tabular">{dataHora(i.ultimo_evento_em)}</span>
        ) : (
          <span className="text-muted-foreground">Nunca</span>
        ),
    },
    {
      key: "acoes",
      header: "",
      align: "right",
      mobile: "action",
      render: (i) =>
        !editar ? null : i.ativa ? (
          <Button variant="outline" size="sm" onClick={() => setRevogando(i)}>
            Revogar
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={reativar.isPending}
            onClick={() => reativar.mutate(i)}
          >
            Reativar
          </Button>
        ),
    },
  ];

  return (
    <SectionCard
      title="Integrações cadastradas"
      description="Cada sistema externo recebe uma chave própria. O banco guarda só o hash; a chave aparece uma única vez ao ser criada."
      bodyClassName="p-0"
    >
      {falha && <p className="px-5 pt-4 text-sm text-danger">{mensagemErro(falha)}</p>}
      {isLoading || error ? (
        <QueryState isLoading={isLoading} error={error} />
      ) : (
        <DataTable
          columns={colunas}
          rows={integracoes}
          empty={
            <EmptyState
              icon={PlugZap}
              title="Nenhuma integração criada"
              message="Crie uma chave para cada empresa de ônibus, catraca ou sistema de pagamento que vai enviar dados ao terminal."
              action={
                editar ? (
                  <Button onClick={onCriar}>
                    <Plus className="h-4 w-4" /> Nova integração
                  </Button>
                ) : undefined
              }
            />
          }
        />
      )}

      <AlertDialog open={!!revogando} onOpenChange={(o) => !o && setRevogando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar a chave de “{revogando?.nome}”?</AlertDialogTitle>
            <AlertDialogDescription>
              O sistema externo deixa de conseguir enviar dados imediatamente. Os dados já recebidos
              são mantidos. Para voltar a receber, reative a integração ou crie uma nova chave.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (revogando) revogar.mutate(revogando);
                setRevogando(null);
              }}
            >
              Revogar chave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SectionCard>
  );
}

function NovaIntegracaoDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const empresas = useEmpresas();
  const criar = useCriarIntegracao();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoIntegracao>("empresa");
  const [empresaId, setEmpresaId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [chave, setChave] = useState<string | null>(null);

  const fechar = (o: boolean) => {
    if (!o) {
      setNome("");
      setTipo("empresa");
      setEmpresaId("");
      setDescricao("");
      setChave(null);
      criar.reset();
    }
    onOpenChange(o);
  };

  const precisaEmpresa = tipo === "empresa";
  const podeSalvar = nome.trim() !== "" && (!precisaEmpresa || empresaId !== "");

  const salvar = () =>
    criar.mutate(
      {
        nome: nome.trim(),
        tipo,
        empresaId: tipo === "empresa" || tipo === "outro" ? empresaId || null : null,
        descricao: descricao.trim(),
      },
      { onSuccess: setChave },
    );

  return (
    <Dialog open={open} onOpenChange={fechar}>
      <DialogContent className="sm:max-w-lg">
        {chave ? (
          <>
            <DialogHeader>
              <div className="mb-1 grid h-10 w-10 place-items-center rounded-xl bg-success-soft text-success max-sm:mx-auto">
                <Check className="h-5 w-5" aria-hidden="true" />
              </div>
              <DialogTitle>Chave criada</DialogTitle>
              <DialogDescription>
                Envie esta chave ao responsável técnico de “{nome}”.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                  Chave de acesso
                </p>
                <CampoCopiavel texto={chave} rotulo="Copiar chave" />
              </div>
              <dl className="grid gap-3 rounded-xl bg-muted/60 p-3 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4 sm:gap-y-2">
                <dt className="text-muted-foreground">Header</dt>
                <dd className="-mt-2 sm:mt-0">
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    x-api-key: {"<chave>"}
                  </code>
                </dd>
                <dt className="text-muted-foreground">Endereço</dt>
                <dd className="-mt-2 font-mono text-xs break-all sm:mt-0">{URL_INGESTAO}</dd>
              </dl>
              <div className="flex items-start gap-2.5 rounded-xl bg-warning-soft px-3 py-2.5 text-sm text-warning-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>
                  <span className="font-semibold">Esta é a única vez que a chave aparece.</span>{" "}
                  Copie agora e guarde em local seguro; se perder, revogue e crie outra.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => fechar(false)}>Concluir</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Nova integração</DialogTitle>
              <DialogDescription>
                Gera uma chave de acesso para um sistema externo enviar dados ao terminal.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="int-nome">Nome</Label>
                <Input
                  id="int-nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: Sistema de vendas — Viação X"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as TipoIntegracao)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_INTEGRACAO.map((t) => (
                      <SelectItem key={t.valor} value={t.valor}>
                        {t.rotulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {TIPOS_INTEGRACAO.find((t) => t.valor === tipo)?.descricao}
                </p>
              </div>
              {(tipo === "empresa" || tipo === "outro") && (
                <div className="space-y-1.5">
                  <Label>Empresa{precisaEmpresa ? "" : " (opcional)"}</Label>
                  {empresas.isLoading || empresas.error ? (
                    <QueryState isLoading={empresas.isLoading} error={empresas.error} />
                  ) : (
                    <Select value={empresaId} onValueChange={setEmpresaId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        {(empresas.data ?? []).map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {tituloNome(e.razao_social)} · {formatCnpj(e.cnpj)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="int-desc">Observação</Label>
                <Textarea
                  id="int-desc"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Contato técnico, fornecedor do sistema etc."
                  rows={2}
                />
              </div>
              {criar.error && <p className="text-sm text-danger">{mensagemErro(criar.error)}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => fechar(false)}>
                Cancelar
              </Button>
              <Button disabled={!podeSalvar || criar.isPending} onClick={salvar}>
                <KeyRound className="h-4 w-4" />
                {criar.isPending ? "Gerando..." : "Gerar chave"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------- Eventos recebidos --------------------------- */

function EventosRecebidos({ integracoes }: { integracoes: IntegracaoComEmpresa[] }) {
  const [filtro, setFiltro] = useState<FiltroEventos>({
    status: "todos",
    tipo: "todos",
    integracaoId: "todas",
  });
  const eventos = useEventosIntegracao(filtro);
  const [aberto, setAberto] = useState<EventoIntegracao | null>(null);
  const nomes = useMemo(() => new Map(integracoes.map((i) => [i.id, i.nome])), [integracoes]);

  const colunas: Column<EventoIntegracao>[] = [
    {
      key: "recebido",
      header: "Recebido em",
      nowrap: true,
      mobile: "meta",
      render: (e) => <span className="tabular">{dataHora(e.recebido_em)}</span>,
    },
    {
      key: "integracao",
      header: "Integração",
      mobile: "title",
      render: (e) =>
        e.integracao_id ? (
          (nomes.get(e.integracao_id) ?? <Vazio />)
        ) : (
          <span className="text-muted-foreground">Excluída</span>
        ),
    },
    {
      key: "tipo",
      header: "Tipo",
      mobile: "subtitle",
      render: (e) => ROTULO_EVENTO[e.tipo] ?? e.tipo,
    },
    {
      key: "status",
      header: "Status",
      mobile: "badge",
      render: (e) => {
        const s = statusEventoTone[e.status];
        return (
          <StatusBadge size="sm" tone={s?.tone ?? "neutral"}>
            {s?.label ?? e.status}
          </StatusBadge>
        );
      },
    },
    {
      key: "msg",
      header: "Mensagem",
      mobile: "meta",
      cellClassName: "min-w-[12rem]",
      render: (e) => (e.erro ? <span className="text-muted-foreground">{e.erro}</span> : <Vazio />),
    },
    {
      key: "ver",
      header: "",
      align: "right",
      mobile: "action",
      render: (e) => (
        <Button variant="ghost" size="sm" onClick={() => setAberto(e)}>
          Ver dados
        </Button>
      ),
    },
  ];

  return (
    <>
      <FilterBar>
        <FilterSelect
          value={filtro.status ?? "todos"}
          onValueChange={(v) => setFiltro((f) => ({ ...f, status: v as FiltroEventos["status"] }))}
          aria-label="Status do evento"
          allLabel="Todos os status"
          options={[
            { value: "processado", label: "Processados" },
            { value: "ignorado", label: "Ignorados" },
            { value: "erro", label: "Com erro" },
          ]}
        />
        <FilterSelect
          value={filtro.tipo ?? "todos"}
          onValueChange={(v) => setFiltro((f) => ({ ...f, tipo: v }))}
          aria-label="Tipo de evento"
          allLabel="Todos os tipos"
          options={TIPOS_EVENTO.map((t) => ({ value: t, label: ROTULO_EVENTO[t] }))}
        />
        <FilterSelect
          value={filtro.integracaoId ?? "todas"}
          onValueChange={(v) => setFiltro((f) => ({ ...f, integracaoId: v }))}
          aria-label="Integração"
          allLabel="Todas as integrações"
          allValue="todas"
          options={integracoes.map((i) => ({ value: i.id, label: i.nome }))}
        />
      </FilterBar>

      <SectionCard
        title="Eventos recebidos"
        description="Últimos 200 eventos (atualiza a cada 30 s). Dados pessoais de passageiros são descartados antes de gravar."
        bodyClassName="p-0"
      >
        {eventos.isLoading || eventos.error ? (
          <QueryState isLoading={eventos.isLoading} error={eventos.error} />
        ) : (
          <DataTable
            columns={colunas}
            rows={eventos.data ?? []}
            emptyMessage="Nenhum evento recebido com esses filtros. Os eventos aparecem aqui assim que um sistema externo enviar dados com uma chave válida."
          />
        )}
      </SectionCard>

      <Dialog open={!!aberto} onOpenChange={(o) => !o && setAberto(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{aberto ? (ROTULO_EVENTO[aberto.tipo] ?? aberto.tipo) : ""}</DialogTitle>
            <DialogDescription>
              {aberto &&
                `Recebido em ${dataHora(aberto.recebido_em)} · ${statusEventoTone[aberto.status]?.label ?? aberto.status}`}
            </DialogDescription>
          </DialogHeader>
          {aberto?.erro && <p className="text-sm text-muted-foreground">{aberto.erro}</p>}
          <BlocoCodigo texto={JSON.stringify(aberto?.payload ?? {}, null, 2)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ----------------------------- Dados públicos ---------------------------- */

function useUltimasImportacoes() {
  const importacoes = useImportacoes();
  const ultimas = useMemo(() => {
    const vistos = new Set<string>();
    return (importacoes.data ?? []).filter((i) => {
      const k = `${i.fonte}|${i.recurso}`;
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    });
  }, [importacoes.data]);
  return { ...importacoes, ultimas };
}

function ImportacaoResumo() {
  const { ultimas, isLoading, error } = useUltimasImportacoes();
  const ultima = ultimas[0];
  return (
    <StatCard
      label="Dados públicos"
      value={isLoading ? "…" : ultima ? dataHora(ultima.executado_em) : "—"}
      hint={
        error
          ? "Falha ao consultar a importação"
          : ultima
            ? "Última importação (ANTT/DER-MG)"
            : "Nenhuma importação registrada"
      }
      icon={DatabaseZap}
      tone="info"
    />
  );
}

function DadosPublicos() {
  const { ultimas, isLoading, error } = useUltimasImportacoes();
  const linhas = ultimas.map((i) => ({ ...i, id: `${i.fonte}|${i.recurso}` }));
  return (
    <SectionCard
      title="Importação de dados públicos"
      description="Linhas, horários e passagens vendidas publicados pela ANTT e pelo DER-MG, importados todos os dias automaticamente."
      bodyClassName="p-0"
    >
      {isLoading || error ? (
        <QueryState isLoading={isLoading} error={error} />
      ) : (
        <DataTable
          columns={[
            {
              key: "recurso",
              header: "Recurso",
              mobile: "title",
              render: (i) => <span className="font-semibold">{rotuloRecurso(i.recurso)}</span>,
            },
            {
              key: "fonte",
              header: "Fonte",
              nowrap: true,
              mobile: "subtitle",
              render: (i) => i.fonte,
            },
            {
              key: "comp",
              header: "Competência",
              nowrap: true,
              mobile: "meta",
              render: (i) => {
                const c = formatarCompetencia(i.competencia);
                return c ? (
                  <span className="tabular" title={i.competencia}>
                    {c}
                  </span>
                ) : (
                  <Vazio />
                );
              },
            },
            {
              key: "reg",
              header: "Registros",
              align: "right",
              nowrap: true,
              mobile: "meta",
              render: (i) => <span className="tabular">{num(i.registros)}</span>,
            },
            {
              key: "exec",
              header: "Executado em",
              nowrap: true,
              mobile: "meta",
              render: (i) => <span className="tabular">{dataHora(i.executado_em)}</span>,
            },
          ]}
          rows={linhas}
          emptyMessage="Nenhuma importação registrada. A importação diária roda pelo GitHub Actions (scripts/importar-dados-publicos.ts)."
        />
      )}
      <div className="border-t border-border px-4 pb-4 sm:px-5">
        <SourceNote>
          Fontes: Portal de Dados Abertos da ANTT e DER-MG. Esses dados não precisam de chave: são
          públicos e atualizados sem intervenção da equipe.
        </SourceNote>
      </div>
    </SectionCard>
  );
}

/* ------------------------------ Como integrar ---------------------------- */

function ComoIntegrar() {
  return (
    <div className="space-y-4">
      <SectionCard title="Endereço e autenticação">
        <div className="space-y-4 text-sm">
          <div>
            <p className="mb-1.5 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Endpoint <span className="font-normal normal-case">· POST, JSON UTF-8</span>
            </p>
            <CampoCopiavel texto={URL_INGESTAO} rotulo="Copiar" />
          </div>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.8125rem] [&_code]:[overflow-wrap:anywhere] [&_code]:text-foreground">
            <li>
              Envie a chave da integração no header <code>x-api-key</code> (ou{" "}
              <code>Authorization: Bearer srv_…</code>).
            </li>
            <li>
              Um evento por requisição (<code>{"{ tipo, dados }"}</code>) ou em lote (
              <code>{"{ eventos: [...] }"}</code>, até 500 por requisição).
            </li>
            <li>
              <span className="font-semibold text-foreground">Empresas de ônibus:</span> podem
              reenviar exatamente o JSON que já mandam ao MONITRIIP/ANTT. Basta trocar a URL base
              (ex.: <code>{URL_INGESTAO}/bilhetes/venda</code>) ou enviar o log com o{" "}
              <code>idLog</code>; o tipo é reconhecido automaticamente. Só os bilhetes com
              embarque/desembarque em Manhuaçu e as chegadas/partidas no terminal são aproveitados —
              o resto é marcado como ignorado.
            </li>
            <li>
              A integração de uma empresa só grava dados do próprio CNPJ. Reenviar o mesmo evento
              não duplica nada.
            </li>
            <li>
              A resposta traz, para cada evento, se foi processado, ignorado ou deu erro, com a
              mensagem. Tudo também fica no log da aba “Eventos recebidos”.
            </li>
            <li>
              Datas/horas no formato <code>AAAA-MM-DDThh:mm:ss-03:00</code>. A hora da viagem é a
              hora programada no ponto inicial da linha (a mesma do quadro de horários e do
              MONITRIIP).
            </li>
          </ul>
        </div>
      </SectionCard>

      {EXEMPLOS.map((ex) => (
        <SectionCard key={ex.tipo} title={ex.titulo} description={`${ex.quem} · ${ex.explicacao}`}>
          <Tabs defaultValue="simples">
            <TabsList>
              <TabsTrigger value="simples">Formato do terminal</TabsTrigger>
              {ex.monitriip && (
                <TabsTrigger value="monitriip">MONITRIIP ({ex.monitriip.servico})</TabsTrigger>
              )}
              <TabsTrigger value="curl">curl</TabsTrigger>
            </TabsList>
            <TabsContent value="simples" className="mt-3">
              <BlocoCodigo texto={JSON.stringify(ex.simples, null, 2)} />
            </TabsContent>
            {ex.monitriip && (
              <TabsContent value="monitriip" className="mt-3">
                <p className="mb-2 text-xs leading-relaxed text-muted-foreground [&_code]:font-mono [&_code]:[overflow-wrap:anywhere] [&_code]:text-foreground">
                  Mesmo corpo enviado à ANTT. URL:{" "}
                  <code>
                    {URL_INGESTAO}
                    {ex.monitriip.caminho}
                  </code>{" "}
                  (ou a URL base, já que o <code>idLog</code> identifica o tipo).
                </p>
                <BlocoCodigo texto={JSON.stringify(ex.monitriip.corpo, null, 2)} />
              </TabsContent>
            )}
            <TabsContent value="curl" className="mt-3">
              <BlocoCodigo texto={exemploCurl(ex.simples)} />
            </TabsContent>
          </Tabs>
        </SectionCard>
      ))}
    </div>
  );
}

/* ------------------------------- Auxiliares ------------------------------ */

function BotaoCopiar({ texto, rotulo }: { texto: string; rotulo: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        } catch {
          setCopiado(false);
        }
      }}
    >
      {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copiado ? "Copiado" : rotulo}
    </Button>
  );
}

/** Valor em fonte mono que quebra em qualquer ponto (não corta) + botão copiar ao lado. */
function CampoCopiavel({ texto, rotulo }: { texto: string; rotulo: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-muted p-2 sm:flex-row sm:items-center">
      <code className="min-w-0 flex-1 px-1.5 py-1 font-mono text-[0.8125rem] leading-relaxed break-all text-foreground select-all">
        {texto}
      </code>
      <div className="shrink-0 max-sm:[&>button]:w-full">
        <BotaoCopiar texto={texto} rotulo={rotulo} />
      </div>
    </div>
  );
}

function BlocoCodigo({ texto }: { texto: string }) {
  return (
    <div className="relative">
      <pre className="max-h-[28rem] overflow-auto rounded-xl bg-muted p-4 pt-12 font-mono text-xs leading-relaxed sm:pt-4 sm:pr-28">
        {texto}
      </pre>
      <div className="absolute top-2 right-2">
        <BotaoCopiar texto={texto} rotulo="Copiar" />
      </div>
    </div>
  );
}
