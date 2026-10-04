import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Pencil, UserCheck } from "lucide-react";
import {
  DataTable,
  PageHeader,
  QueryState,
  SectionCard,
  StatusBadge,
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
} from "@/services/acesso";
import type { Configuracao, Papel, Perfil, RegistroAuditoria } from "@/services/gestao-tipos";
import { brl, dataHora } from "@/lib/format";

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
      <PageHeader title="Configurações" subtitle="Parâmetros do sistema, acessos e auditoria" />

      <Tabs defaultValue={abaInicial}>
        <TabsList className="flex-wrap">
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PAPEIS.map((p) => (
              <SectionCard key={p.valor}>
                <h3 className="font-display text-base font-bold">{p.nome}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.descricao}</p>
              </SectionCard>
            ))}
          </div>
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

/* -------------------------------- Usuários ------------------------------- */

function AbaUsuarios({ eu, podeAlterar }: { eu: Perfil; podeAlterar: boolean }) {
  const perfis = usePerfis();
  const empresas = useEmpresas();
  const [editando, setEditando] = useState<{ perfil: Perfil; aprovar: boolean } | null>(null);

  const nomeEmpresa = (id: string | null) =>
    (id && empresas.data?.find((e) => e.id === id)?.razao_social) || "—";

  const pendentes = (perfis.data ?? []).filter((p) => !p.ativo && !p.ultimo_acesso).length;

  const columns: Column<Perfil & { id: string }>[] = [
    {
      key: "name",
      header: "Nome",
      render: (u) => (
        <span className="font-semibold">
          {u.nome || "—"}
          {u.user_id === eu.user_id && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">(você)</span>
          )}
        </span>
      ),
    },
    {
      key: "email",
      header: "E-mail",
      render: (u) => <span className="text-muted-foreground">{u.email}</span>,
    },
    {
      key: "profile",
      header: "Perfil",
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
      render: (u) => (
        <span className="tabular">{u.ultimo_acesso ? dataHora(u.ultimo_acesso) : "Nunca"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (u) => (
        <StatusBadge tone={u.ativo ? "success" : u.ultimo_acesso ? "neutral" : "warning"}>
          {u.ativo ? "Ativo" : u.ultimo_acesso ? "Inativo" : "Aguardando aprovação"}
        </StatusBadge>
      ),
    },
  ];

  if (podeAlterar) {
    columns.push({
      key: "acoes",
      header: "",
      align: "right",
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
                      {e.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                O usuário verá apenas os dados desta empresa.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
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

  return (
    <SectionCard
      title="Parâmetros do terminal"
      description={
        podeAlterar
          ? "Valores usados no faturamento das taxas, na operação e na conciliação."
          : "Somente administrador e gestor podem alterar estes valores."
      }
      actions={
        podeAlterar && (
          <Button onClick={enviar} disabled={temErro || alterados.length === 0 || salvar.isPending}>
            {salvar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar alterações
          </Button>
        )
      }
    >
      <QueryState isLoading={configs.isLoading} error={configs.error} />
      {configs.data && (
        <div className="space-y-4">
          {resultados.map(({ p, erro }) => {
            const config = porChave.get(p.chave);
            const naoConfigurado = config?.valor === null || config?.valor === undefined;
            return (
              <div
                key={p.chave}
                className="grid gap-2 border-b border-border/60 pb-4 last:border-0 md:grid-cols-[1fr_16rem] md:items-start"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Label htmlFor={p.chave}>{p.rotulo}</Label>
                    {naoConfigurado && <StatusBadge tone="warning">Não configurado</StatusBadge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {config?.descricao}
                    {p.chave === "dia_vencimento_taxa" &&
                      " Use de 1 a 28 para valer em todos os meses."}
                    {p.chave === "taxa_embarque" &&
                      typeof config?.valor === "number" &&
                      ` Atual: ${brl(config.valor)}.`}
                  </p>
                  {config?.atualizado_em && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Atualizado em {dataHora(config.atualizado_em)}
                    </p>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    {p.sufixo === "R$" && <span className="text-sm text-muted-foreground">R$</span>}
                    <Input
                      id={p.chave}
                      value={form[p.chave] ?? ""}
                      disabled={!podeAlterar || !config}
                      inputMode={
                        p.tipo === "texto" ? "text" : p.tipo === "dinheiro" ? "decimal" : "numeric"
                      }
                      placeholder={p.tipo === "dinheiro" ? "0,00" : ""}
                      onChange={(e) => {
                        setSalvo(false);
                        setForm((f) => ({ ...f, [p.chave]: e.target.value }));
                      }}
                    />
                    {p.sufixo && p.sufixo !== "R$" && (
                      <span className="text-sm whitespace-nowrap text-muted-foreground">
                        {p.sufixo}
                      </span>
                    )}
                  </div>
                  {erro && <p className="mt-1 text-xs text-danger">{erro}</p>}
                  {!config && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Parâmetro ausente no banco.
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {outros.length > 0 && <OutrosParametros itens={outros} />}

          {salvar.error && (
            <p className="text-sm text-danger">
              {salvar.error instanceof Error ? salvar.error.message : "Falha ao salvar."}
            </p>
          )}
          {salvo && <p className="text-sm text-success">Parâmetros salvos.</p>}
        </div>
      )}
    </SectionCard>
  );
}

function OutrosParametros({ itens }: { itens: Configuracao[] }) {
  return (
    <div className="pt-2">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
        Outros parâmetros
      </p>
      <div className="space-y-2">
        {itens.map((c) => (
          <div key={c.chave} className="flex flex-wrap justify-between gap-2 text-sm">
            <span>
              <span className="font-medium">{c.chave}</span>
              {c.descricao && <span className="text-muted-foreground"> · {c.descricao}</span>}
            </span>
            <span className="tabular text-muted-foreground">
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
      render: (l) => <span className="tabular whitespace-nowrap">{dataHora(l.ocorrido_em)}</span>,
    },
    { key: "user", header: "Usuário", render: (l) => l.usuario || "Sistema" },
    {
      key: "action",
      header: "Ação",
      render: (l) => (
        <StatusBadge tone="info" dot={false}>
          {l.acao}
        </StatusBadge>
      ),
    },
    { key: "module", header: "Módulo", render: (l) => l.modulo },
    {
      key: "desc",
      header: "Descrição",
      render: (l) => <span className="text-muted-foreground">{l.descricao}</span>,
    },
  ];

  return (
    <SectionCard
      title="Log de auditoria"
      description="Ações registradas pelos usuários do sistema."
      bodyClassName="p-0"
      actions={
        <Select
          value={modulo ?? "todos"}
          onValueChange={(v) => {
            setModulo(v === "todos" ? null : v);
            setPagina(0);
          }}
        >
          <SelectTrigger className="h-9 w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os módulos</SelectItem>
            {(modulos.data ?? []).map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
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
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
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
  );
}
