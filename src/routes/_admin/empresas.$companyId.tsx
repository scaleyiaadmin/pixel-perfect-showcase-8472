import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  CalendarCheck,
  CalendarDays,
  Clock,
  Loader2,
  Pencil,
  Route as RouteIcon,
  ShieldAlert,
} from "lucide-react";
import {
  DataTable,
  EmptyState,
  PageHeader,
  QueryState,
  SectionCard,
  SourceNote,
  StatCard,
  StatGrid,
  StatusBadge,
  Vazio,
  feeTone,
  ouVazio,
  tripStatusTone,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  descreverDias,
  destinoDaPartida,
  formatCnpj,
  horaCurta,
  partidasDoDia,
  useEmpresas,
  useHorarios,
  useLinhas,
} from "@/services/dados-publicos";
import {
  nomeExibicao,
  podeEditar,
  podeVer,
  useAtualizarEmpresa,
  useEmbarquesDasViagens,
  usePerfil,
  useTaxasDaEmpresa,
  useViagensDaEmpresa,
  type DadosCadastroEmpresa,
  type EmpresaCadastro,
} from "@/services/acesso";
import type { Viagem } from "@/services/gestao-tipos";
import { brl, dataCurta, hojeISO, hora, num, tituloNome } from "@/lib/format";

export const Route = createFileRoute("/_admin/empresas/$companyId")({
  head: () => ({
    meta: [
      { title: "Detalhe da empresa — SisRodov Manhuaçu" },
      {
        name: "description",
        content: "Linhas e horários da empresa de transporte no Terminal Rodoviário de Manhuaçu.",
      },
      { property: "og:title", content: "Detalhe da empresa — SisRodov Manhuaçu" },
      { property: "og:description", content: "Linhas e horários da empresa." },
    ],
  }),
  component: CompanyDetail,
});

const TIPO_VIAGEM: Record<Viagem["tipo"], string> = {
  partida: "Partida",
  chegada: "Chegada",
  passagem: "Passagem",
};

const competenciaLegivel = (c: string) => `${c.slice(5, 7)}/${c.slice(0, 4)}`;

function CompanyDetail() {
  const { companyId } = Route.useParams();
  const { perfil } = usePerfil();
  const papel = perfil?.ativo ? perfil.papel : null;
  const empresaUsuario = papel === "empresa";
  const permitido = !empresaUsuario || perfil?.empresa_id === companyId;
  const podeEditarCadastro = podeEditar(papel, "empresas");
  const verTaxas = podeVer(papel, "financeiro");

  const empresas = useEmpresas();
  const linhas = useLinhas();
  const horarios = useHorarios();
  const hoje = hojeISO();
  const viagens = useViagensDaEmpresa(permitido ? companyId : undefined, hoje);
  const embarques = useEmbarquesDasViagens((viagens.data ?? []).map((v) => v.id));
  const taxas = useTaxasDaEmpresa(permitido && verTaxas ? companyId : undefined);
  const [editando, setEditando] = useState(false);

  const company = empresas.data?.find((c) => c.id === companyId) as EmpresaCadastro | undefined;
  const companyLines = (linhas.data ?? []).filter((l) => l.empresa_id === companyId);
  const companySchedules = (horarios.data ?? []).filter(
    (h) => h.linha.empresa_id === companyId && h.parte_de_manhuacu,
  );
  const today = partidasDoDia(companySchedules, new Date());

  // Embarques por viagem: leituras de catraca confirmadas e bilhetes vinculados.
  const porViagem = useMemo(() => {
    const mapa = new Map<string, { catraca: number; bilhetes: number }>();
    for (const e of embarques.data?.eventos ?? []) {
      if (!e.viagem_id || e.evento !== "acesso" || e.status !== "confirmado") continue;
      const atual = mapa.get(e.viagem_id) ?? { catraca: 0, bilhetes: 0 };
      atual.catraca += 1;
      mapa.set(e.viagem_id, atual);
    }
    for (const b of embarques.data?.bilhetes ?? []) {
      if (!b.viagem_id || b.status === "cancelada") continue;
      const atual = mapa.get(b.viagem_id) ?? { catraca: 0, bilhetes: 0 };
      atual.bilhetes += 1;
      mapa.set(b.viagem_id, atual);
    }
    return mapa;
  }, [embarques.data]);

  const embarquesHoje = [...porViagem.values()].reduce((s, v) => s + v.catraca, 0);
  const taxasEmAberto = (taxas.data ?? [])
    .filter((t) => t.status === "pendente" || t.status === "inadimplente")
    .reduce((s, t) => s + Number(t.valor), 0);

  const back = !empresaUsuario && (
    <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
      <Link to="/empresas">
        <ArrowLeft className="h-4 w-4" /> Voltar para empresas
      </Link>
    </Button>
  );

  if (!permitido) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <ShieldAlert className="h-8 w-8 text-muted-foreground" />
        <h1 className="font-display text-xl font-bold">Acesso não permitido</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Seu usuário só tem acesso aos dados da própria empresa.
        </p>
        {perfil?.empresa_id && (
          <Button asChild>
            <Link to="/empresas/$companyId" params={{ companyId: perfil.empresa_id }}>
              Ir para minha empresa
            </Link>
          </Button>
        )}
      </div>
    );
  }

  if (empresas.isLoading || empresas.error) {
    return (
      <>
        {back}
        <QueryState isLoading={empresas.isLoading} error={empresas.error} />
      </>
    );
  }
  if (!company) {
    return (
      <>
        {back}
        <EmptyState message="Empresa não encontrada." />
      </>
    );
  }

  const nome = tituloNome(nomeExibicao(company));
  const temFantasia = Boolean(company.nome_fantasia?.trim());
  const contato = [company.contato, company.email, company.telefone].filter(Boolean);

  return (
    <>
      <PageHeader
        eyebrow={
          empresaUsuario ? (
            <span>Minha empresa</span>
          ) : (
            <Link to="/empresas" className="inline-flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Empresas
            </Link>
          )
        }
        title={
          <span className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-2 h-3 w-3 shrink-0 rounded-full bg-primary md:mt-2.5"
              style={company.cor ? { backgroundColor: company.cor } : undefined}
            />
            <span className="min-w-0 text-balance">{nome}</span>
          </span>
        }
        subtitle={temFantasia ? tituloNome(company.razao_social) : undefined}
        actions={
          podeEditarCadastro && (
            <Button variant="outline" onClick={() => setEditando(true)}>
              <Pencil className="h-4 w-4" /> Editar cadastro
            </Button>
          )
        }
      >
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge tone={company.ativa ? "success" : "neutral"}>
            {company.ativa ? "Ativa" : "Inativa"}
          </StatusBadge>
          <StatusBadge tone={company.opera_no_terminal ? "info" : "neutral"}>
            {company.opera_no_terminal ? "Opera no terminal" : "Não opera no terminal"}
          </StatusBadge>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:flex sm:flex-wrap sm:gap-x-8">
          <Dado rotulo="CNPJ">
            <span className="tabular whitespace-nowrap">{formatCnpj(company.cnpj)}</span>
          </Dado>
          {company.codigo_antt && (
            <Dado rotulo="Código ANTT">
              <span className="tabular">{company.codigo_antt}</span>
            </Dado>
          )}
          <Dado rotulo="Fonte">{ouVazio(company.fonte)}</Dado>
          {contato.length > 0 && (
            <Dado rotulo="Contato" className="col-span-2 sm:col-span-1">
              <span className="break-words">{contato.join(" · ")}</span>
            </Dado>
          )}
        </dl>
      </PageHeader>

      <StatGrid>
        <StatCard label="Linhas" value={num(companyLines.length)} icon={RouteIcon} />
        <StatCard
          label="Partidas por semana"
          value={num(companySchedules.reduce((s, h) => s + h.dias_semana.length, 0))}
          hint="Saindo de Manhuaçu"
          icon={CalendarDays}
          tone="info"
        />
        <StatCard
          label="Partidas hoje"
          value={num(today.length)}
          hint="Pelos horários publicados"
          icon={Clock}
          tone="success"
        />
        <StatCard
          label="Viagens hoje"
          value={viagens.data ? num(viagens.data.length) : "—"}
          hint={viagens.data?.length ? `${num(embarquesHoje)} embarques na catraca` : undefined}
          icon={CalendarCheck}
          tone="warning"
        />
      </StatGrid>

      <div className="mt-6">
        <Tabs defaultValue="linhas">
          <TabsList>
            <TabsTrigger value="linhas">Linhas</TabsTrigger>
            <TabsTrigger value="horarios">Horários</TabsTrigger>
            <TabsTrigger value="viagens">Viagens de hoje</TabsTrigger>
            {verTaxas && <TabsTrigger value="taxas">Taxas</TabsTrigger>}
          </TabsList>

          <TabsContent value="linhas" className="mt-4">
            <SectionCard title="Linhas operadas" bodyClassName="p-0">
              <QueryState isLoading={linhas.isLoading} error={linhas.error} />
              {linhas.data && (
                <DataTable
                  columns={[
                    {
                      key: "code",
                      header: "Prefixo",
                      nowrap: true,
                      mobile: "subtitle",
                      render: (l) => <span className="tabular font-semibold">{l.codigo}</span>,
                    },
                    {
                      key: "desc",
                      header: "Linha",
                      mobile: "title",
                      cellClassName: "min-w-[14rem]",
                      render: (l) => tituloNome(l.descricao),
                    },
                    {
                      key: "rel",
                      header: "Em Manhuaçu",
                      nowrap: true,
                      mobile: "badge",
                      render: (l) => (
                        <StatusBadge size="sm" tone="neutral" dot={false}>
                          <span className="first-letter:uppercase">{l.relacao_manhuacu}</span>
                        </StatusBadge>
                      ),
                    },
                    {
                      key: "cities",
                      header: "Cidades atendidas",
                      mobile: "meta",
                      cellClassName: "min-w-[14rem]",
                      render: (l) =>
                        l.cidades_atendidas.length ? (
                          <span className="text-muted-foreground">
                            {l.cidades_atendidas.map((c) => tituloNome(c)).join(", ")}
                          </span>
                        ) : (
                          <Vazio />
                        ),
                    },
                  ]}
                  rows={companyLines}
                  emptyMessage="Nenhuma linha desta empresa nos dados públicos."
                />
              )}
            </SectionCard>
          </TabsContent>

          <TabsContent value="horarios" className="mt-4">
            <SectionCard title="Partidas do terminal de Manhuaçu" bodyClassName="p-0">
              <QueryState isLoading={horarios.isLoading} error={horarios.error} />
              {horarios.data && (
                <DataTable
                  columns={[
                    {
                      key: "time",
                      header: "Horário",
                      nowrap: true,
                      mobile: "badge",
                      render: (h) => (
                        <span className="tabular font-semibold">{horaCurta(h.hora)}</span>
                      ),
                    },
                    {
                      key: "dest",
                      header: "Destino",
                      mobile: "title",
                      render: (h) => tituloNome(destinoDaPartida(h)),
                    },
                    {
                      key: "type",
                      header: "Serviço",
                      mobile: "meta",
                      render: (h) => ouVazio(h.tipo_servico || null),
                    },
                    {
                      key: "days",
                      header: "Dias",
                      mobile: "meta",
                      render: (h) => descreverDias(h.dias_semana),
                    },
                    {
                      key: "line",
                      header: "Linha",
                      nowrap: true,
                      mobile: "subtitle",
                      render: (h) => (
                        <span className="tabular text-muted-foreground">{h.linha.codigo}</span>
                      ),
                    },
                  ]}
                  rows={companySchedules}
                  emptyMessage="A ANTT não publica horário de partida em Manhuaçu para as linhas desta empresa que só passam pela cidade."
                />
              )}
            </SectionCard>
          </TabsContent>

          <TabsContent value="viagens" className="mt-4">
            <SectionCard
              title="Viagens de hoje no terminal"
              description={dataCurta(`${hoje}T12:00:00`)}
              bodyClassName="p-0"
            >
              <QueryState isLoading={viagens.isLoading} error={viagens.error} />
              {embarques.error && (
                <p className="border-b border-border px-4 py-2 text-xs text-danger">
                  Não foi possível carregar os embarques das viagens.
                </p>
              )}
              {viagens.data && (
                <DataTable
                  columns={[
                    {
                      key: "prev",
                      header: "Previsto",
                      nowrap: true,
                      mobile: "meta",
                      render: (v) =>
                        v.previsto_em ? (
                          <span className="tabular font-semibold">{hora(v.previsto_em)}</span>
                        ) : (
                          <Vazio />
                        ),
                    },
                    {
                      key: "tipo",
                      header: "Tipo",
                      mobile: "meta",
                      render: (v) => TIPO_VIAGEM[v.tipo],
                    },
                    {
                      key: "trecho",
                      header: "Trecho",
                      mobile: "title",
                      cellClassName: "min-w-[12rem]",
                      render: (v) => (
                        <span>
                          {tituloNome(v.origem)} → {tituloNome(v.destino)}
                          {v.numero && (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              #{v.numero}
                            </span>
                          )}
                        </span>
                      ),
                    },
                    {
                      key: "catraca",
                      header: "Catraca",
                      align: "right",
                      mobile: "meta",
                      render: (v) => (
                        <span className="tabular">
                          {embarques.data ? num(porViagem.get(v.id)?.catraca ?? 0) : "—"}
                        </span>
                      ),
                    },
                    {
                      key: "bilhetes",
                      header: "Bilhetes",
                      align: "right",
                      mobile: "meta",
                      render: (v) => (
                        <span className="tabular">
                          {embarques.data ? num(porViagem.get(v.id)?.bilhetes ?? 0) : "—"}
                        </span>
                      ),
                    },
                    {
                      key: "status",
                      header: "Status",
                      mobile: "badge",
                      render: (v) => {
                        const s = tripStatusTone[v.status];
                        return (
                          <StatusBadge size="sm" tone={s?.tone ?? "neutral"}>
                            {s?.label ?? v.status}
                          </StatusBadge>
                        );
                      },
                    },
                  ]}
                  rows={viagens.data}
                  emptyMessage="Nenhuma viagem desta empresa registrada hoje. As viagens chegam pela integração com o sistema da empresa (os mesmos registros enviados à ANTT/MONITRIIP) ou são lançadas pela equipe do terminal em Operação → Viagens."
                />
              )}
            </SectionCard>
          </TabsContent>

          {verTaxas && (
            <TabsContent value="taxas" className="mt-4">
              <SectionCard
                title="Taxas de embarque"
                description={
                  taxas.data?.length
                    ? taxasEmAberto > 0
                      ? `${brl(taxasEmAberto)} em aberto`
                      : "Nenhum valor em aberto"
                    : undefined
                }
                bodyClassName="p-0"
              >
                <QueryState isLoading={taxas.isLoading} error={taxas.error} />
                {taxas.data && (
                  <DataTable
                    columns={[
                      {
                        key: "num",
                        header: "Número",
                        nowrap: true,
                        mobile: "subtitle",
                        render: (t) => <span className="tabular font-semibold">{t.numero}</span>,
                      },
                      {
                        key: "comp",
                        header: "Competência",
                        nowrap: true,
                        mobile: "title",
                        render: (t) => (
                          <span className="tabular">{competenciaLegivel(t.competencia)}</span>
                        ),
                      },
                      {
                        key: "emb",
                        header: "Embarques",
                        align: "right",
                        mobile: "meta",
                        render: (t) => <span className="tabular">{num(t.embarques)}</span>,
                      },
                      {
                        key: "valor",
                        header: "Valor",
                        align: "right",
                        nowrap: true,
                        mobile: "meta",
                        render: (t) => <span className="tabular">{brl(Number(t.valor))}</span>,
                      },
                      {
                        key: "venc",
                        header: "Vencimento",
                        nowrap: true,
                        mobile: "meta",
                        render: (t) => (
                          <span className="tabular">{dataCurta(`${t.vencimento}T12:00:00`)}</span>
                        ),
                      },
                      {
                        key: "status",
                        header: "Status",
                        mobile: "badge",
                        render: (t) => {
                          const s = feeTone[t.status];
                          return (
                            <StatusBadge size="sm" tone={s?.tone ?? "neutral"}>
                              {s?.label ?? "Cancelada"}
                            </StatusBadge>
                          );
                        },
                      },
                    ]}
                    rows={taxas.data}
                    emptyMessage="Nenhuma taxa gerada para esta empresa. As taxas são calculadas por competência a partir dos embarques registrados e da taxa por embarque definida em Configurações → Parâmetros."
                  />
                )}
              </SectionCard>
            </TabsContent>
          )}
        </Tabs>
        <SourceNote>
          Linhas e horários: ANTT, Dados Abertos (SIGMA). Viagens, embarques e taxas: integração com
          a empresa, catracas do terminal e lançamentos da equipe.
        </SourceNote>
      </div>

      {editando && <EditarCadastro empresa={company} onFechar={() => setEditando(false)} />}
    </>
  );
}

/* --------------------------- Edição do cadastro -------------------------- */

const COR_HEX = /^#[0-9a-fA-F]{6}$/;

function EditarCadastro({ empresa, onFechar }: { empresa: EmpresaCadastro; onFechar: () => void }) {
  const atualizar = useAtualizarEmpresa();
  const [form, setForm] = useState({
    nome_fantasia: empresa.nome_fantasia ?? "",
    codigo_antt: empresa.codigo_antt ?? "",
    contato: empresa.contato ?? "",
    email: empresa.email ?? "",
    telefone: empresa.telefone ?? "",
    cor: empresa.cor ?? "",
  });
  const [operaNoTerminal, setOperaNoTerminal] = useState(empresa.opera_no_terminal);

  const set = (campo: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }));

  const emailInvalido =
    form.email.trim() !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const corInvalida = form.cor.trim() !== "" && !COR_HEX.test(form.cor.trim());

  async function salvar() {
    const vazioParaNulo = (v: string) => v.trim() || null;
    const dados: DadosCadastroEmpresa = {
      nome_fantasia: vazioParaNulo(form.nome_fantasia),
      codigo_antt: vazioParaNulo(form.codigo_antt),
      contato: vazioParaNulo(form.contato),
      email: vazioParaNulo(form.email),
      telefone: vazioParaNulo(form.telefone),
      cor: vazioParaNulo(form.cor),
      opera_no_terminal: operaNoTerminal,
    };
    try {
      await atualizar.mutateAsync({ empresa, dados });
      onFechar();
    } catch {
      // Mensagem exibida a partir de atualizar.error.
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar cadastro</DialogTitle>
          <DialogDescription>
            {tituloNome(empresa.razao_social)} · CNPJ {formatCnpj(empresa.cnpj)}. Razão social e
            CNPJ vêm dos dados públicos e não são editados aqui.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="nome_fantasia" label="Nome fantasia" className="sm:col-span-2">
            <Input id="nome_fantasia" value={form.nome_fantasia} onChange={set("nome_fantasia")} />
          </Campo>
          <Campo id="codigo_antt" label="Código ANTT">
            <Input id="codigo_antt" value={form.codigo_antt} onChange={set("codigo_antt")} />
          </Campo>
          <Campo id="contato" label="Responsável / contato">
            <Input id="contato" value={form.contato} onChange={set("contato")} />
          </Campo>
          <Campo id="email" label="E-mail" erro={emailInvalido ? "E-mail inválido." : undefined}>
            <Input id="email" type="email" value={form.email} onChange={set("email")} />
          </Campo>
          <Campo id="telefone" label="Telefone">
            <Input id="telefone" inputMode="tel" value={form.telefone} onChange={set("telefone")} />
          </Campo>
          <Campo
            id="cor"
            label="Cor de identificação"
            erro={corInvalida ? "Use o formato #RRGGBB." : undefined}
          >
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Escolher cor"
                value={COR_HEX.test(form.cor) ? form.cor : "#1e3a8a"}
                onChange={(e) => setForm((f) => ({ ...f, cor: e.target.value }))}
                className="h-9 w-11 shrink-0 cursor-pointer rounded-md border border-border bg-transparent"
              />
              <Input id="cor" value={form.cor} onChange={set("cor")} placeholder="#1E3A8A" />
            </div>
          </Campo>
          <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/60 p-3 sm:col-span-2">
            <div>
              <Label htmlFor="opera">Opera no terminal</Label>
              <p className="text-xs text-muted-foreground">
                Empresas que usam o terminal entram no faturamento das taxas de embarque.
              </p>
            </div>
            <Switch id="opera" checked={operaNoTerminal} onCheckedChange={setOperaNoTerminal} />
          </div>
        </div>

        {atualizar.error && (
          <p className="text-sm text-danger">
            {atualizar.error instanceof Error ? atualizar.error.message : "Falha ao salvar."}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={emailInvalido || corInvalida || atualizar.isPending}>
            {atualizar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Dado({
  rotulo,
  className,
  children,
}: {
  rotulo: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`min-w-0 ${className ?? ""}`}>
      <dt className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
        {rotulo}
      </dt>
      <dd className="mt-0.5 font-medium text-foreground">{children}</dd>
    </div>
  );
}

function Campo({
  id,
  label,
  erro,
  className,
  children,
}: {
  id: string;
  label: string;
  erro?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {erro && <p className="text-xs text-danger">{erro}</p>}
    </div>
  );
}
