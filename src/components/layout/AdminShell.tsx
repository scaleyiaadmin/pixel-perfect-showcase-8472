import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Bell,
  Bus,
  Building2,
  ChevronDown,
  Cog,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorPlay,
  Plug,
  Scan,
  Search,
  ScrollText,
  SearchCheck,
  Ticket,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PrefeituraLogo, SisRodovLogo } from "@/components/brand/Logos";
import { useEmpresas, useLinhas } from "@/services/dados-publicos";
import {
  iniciais,
  moduloDaRota,
  nomePapel,
  podeVer,
  usePerfil,
  usePerfis,
  useSair,
} from "@/services/acesso";
import { getSupabase } from "@/lib/supabase";
import { hojeISO, hora, tituloNome } from "@/lib/format";
import type { Bilhete, Papel, Viagem } from "@/services/gestao-tipos";

type NavItem = {
  label: string;
  to: string;
  icon: typeof Bus;
  children?: { label: string; to: string }[];
};

const navigation: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  {
    label: "Operação",
    to: "/operacao/viagens",
    icon: Bus,
    children: [
      { label: "Viagens", to: "/operacao/viagens" },
      { label: "Embarques", to: "/operacao/embarques" },
      { label: "Horários", to: "/operacao/horarios" },
      { label: "Linhas", to: "/operacao/linhas" },
      { label: "Destinos", to: "/operacao/destinos" },
      { label: "Plataformas", to: "/operacao/plataformas" },
    ],
  },
  { label: "Painel da Rodoviária", to: "/painel", icon: MonitorPlay },
  { label: "Passagens", to: "/passagens", icon: Ticket },
  { label: "Controle de Embarque", to: "/controle-embarque", icon: Scan },
  { label: "Conciliação 360°", to: "/conciliacao", icon: SearchCheck },
  { label: "Empresas", to: "/empresas", icon: Building2 },
  {
    label: "Financeiro",
    to: "/financeiro/taxas",
    icon: Wallet,
    children: [
      { label: "Taxas", to: "/financeiro/taxas" },
      { label: "Pagamentos", to: "/financeiro/pagamentos" },
      { label: "Pendências", to: "/financeiro/pendencias" },
      { label: "Inadimplência", to: "/financeiro/inadimplencia" },
    ],
  },
  { label: "Relatórios", to: "/relatorios", icon: ScrollText },
  { label: "Integrações", to: "/integracoes", icon: Plug },
  { label: "Configurações", to: "/configuracoes", icon: Cog },
];

type ResultadoBusca = {
  viagens: Pick<Viagem, "id" | "numero" | "destino" | "previsto_em">[];
  passagens: Pick<Bilhete, "id" | "codigo" | "destino">[];
};

/** Busca no banco (viagens de hoje e bilhetes), com espera curta entre as teclas. */
function useBuscaNoBanco(termo: string, papel: Papel | null) {
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setQ(termo.trim()), 300);
    return () => window.clearTimeout(t);
  }, [termo]);
  const verViagens = podeVer(papel, "operacao");
  const verPassagens = podeVer(papel, "passagens");
  return useQuery({
    queryKey: ["busca-global", q, verViagens, verPassagens],
    enabled: q.length >= 2 && (verViagens || verPassagens),
    staleTime: 30_000,
    queryFn: async (): Promise<ResultadoBusca> => {
      const db = getSupabase();
      // Remove caracteres que têm significado no filtro do PostgREST.
      const like = `%${q.replace(/[%_,()*]/g, " ")}%`;
      const [viagens, passagens] = await Promise.all([
        verViagens
          ? db
              .from("viagens")
              .select("id, numero, destino, previsto_em")
              .eq("data", hojeISO())
              .or(`numero.ilike.${like},destino.ilike.${like}`)
              .order("previsto_em")
              .limit(4)
          : null,
        verPassagens
          ? db.from("bilhetes").select("id, codigo, destino").ilike("codigo", like).limit(3)
          : null,
      ]);
      if (viagens?.error) throw viagens.error;
      if (passagens?.error) throw passagens.error;
      return {
        viagens: (viagens?.data ?? []) as ResultadoBusca["viagens"],
        passagens: (passagens?.data ?? []) as ResultadoBusca["passagens"],
      };
    },
  });
}

/** Resultados da busca global (empresas e destinos filtrados aqui; viagens e passagens no banco). */
function useResultadosBusca(term: string, papel: Papel | null) {
  const empresas = useEmpresas();
  const linhas = useLinhas();
  const busca = useBuscaNoBanco(term, papel);

  const results = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (q.length < 2) return null;
    return {
      viagens: busca.data?.viagens ?? [],
      empresas:
        podeVer(papel, "empresas") && papel !== "empresa"
          ? (empresas.data ?? [])
              .filter((c) => c.razao_social.toLowerCase().includes(q))
              .slice(0, 3)
          : [],
      passagens: busca.data?.passagens ?? [],
      destinos: podeVer(papel, "operacao")
        ? [...new Set((linhas.data ?? []).flatMap((l) => l.cidades_atendidas))]
            .filter((d) => d.toLowerCase().includes(q))
            .slice(0, 3)
        : [],
    };
  }, [term, empresas.data, linhas.data, busca.data, papel]);

  const total = results
    ? results.viagens.length +
      results.empresas.length +
      results.passagens.length +
      results.destinos.length
    : 0;

  return { results, total, busca };
}

const PLACEHOLDER_BUSCA = "Buscar empresa, viagem, destino ou passagem";
const itemBusca =
  "flex min-h-10 items-center justify-between gap-3 px-4 py-2 text-sm hover:bg-muted focus-visible:bg-muted";

function ResultadosBusca({ results, total, busca }: ReturnType<typeof useResultadosBusca>) {
  if (!results) return null;
  return (
    <>
      {total === 0 && (
        <p className="px-4 py-5 text-sm text-muted-foreground">
          {busca.isFetching ? "Buscando..." : busca.error ? "Falha na busca." : "Nenhum resultado."}
        </p>
      )}
      {results.viagens.length > 0 && (
        <SearchGroup title="Viagens de hoje">
          {results.viagens.map((t) => (
            <Link
              key={t.id}
              to="/operacao/viagens/$tripId"
              params={{ tripId: t.id }}
              className={itemBusca}
            >
              <span className="min-w-0 truncate">
                {t.previsto_em ? `${hora(t.previsto_em)} · ` : ""}
                {tituloNome(t.destino)}
              </span>
              {t.numero && (
                <span className="tabular shrink-0 text-xs text-muted-foreground">#{t.numero}</span>
              )}
            </Link>
          ))}
        </SearchGroup>
      )}
      {results.empresas.length > 0 && (
        <SearchGroup title="Empresas">
          {results.empresas.map((c) => (
            <Link
              key={c.id}
              to="/empresas/$companyId"
              params={{ companyId: c.id }}
              className={itemBusca}
            >
              <span className="min-w-0 truncate">{tituloNome(c.razao_social)}</span>
            </Link>
          ))}
        </SearchGroup>
      )}
      {results.passagens.length > 0 && (
        <SearchGroup title="Passagens">
          {results.passagens.map((t) => (
            <Link key={t.id} to="/passagens" className={itemBusca}>
              <span className="min-w-0 truncate">
                {t.codigo}
                {t.destino ? ` · ${tituloNome(t.destino)}` : ""}
              </span>
            </Link>
          ))}
        </SearchGroup>
      )}
      {results.destinos.length > 0 && (
        <SearchGroup title="Destinos">
          {results.destinos.map((d) => (
            <Link key={d} to="/operacao/destinos" className={itemBusca}>
              <span className="min-w-0 truncate">{tituloNome(d)}</span>
            </Link>
          ))}
        </SearchGroup>
      )}
    </>
  );
}

/** Busca global inline (a partir de md). */
function GlobalSearch({ papel }: { papel: Papel | null }) {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const resultado = useResultadosBusca(term, papel);

  return (
    <div className="relative hidden max-w-xl flex-1 md:block">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        placeholder={`${PLACEHOLDER_BUSCA}...`}
        aria-label={PLACEHOLDER_BUSCA}
        className="h-9 border-transparent bg-muted pl-9 shadow-none focus-visible:border-input focus-visible:bg-card"
      />
      {open && resultado.results && (
        <div className="absolute top-11 left-0 z-50 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-[var(--shadow-raised)]">
          <ResultadosBusca {...resultado} />
        </div>
      )}
    </div>
  );
}

/** Busca global no celular: botão de lupa que abre um painel no topo. */
function BuscaCelular({ papel }: { papel: Papel | null }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const resultado = useResultadosBusca(term, papel);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button variant="ghost" size="icon" className="h-11 w-11 md:hidden" aria-label="Buscar">
          <Search className="h-5 w-5" />
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 top-0 z-50 flex max-h-[85dvh] flex-col border-b border-border bg-card shadow-[var(--shadow-raised)] data-[state=open]:animate-in data-[state=open]:slide-in-from-top-4"
        >
          <DialogPrimitive.Title className="sr-only">Busca</DialogPrimitive.Title>
          <div className="flex items-center gap-2 p-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                type="search"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Empresa, viagem, destino..."
                aria-label={PLACEHOLDER_BUSCA}
                className="h-11 pl-9 text-base"
              />
            </div>
            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 shrink-0"
                aria-label="Fechar busca"
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogPrimitive.Close>
          </div>
          {/* Fecha ao escolher um resultado. */}
          <div
            className="overflow-y-auto border-t border-border empty:hidden"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a")) setOpen(false);
            }}
          >
            {resultado.results ? (
              <ResultadosBusca {...resultado} />
            ) : (
              <p className="px-4 py-4 text-sm text-muted-foreground">
                Digite ao menos 2 letras para buscar.
              </p>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function SearchGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-border last:border-0">
      <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

/** Itens do menu que o papel do usuário acessa. */
function menuDoPapel(papel: Papel | null): NavItem[] {
  return navigation.filter((item) => {
    const modulo = moduloDaRota(item.to);
    return !modulo || podeVer(papel, modulo);
  });
}

function useUsuarioLogado() {
  const { perfil, sessao } = usePerfil();
  const nome = perfil?.nome || sessao?.user.email?.split("@")[0] || "";
  const email = perfil?.email ?? sessao?.user.email ?? "";
  return {
    perfil,
    papel: perfil?.ativo ? perfil.papel : null,
    nome,
    email,
    iniciais: iniciais(perfil?.nome ?? "", email),
    papelNome: nomePapel(perfil?.papel),
  };
}

function useSairEVoltar() {
  const navigate = useNavigate();
  const sairDaConta = useSair();
  return async () => {
    await sairDaConta();
    navigate({ to: "/" });
  };
}

function SidebarContent({
  onNavigate,
  onClose,
}: {
  onNavigate?: () => void;
  /** Presente no drawer do celular: mostra o botão de fechar dentro da sidebar. */
  onClose?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const usuario = useUsuarioLogado();
  const sairEVoltar = useSairEVoltar();
  const drawer = Boolean(onClose);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-sidebar-border px-4 py-4">
        <SisRodovLogo inverted subtitle="Nova Rodoviária de Manhuaçu" />
        {onClose && (
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Só a navegação rola; topo e usuário ficam fixos. */}
      <nav
        aria-label="Menu principal"
        className="scrollbar-dark min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 py-3"
      >
        {menuDoPapel(usuario.papel).map((item) => {
          const active =
            pathname === item.to ||
            (item.children?.some((c) => pathname.startsWith(c.to)) ?? false) ||
            (item.to !== "/dashboard" && pathname.startsWith(item.to));
          return (
            <div key={item.label}>
              <Link
                to={item.to}
                onClick={onNavigate}
                aria-current={active && !item.children ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                  drawer ? "min-h-11" : "min-h-9 py-2",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-sidebar-primary"
                    : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon
                  className={cn(
                    "h-[1.125rem] w-[1.125rem] shrink-0",
                    active && "text-sidebar-primary",
                  )}
                />
                <span className="truncate">{item.label}</span>
              </Link>
              {item.children && active && (
                <div className="mt-0.5 mb-1.5 ml-[1.375rem] space-y-0.5 border-l border-sidebar-border pl-3">
                  {item.children.map((child) => {
                    const ativo = pathname.startsWith(child.to);
                    return (
                      <Link
                        key={child.to}
                        to={child.to}
                        onClick={onNavigate}
                        aria-current={ativo ? "page" : undefined}
                        className={cn(
                          "flex items-center rounded-md px-2.5 text-[0.8125rem] transition-colors",
                          drawer ? "min-h-10" : "min-h-8 py-1.5",
                          ativo
                            ? "bg-sidebar-primary/15 font-semibold text-sidebar-primary"
                            : "text-sidebar-foreground/75 hover:text-sidebar-accent-foreground",
                        )}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <a
          href="/painel"
          target="_blank"
          rel="noreferrer"
          className={cn(
            "mt-2 flex items-center gap-3 rounded-lg px-3 text-[0.8125rem] font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            drawer ? "min-h-11" : "min-h-9 py-2",
          )}
        >
          <ExternalLink className="h-4 w-4 shrink-0" /> Abrir painel público
          <span className="sr-only">(abre em nova aba)</span>
        </a>
      </nav>

      {/* Usuário compacto: avatar + nome + papel; sair discreto (também no menu do header). */}
      <div className="flex shrink-0 items-center gap-3 border-t border-sidebar-border px-4 py-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
          {usuario.iniciais}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">
            {usuario.nome}
          </p>
          <p className="truncate text-xs text-sidebar-foreground/70">{usuario.papelNome}</p>
        </div>
        <button
          type="button"
          aria-label="Sair"
          title="Sair"
          onClick={() => {
            onNavigate?.();
            sairEVoltar();
          }}
          className={cn(
            "grid shrink-0 place-items-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            drawer ? "h-11 w-11" : "h-8 w-8",
          )}
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Avisos reais: hoje, só cadastros aguardando aprovação (contas sem nenhum acesso), para o administrador. */
function Notificacoes() {
  const { papel } = useUsuarioLogado();
  const admin = papel === "administrador";
  const perfis = usePerfis(admin);
  if (!admin) return null;
  const pendentes = (perfis.data ?? []).filter((p) => !p.ativo && !p.ultimo_acesso);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="h-5 w-5" />
          {pendentes.length > 0 && (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-danger" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notificações</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {pendentes.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">Nenhuma pendência.</p>
        ) : (
          <DropdownMenuItem asChild className="flex-col items-start gap-0.5 py-2.5">
            <Link to="/configuracoes">
              <span className="text-sm font-medium">
                {pendentes.length === 1
                  ? "1 cadastro aguardando aprovação"
                  : `${pendentes.length} cadastros aguardando aprovação`}
              </span>
              <span className="text-xs text-muted-foreground">
                Aprove ou recuse em Configurações → Usuários.
              </span>
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const usuario = useUsuarioLogado();
  const sairEVoltar = useSairEVoltar();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-[17rem] shrink-0 lg:block">
        <SidebarContent />
      </aside>

      {/* Drawer do celular/tablet (foco preso, Esc fecha, X dentro da sidebar). */}
      <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/45 data-[state=open]:animate-in data-[state=open]:fade-in-0 lg:hidden" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 w-[min(18rem,85vw)] shadow-[var(--shadow-raised)] data-[state=open]:animate-in data-[state=open]:slide-in-from-left lg:hidden"
          >
            <DialogPrimitive.Title className="sr-only">Menu</DialogPrimitive.Title>
            <SidebarContent
              onNavigate={() => setMobileOpen(false)}
              onClose={() => setMobileOpen(false)}
            />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-1 border-b border-border bg-card/95 px-2 backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:gap-2 md:h-16 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Identidade no header só quando a sidebar está escondida. */}
          <Link
            to="/dashboard"
            className="mr-2 flex min-w-0 items-center rounded-lg lg:hidden"
            aria-label="SisRodov — início"
          >
            <SisRodovLogo size="sm" subtitle="" />
          </Link>

          <GlobalSearch papel={usuario.papel} />

          <div className="ml-auto flex items-center gap-0.5 sm:gap-1.5">
            <BuscaCelular papel={usuario.papel} />
            <Notificacoes />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex min-h-11 items-center gap-2 rounded-lg px-1.5 transition-colors hover:bg-muted sm:px-2"
                  aria-label={`Conta de ${usuario.nome}`}
                >
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {usuario.iniciais}
                  </div>
                  <div className="hidden text-left leading-tight sm:block">
                    <p className="max-w-[12rem] truncate text-sm font-semibold">{usuario.nome}</p>
                    <p className="text-[11px] text-muted-foreground">{usuario.papelNome}</p>
                  </div>
                  <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="leading-tight">
                  <span className="block truncate">{usuario.nome}</span>
                  <span className="block truncate text-xs font-normal text-muted-foreground">
                    {usuario.email}
                  </span>
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    {usuario.papelNome}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {podeVer(usuario.papel, "configuracoes") && (
                  <DropdownMenuItem asChild>
                    <Link to="/configuracoes">
                      <Cog className="h-4 w-4" /> Configurações
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => sairEVoltar()}>
                  <LogOut className="h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-6 md:py-8 lg:px-8">{children}</main>

        <footer className="flex flex-col gap-3 border-t border-border px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-6 lg:px-8">
          <p className="max-w-2xl text-pretty">
            SisRodov · Sistema Municipal de Gestão e Controle do Terminal Rodoviário de Manhuaçu.
            Linhas e horários oficiais da ANTT e do DER-MG.
          </p>
          <PrefeituraLogo size="sm" className="shrink-0 opacity-80" />
        </footer>
      </div>
    </div>
  );
}
