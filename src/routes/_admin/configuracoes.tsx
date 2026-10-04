import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Pencil,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import {
  DataTable,
  FilterBar,
  FilterSelect,
  PageHeader,
  QueryState,
  SectionCard,
  StatusBadge,
  Vazio,
  type Column,
} from "@/components/common";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmpresas } from "@/services/dados-publicos";
import {
  AUDITORIA_POR_PAGINA,
  PAPEIS,
  nomePapel,
  podeEditar,
  podeVer,
  useAtualizarPerfil,
  useAuditoria,
  useConfiguracoes,
  useModulosAuditoria,
  usePerfil,
  usePerfis,
  useSalvarConfiguracoes,
  type Modulo,
} from "@/services/acesso";
import type { Configuracao, Papel, Perfil, RegistroAuditoria } from "@/services/gestao-tipos";
import { brl, dataHora, tituloNome } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_admin/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — SisRodov Manhuaçu" },
      {
        name: "description",
        content:
          "Usuários, perfis de acesso, parâmetros do terminal e log de auditoria do SisRodov Manhuaçu.",
      },
      { property: "og:title", content: "Configurações — SisRodov Manhuaçu" },
      {
        property: "og:description",
        content: "Usuários, perfis, parâmetros e auditoria do sistema.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { perfil } = usePerfil();
  const papel = perfil?.ativo ? perfil.papel : null;
  const verUsuarios = podeVer(papel, "usuarios");
  const verAuditoria = podeVer(papel, "auditoria");
  const abaInicial = verUsuarios ? "usuarios" : "parametros";

  return (
    <>
      <PageHeader title="Configurações" subtitle="Parâmetros do sistema, acessos e auditoria." />

      <Tabs defaultValue={abaInicial}>
        <TabsList>
          {verUsuarios && <TabsTrigger value="usuarios">Usuários</TabsTrigger>}
          <TabsTrigger value="perfis">Perfis e permissões</TabsTrigger>
          <TabsTrigger value="parametros">Parâmetros</TabsTrigger>
          {verAuditoria && <TabsTrigger value="logs">Auditoria</TabsTrigger>}
        </TabsList>

        {verUsuarios && perfil && (
          <TabsContent value="usuarios" className="mt-4">
            <AbaUsuarios eu={perfil} podeAlterar={podeEditar(papel, "usuarios")} />
          </TabsContent>
        )}

        <TabsContent value="perfis" className="mt-4">
          <AbaPerfis />
        </TabsContent>

        <TabsContent value="parametros" className="mt-4">
          <AbaParametros podeAlterar={podeEditar(papel, "parametros")} />
        </TabsContent>

        {verAuditoria && (
          <TabsContent value="logs" className="mt-4">
            <AbaAuditoria />
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}

/* --------------------------------- Perfis -------------------------------- */

// Módulos exibidos nos cartões de perfil ("configuracoes" é só o contêiner desta página).
const MODULOS_PERFIL: { modulo: Modulo; rotulo: string }[] = [
  { modulo: "dashboard", rotulo: "Painel geral" },
  { modulo: "operacao", rotulo: "Operação" },
  { modulo: "painel", rotulo: "Painel de TV" },
  { modulo: "passagens", rotulo: "Passagens" },
  { modulo: "controle-embarque", rotulo: "Controle de embarque" },
  { modulo: "conciliacao", rotulo: "Conciliação" },
  { modulo: "empresas", rotulo: "Empresas" },
  { modulo: "financeiro", rotulo: "Financeiro" },
  { modulo: "relatorios", rotulo: "Relatórios" },
  { modulo: "integracoes", rotulo: "Integrações" },
  { modulo: "usuarios", rotulo: "Usuários" },
  { modulo: "parametros", rotulo: "Parâmetros" },
  { modulo: "auditoria", rotulo: "Auditoria" },
];

/**
 * Resume uma lista de módulos: "Todos", "Todos, exceto X" ou a lista.
 * `jaListados` (os que o perfil edita) saem da conta, para a consulta dizer "os demais".
 */
function resumoModulos(
  lista: string[],
  jaListados: string[] = [],
): { texto?: string; itens: string[] } {
  const universo = MODULOS_PERFIL.map((m) => m.rotulo).filter((r) => !jaListados.includes(r));
  const fora = universo.filter((r) => !lista.includes(r));
  const prefixo = jaListados.length ? "Todos os demais" : "Todos";
  if (fora.length === 0)
    return { texto: jaListados.length ? prefixo : "Todos os módulos", itens: [] };
  if (fora.length <= 3 && lista.length > 6)
    return { texto: `${prefixo}, exceto ${fora.join(", ")}`, itens: [] };
  return { itens: lista };
}

function AbaPerfis() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {PAPEIS.map((p, i) => {
        const edita = MODULOS_PERFIL.filter((m) => podeEditar(p.valor, m.modulo)).map(
          (m) => m.rotulo,
        );
        const consulta = MODULOS_PERFIL.filter(
          (m) => podeVer(p.valor, m.modulo) && !podeEditar(p.valor, m.modulo),
        ).map((m) => m.rotulo);
        // O primeiro (administrador) ocupa a linha toda: os outros 6 fecham a grade sem sobra.
        return (
          <SectionCard key={p.valor} className={cn(i === 0 && "md:col-span-2 lg:col-span-3")}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display text-base font-bold text-foreground">{p.nome}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">{p.descricao}</p>
              </div>
              {edita.length === 0 && (
                <StatusBadge size="sm" tone="neutral" dot={false}>
                  Só leitura
                </StatusBadge>
              )}
            </div>
            <div
              className={cn(
                "mt-4 grid gap-4 border-t border-border pt-4",
                i === 0 && "sm:grid-cols-2",
              )}
            >
              <ListaPermissao
                icone={Pencil}
                titulo="Pode editar"
                tom="primary"
                itens={edita}
                vazio="Nenhum módulo"
              />
              <ListaPermissao
                icone={Eye}
                titulo={edita.length ? "Só consulta" : "Pode ver"}
                tom="neutral"
                itens={consulta}
                jaListados={edita}
                vazio={edita.length ? "Nada além do que edita" : "Nenhum módulo"}
              />
            </div>
            {p.valor === "empresa" && (
              <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Vê apenas a própria empresa: bilhetes, taxas e pagamentos são filtrados no banco.
              </p>
            )}
          </SectionCard>
        );
      })}
    </div>
  );
}

function ListaPermissao({
  icone: Icone,
  titulo,
  tom,
  itens,
  jaListados,
  vazio,
}: {
  icone: typeof Eye;
  titulo: string;
  tom: "primary" | "neutral";
  itens: string[];
  jaListados?: string[];
  vazio: string;
}) {
  const resumo = resumoModulos(itens, jaListados);
  return (
    <div className="min-w-0">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        <Icone className="h-3.5 w-3.5" aria-hidden="true" /> {titulo}
      </p>
      {itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">{vazio}</p>
      ) : resumo.texto ? (
        <p className="flex items-start gap-1.5 text-sm font-medium text-foreground">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
          {resumo.texto}
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {resumo.itens.map((m) => (
            <li
              key={m}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                tom === "primary" ? "bg-primary/10 text-primary" : "bg-muted text-foreground",
              )}
            >
              {m}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------- Usuários ------------------------------- */

function AbaUsuarios({ eu, podeAlterar }: { eu: Perfil; podeAlterar: boolean }) {
  const perfis = usePerfis();
  const empresas = useEmpresas();
  const [editando, setEditando] = useState<{ perfil: Perfil; aprovar: boolean } | null>(null);

  const nomeEmpresa = (id: string | null) =>
    tituloNome(id ? empresas.data?.find((e) => e.id === id)?.razao_social : null) || "—";

  const pendentes = (perfis.data ?? []).filter((p) => !p.ativo && !p.ultimo_acesso).length;

  const columns: Column<Perfil & { id: string }>[] = [
    {
      key: "name",
      header: "Nome",
      mobile: "title",
      render: (u) => (
        <span className="font-semibold">
          {u.nome || <Vazio />}
          {u.user_id === eu.user_id && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">(você)</span>
          )}
        </span>
      ),
    },
    {
      key: "email",
      header: "E-mail",
      mobile: "subtitle",
      render: (u) => (
        <span
          className="block max-w-[16rem] truncate text-muted-foreground max-md:max-w-full"
          title={u.email}
        >
          {u.email}
        </span>
      ),
    },
    {
      key: "profile",
      header: "Perfil",
      mobile: "meta",
      render: (u) => (
        <span>
          {nomePapel(u.papel)}
          {u.papel === "empresa" && (
            <span className="block text-xs text-muted-foreground">{nomeEmpresa(u.empresa_id)}</span>
          )}
        </span>
      ),
    },
    {
      key: "last",
      header: "Último acesso",
      nowrap: true,
      mobile: "meta",
      render: (u) =>
        u.ultimo_acesso ? (
          <span className="tabular">{dataHora(u.ultimo_acesso)}</span>
        ) : (
          <span className="text-muted-foreground">Nunca</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      mobile: "badge",
      render: (u) => (
        <StatusBadge size="sm" tone={u.ativo ? "success" : u.ultimo_acesso ? "neutral" : "warning"}>
          {u.ativo ? "Ativo" : u.ultimo_acesso ? "Inativo" : "Aguardando"}
        </StatusBadge>
      ),
    },
  ];

  if (podeAlterar) {
    columns.push({
      key: "acoes",
      header: "",
      align: "right",
      mobile: "action",
      nowrap: true,
      render: (u) =>
        u.user_id === eu.user_id ? null : (
          <div className="flex justify-end gap-1.5">
            {!u.ativo && (
              <Button size="sm" onClick={() => setEditando({ perfil: u, aprovar: true })}>
                <UserCheck className="h-4 w-4" /> {u.ultimo_acesso ? "Reativar" : "Aprovar"}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditando({ perfil: u, aprovar: false })}
            >
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          </div>
        ),
    });
  }

  const rows = (perfis.data ?? []).map((p) => ({ ...p, id: p.user_id }));

  return (
    <>
      <SectionCard
        title="Usuários do sistema"
        description={
          pendentes > 0
            ? `${pendentes} ${pendentes === 1 ? "cadastro aguarda" : "cadastros aguardam"} aprovação.`
            : "Novas contas criadas na tela de login aparecem aqui para aprovação."
        }
        bodyClassName="p-0"
      >
        <QueryState isLoading={perfis.isLoading} error={perfis.error} />
        {perfis.data && (
          <DataTable columns={columns} rows={rows} emptyMessage="Nenhum usuário cadastrado." />
        )}
      </SectionCard>
      {editando && (
        <EditarUsuario
          key={editando.perfil.user_id}
          perfil={editando.perfil}
          aprovar={editando.aprovar}
          onFechar={() => setEditando(null)}
        />
      )}
    </>
  );
}

function EditarUsuario({
  perfil,
  aprovar,
  onFechar,
}: {
  perfil: Perfil;
  aprovar: boolean;
  onFechar: () => void;
}) {
  const empresas = useEmpresas();
  const atualizar = useAtualizarPerfil();
  const [papel, setPapel] = useState<Papel>(perfil.papel);
  const [empresaId, setEmpresaId] = useState<string | null>(perfil.empresa_id);
  const [ativo, setAtivo] = useState(aprovar ? true : perfil.ativo);

  const faltaEmpresa = papel === "empresa" && !empresaId;
  const empresaNome = (id: string | null) =>
    empresas.data?.find((e) => e.id === id)?.razao_social ?? "";

  async function salvar() {
    const mudancas: string[] = [];
    if (papel !== perfil.papel)
      mudancas.push(`perfil ${nomePapel(perfil.papel)} → ${nomePapel(papel)}`);
    if (papel === "empresa" && empresaId !== perfil.empresa_id)
      mudancas.push(`empresa: ${empresaNome(empresaId)}`);
    if (ativo !== perfil.ativo) mudancas.push(ativo ? "ativado" : "desativado");
    if (mudancas.length === 0) return onFechar();
    try {
      await atualizar.mutateAsync({
        perfil,
        mudancas: { papel, ativo, empresa_id: papel === "empresa" ? empresaId : null },
        descricao: `${perfil.nome || perfil.email}: ${mudancas.join(", ")}.`,
      });
      onFechar();
    } catch {
      // Mensagem exibida a partir de atualizar.error.
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{aprovar ? "Aprovar acesso" : "Editar usuário"}</DialogTitle>
          <DialogDescription>
            {perfil.nome || "Sem nome"} · {perfil.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Perfil de acesso</Label>
            <Select value={papel} onValueChange={(v) => setPapel(v as Papel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAPEIS.map((p) => (
                  <SelectItem key={p.valor} value={p.valor}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {PAPEIS.find((p) => p.valor === papel)?.descricao}
            </p>
          </div>

          {papel === "empresa" && (
            <div className="space-y-2">
              <Label>Empresa vinculada</Label>
              <Select value={empresaId ?? undefined} onValueChange={setEmpresaId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={empresas.isLoading ? "Carregando..." : "Selecione a empresa"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {(empresas.data ?? []).map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {tituloNome(e.razao_social)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                O usuário verá apenas os dados desta empresa.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/60 p-3">
            <div>
              <Label htmlFor="usuario-ativo">Acesso ativo</Label>
              <p className="text-xs text-muted-foreground">
                Contas inativas não entram no sistema.
              </p>
            </div>
            <Switch id="usuario-ativo" checked={ativo} onCheckedChange={setAtivo} />
          </div>

          {atualizar.error && (
            <p className="text-sm text-danger">
              {atualizar.error instanceof Error ? atualizar.error.message : "Falha ao salvar."}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={faltaEmpresa || atualizar.isPending}>
            {atualizar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {aprovar ? "Aprovar" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- Parâmetros ------------------------------ */

type TipoParametro = "dinheiro" | "inteiro" | "texto";

const PARAMETROS: {
  chave: string;
  rotulo: string;
  tipo: TipoParametro;
  min?: number;
  max?: number;
  /** Adorno dentro do campo: "R$" vira prefixo; os demais, sufixo. */
  sufixo?: string;
  obrigatorio?: boolean;
}[] = [
  { chave: "nome_terminal", rotulo: "Nome do terminal", tipo: "texto", obrigatorio: true },
  {
    chave: "taxa_embarque",
    rotulo: "Taxa de embarque por passageiro",
    tipo: "dinheiro",
    min: 0,
    max: 1000,
    sufixo: "R$",
  },
  {
    chave: "dia_vencimento_taxa",
    rotulo: "Dia de vencimento da taxa",
    tipo: "inteiro",
    min: 1,
    max: 28,
    sufixo: "dia",
  },
  {
    chave: "tolerancia_atraso_min",
    rotulo: "Tolerância de atraso",
    tipo: "inteiro",
    min: 0,
    max: 240,
    sufixo: "min",
    obrigatorio: true,
  },
  {
    chave: "tolerancia_conciliacao",
    rotulo: "Tolerância na conciliação",
    tipo: "inteiro",
    min: 0,
    max: 1000,
    sufixo: "passageiros",
    obrigatorio: true,
  },
];

const paraTexto = (valor: unknown) =>
  valor === null || valor === undefined ? "" : String(valor).replace(".", ",");

function validar(
  p: (typeof PARAMETROS)[number],
  texto: string,
): { valor?: unknown; erro?: string } {
  const t = texto.trim();
  if (!t) return p.obrigatorio ? { erro: "Preencha este campo." } : {};
  if (p.tipo === "texto") return { valor: t };
  // "1.234,56" ou "12,50" (padrão brasileiro) e também "12.50".
  const normal = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(p.tipo === "dinheiro" ? normal : t);
  if (!Number.isFinite(n)) return { erro: "Informe um número." };
  if (p.tipo === "inteiro" && !Number.isInteger(n)) return { erro: "Informe um número inteiro." };
  if (p.min !== undefined && n < p.min) return { erro: `Mínimo ${p.min}.` };
  if (p.max !== undefined && n > p.max) return { erro: `Máximo ${p.max}.` };
  return { valor: p.tipo === "dinheiro" ? Math.round(n * 100) / 100 : n };
}

function AbaParametros({ podeAlterar }: { podeAlterar: boolean }) {
  const configs = useConfiguracoes();
  const salvar = useSalvarConfiguracoes();
  const [form, setForm] = useState<Record<string, string>>({});
  const [salvo, setSalvo] = useState(false);

  const porChave = useMemo(
    () => new Map((configs.data ?? []).map((c) => [c.chave, c] as const)),
    [configs.data],
  );

  useEffect(() => {
    if (!configs.data) return;
    setForm(Object.fromEntries(configs.data.map((c) => [c.chave, paraTexto(c.valor)])));
  }, [configs.data]);

  const resultados = PARAMETROS.map((p) => ({ p, ...validar(p, form[p.chave] ?? "") }));
  const temErro = resultados.some((r) => r.erro);
  const alterados = resultados.filter((r) => {
    if (r.erro || r.valor === undefined) return false;
    return JSON.stringify(r.valor) !== JSON.stringify(porChave.get(r.p.chave)?.valor ?? null);
  });

  const outros = (configs.data ?? []).filter((c) => !PARAMETROS.some((p) => p.chave === c.chave));

  async function enviar() {
    setSalvo(false);
    try {
      await salvar.mutateAsync(
        alterados.map((r) => ({
          chave: r.p.chave,
          valor: r.valor,
          anterior: porChave.get(r.p.chave)?.valor ?? null,
        })),
      );
      setSalvo(true);
    } catch {
      // Mensagem exibida a partir de salvar.error.
    }
  }

  const bloqueado = temErro || alterados.length === 0 || salvar.isPending;

  return (
    <SectionCard
      title="Parâmetros do terminal"
      description={
        podeAlterar
          ? "Valores usados no faturamento das taxas, na operação e na conciliação."
          : "Somente administrador e gestor podem alterar estes valores."
      }
      bodyClassName="p-0"
    >
      <QueryState isLoading={configs.isLoading} error={configs.error} />
      {configs.data && (
        <>
          <div className="divide-y divide-border/70 px-4 sm:px-5">
            {resultados.map(({ p, erro }) => {
              const config = porChave.get(p.chave);
              const naoConfigurado = config?.valor === null || config?.valor === undefined;
              const prefixo = p.sufixo === "R$" ? p.sufixo : undefined;
              const sufixo = p.sufixo && p.sufixo !== "R$" ? p.sufixo : undefined;
              const idAjuda = `${p.chave}-ajuda`;
              return (
                <div
                  key={p.chave}
                  className="grid gap-3 py-5 md:grid-cols-[minmax(0,1fr)_18rem] md:gap-8"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Label htmlFor={p.chave} className="text-sm font-semibold">
                        {p.rotulo}
                      </Label>
                      {naoConfigurado && (
                        <StatusBadge size="sm" tone="warning">
                          Não configurado
                        </StatusBadge>
                      )}
                    </div>
                    <p
                      id={idAjuda}
                      className="mt-1 max-w-xl text-sm text-pretty text-muted-foreground"
                    >
                      {config?.descricao}
                      {p.chave === "dia_vencimento_taxa" &&
                        " Use de 1 a 28 para valer em todos os meses."}
                      {p.chave === "taxa_embarque" &&
                        typeof config?.valor === "number" &&
                        ` Atual: ${brl(config.valor)}.`}
                    </p>
                    {config?.atualizado_em && (
                      <p className="mt-1 text-xs text-muted-foreground/90">
                        Atualizado em {dataHora(config.atualizado_em)}
                      </p>
                    )}
                  </div>
                  <div className="min-w-0 md:pt-0.5">
                    <div className="relative">
                      {prefixo && (
                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium text-muted-foreground">
                          {prefixo}
                        </span>
                      )}
                      <Input
                        id={p.chave}
                        value={form[p.chave] ?? ""}
                        disabled={!podeAlterar || !config}
                        aria-describedby={idAjuda}
                        aria-invalid={erro ? true : undefined}
                        inputMode={
                          p.tipo === "texto"
                            ? "text"
                            : p.tipo === "dinheiro"
                              ? "decimal"
                              : "numeric"
                        }
                        placeholder={p.tipo === "dinheiro" ? "0,00" : ""}
                        className={cn(
                          "h-11 w-full bg-card md:h-10",
                          p.tipo !== "texto" && "tabular",
                          prefixo && "pl-10",
                          sufixo && (sufixo.length > 4 ? "pr-28" : "pr-14"),
                        )}
                        onChange={(e) => {
                          setSalvo(false);
                          setForm((f) => ({ ...f, [p.chave]: e.target.value }));
                        }}
                      />
                      {sufixo && (
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                          {sufixo}
                        </span>
                      )}
                    </div>
                    {erro && <p className="mt-1.5 text-xs text-danger">{erro}</p>}
                    {!config && (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Parâmetro ausente no banco.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {outros.length > 0 && <OutrosParametros itens={outros} />}
          </div>

          {podeAlterar && (
            <div className="flex flex-col gap-3 border-t border-border bg-muted/40 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p
                className={cn(
                  "text-sm",
                  salvar.error ? "text-danger" : salvo ? "text-success" : "text-muted-foreground",
                )}
                role="status"
              >
                {salvar.error
                  ? salvar.error instanceof Error
                    ? salvar.error.message
                    : "Falha ao salvar."
                  : salvo
                    ? "Parâmetros salvos."
                    : temErro
                      ? "Corrija os campos destacados para salvar."
                      : alterados.length > 0
                        ? `${alterados.length} ${alterados.length === 1 ? "alteração não salva" : "alterações não salvas"}.`
                        : "Nenhuma alteração."}
              </p>
              <Button onClick={enviar} disabled={bloqueado} className="max-sm:h-11 max-sm:w-full">
                {salvar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar alterações
              </Button>
            </div>
          )}
        </>
      )}
    </SectionCard>
  );
}

function OutrosParametros({ itens }: { itens: Configuracao[] }) {
  return (
    <div className="py-5">
      <p className="mb-3 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        Outros parâmetros
      </p>
      <div className="space-y-2">
        {itens.map((c) => (
          <div key={c.chave} className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
            <span className="min-w-0 break-words">
              <span className="font-medium">{c.chave}</span>
              {c.descricao && <span className="text-muted-foreground"> · {c.descricao}</span>}
            </span>
            <span className="tabular break-all text-muted-foreground">
              {c.valor === null ? "Não configurado" : JSON.stringify(c.valor)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------- Auditoria ------------------------------ */

function AbaAuditoria() {
  const [modulo, setModulo] = useState<string | null>(null);
  const [pagina, setPagina] = useState(0);
  const auditoria = useAuditoria(modulo, pagina);
  const modulos = useModulosAuditoria();

  const total = auditoria.data?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / AUDITORIA_POR_PAGINA));

  const logColumns: Column<RegistroAuditoria>[] = [
    {
      key: "date",
      header: "Data",
      nowrap: true,
      mobile: "meta",
      render: (l) => <span className="tabular">{dataHora(l.ocorrido_em)}</span>,
    },
    {
      key: "user",
      header: "Usuário",
      mobile: "subtitle",
      render: (l) => l.usuario || <span className="text-muted-foreground">Sistema</span>,
    },
    {
      key: "action",
      header: "Ação",
      mobile: "badge",
      render: (l) => (
        <StatusBadge size="sm" tone="info" dot={false}>
          {l.acao}
        </StatusBadge>
      ),
    },
    { key: "module", header: "Módulo", nowrap: true, mobile: "meta", render: (l) => l.modulo },
    {
      key: "desc",
      header: "Descrição",
      mobile: "title",
      cellClassName: "min-w-[16rem]",
      render: (l) => (
        <span className="text-muted-foreground max-md:font-medium max-md:text-foreground">
          {l.descricao}
        </span>
      ),
    },
  ];

  return (
    <>
      <FilterBar>
        <FilterSelect
          value={modulo ?? "todos"}
          onValueChange={(v) => {
            setModulo(v === "todos" ? null : v);
            setPagina(0);
          }}
          aria-label="Módulo"
          allLabel="Todos os módulos"
          options={(modulos.data ?? []).map((m) => ({ value: m, label: m }))}
        />
      </FilterBar>
      <SectionCard
        title="Log de auditoria"
        description="Ações registradas pelos usuários do sistema."
        bodyClassName="p-0"
      >
        <QueryState isLoading={auditoria.isLoading} error={auditoria.error} />
        {auditoria.data && (
          <>
            <DataTable
              columns={logColumns}
              rows={auditoria.data.registros}
              emptyMessage="Nenhuma ação registrada ainda. As ações dos usuários (cadastros, alterações, pagamentos) aparecem aqui."
            />
            {total > AUDITORIA_POR_PAGINA && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm sm:px-5">
                <span className="text-muted-foreground">
                  Página {pagina + 1} de {paginas} · {total} registros
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pagina === 0 || auditoria.isFetching}
                    onClick={() => setPagina((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" /> Anterior
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pagina + 1 >= paginas || auditoria.isFetching}
                    onClick={() => setPagina((p) => p + 1)}
                  >
                    Próxima <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </SectionCard>
    </>
  );
}
