import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  Banknote,
  Bell,
  Bus,
  Building2,
  ChevronLeft,
  ClipboardList,
  Clock,
  Cog,
  DoorOpen,
  ExternalLink,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  MapPin,
  Menu,
  MonitorPlay,
  MoreHorizontal,
  Plug,
  Receipt,
  Route as RouteIcon,
  Scan,
  Search,
  ScrollText,
  SearchCheck,
  Ticket,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MarcaSisRodovPrefeitura, SisRodovLogo } from "@/components/brand/Logos";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
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
import { cidadeNome, hojeISO, hora, tituloNome } from "@/lib/format";
import type { Bilhete, Papel, Viagem } from "@/services/gestao-tipos";

type NavItem = {
  label: string;
  to: string;
  icon: typeof Bus;
  /** Rótulo curto na barra inferior do celular. */
  curto?: string;
};

type NavSecao = { titulo?: string; itens: NavItem[] };

/**
 * Menu em seções (como no ERP): itens planos com divisórias rotuladas.
 * A permissão de cada item vem da rota (moduloDaRota + podeVer).
 */
const navigation: NavSecao[] = [
  {
    itens: [
      { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, curto: "Início" },
      { label: "Painel da Rodoviária", to: "/painel", icon: MonitorPlay, curto: "Painel" },
    ],
  },
  {
    titulo: "Operação",
    itens: [
      { label: "Viagens", to: "/operacao/viagens", icon: Bus },
      { label: "Embarques", to: "/operacao/embarques", icon: DoorOpen },
      { label: "Horários", to: "/operacao/horarios", icon: Clock },
      { label: "Linhas", to: "/operacao/linhas", icon: RouteIcon },
      { label: "Destinos", to: "/operacao/destinos", icon: MapPin },
      { label: "Plataformas", to: "/operacao/plataformas", icon: LayoutGrid },
      { label: "Passagens", to: "/passagens", icon: Ticket },
      { label: "Controle de Embarque", to: "/controle-embarque", icon: Scan, curto: "Embarque" },
    ],
  },
  {
    titulo: "Financeiro",
    itens: [
      { label: "Taxas", to: "/financeiro/taxas", icon: Receipt },
      { label: "Pagamentos", to: "/financeiro/pagamentos", icon: Banknote },
      { label: "Pendências", to: "/financeiro/pendencias", icon: ClipboardList },
      { label: "Inadimplência", to: "/financeiro/inadimplencia", icon: AlertTriangle },
      { label: "Conciliação 360°", to: "/conciliacao", icon: SearchCheck, curto: "Conciliação" },
    ],
  },
  {
    titulo: "Administração",
    itens: [
      { label: "Empresas", to: "/empresas", icon: Building2 },
      { label: "Relatórios", to: "/relatorios", icon: ScrollText },
      { label: "Integrações", to: "/integracoes", icon: Plug },
      { label: "Configurações", to: "/configuracoes", icon: Cog },
    ],
  },
];

/** Ordem de prioridade dos atalhos da barra inferior do celular (até 4 + "Mais"). */
const PRIORIDADE_CELULAR = [
  "/dashboard",
  "/operacao/viagens",
  "/controle-embarque",
  "/financeiro/taxas",
  "/empresas",
  "/passagens",
  "/relatorios",
];

const itemAtivo = (pathname: string, to: string) =>
  pathname === to || pathname.startsWith(`${to}/`);

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
                {cidadeNome(t.destino)}
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
                {t.destino ? ` · ${cidadeNome(t.destino)}` : ""}
              </span>
            </Link>
          ))}
        </SearchGroup>
      )}
      {results.destinos.length > 0 && (
        <SearchGroup title="Destinos">
          {results.destinos.map((d) => (
            <Link key={d} to="/operacao/destinos" className={itemBusca}>
              <span className="min-w-0 truncate">{cidadeNome(d)}</span>
            </Link>
          ))}
        </SearchGroup>
      )}
    </>
  );
}

/** Busca global inline (a partir de md): pílula "Buscar aqui…" à direita do header. */
function GlobalSearch({ papel }: { papel: Papel | null }) {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const resultado = useResultadosBusca(term, papel);

  return (
    <div className="relative hidden md:block">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar aqui…"
        title={PLACEHOLDER_BUSCA}
        aria-label={PLACEHOLDER_BUSCA}
        className="h-9 w-56 rounded-full border-border/80 pl-10 text-sm shadow-none transition-[width,border-color,box-shadow] focus-visible:w-80 lg:w-60"
      />
      {open && resultado.results && (
        <div className="absolute top-11 right-0 z-50 w-[22rem] overflow-hidden rounded-xl border border-border/70 bg-popover shadow-[var(--shadow-raised)]">
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
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-xl text-muted-foreground md:hidden"
          aria-label="Buscar"
        >
          <Search className="h-5 w-5" />
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
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

/** Seções do menu com só os itens que o papel do usuário acessa (seções vazias somem). */
function menuDoPapel(papel: Papel | null): NavSecao[] {
  return navigation
    .map((secao) => ({
      ...secao,
      itens: secao.itens.filter((item) => {
        const modulo = moduloDaRota(item.to);
        return !modulo || podeVer(papel, modulo);
      }),
    }))
    .filter((secao) => secao.itens.length > 0);
}

/** Divisória de seção: rótulo minúsculo centralizado entre duas linhas. */
function Divisoria({ titulo, recolhido }: { titulo: string; recolhido?: boolean }) {
  if (recolhido)
    return <div className="mx-3 my-3 border-t border-black/[0.08] dark:border-white/[0.07]" />;
  return (
    <div className="flex items-center gap-2 px-3 pt-5 pb-1.5" role="presentation">
      <span className="h-px flex-1 bg-black/[0.09] dark:bg-white/[0.08]" />
      <span className="text-[0.625rem] font-semibold tracking-widest whitespace-nowrap text-sidebar-foreground/55 uppercase">
        {titulo}
      </span>
      <span className="h-px flex-1 bg-black/[0.09] dark:bg-white/[0.08]" />
    </div>
  );
}

function SidebarContent({
  onNavigate,
  onClose,
  recolhido = false,
  onAlternar,
}: {
  onNavigate?: () => void;
  /** Presente no drawer do celular: mostra o botão de fechar dentro da sidebar. */
  onClose?: () => void;
  /** Desktop: só ícones (com dica ao passar o mouse). */
  recolhido?: boolean;
  onAlternar?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const usuario = useUsuarioLogado();
  const sairEVoltar = useSairEVoltar();
  const drawer = Boolean(onClose);

  const link = (item: NavItem) => {
    const active = itemAtivo(pathname, item.to);
    const el = (
      <Link
        key={item.to}
        to={item.to}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        aria-label={recolhido ? item.label : undefined}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 text-[0.8125rem] font-medium transition-colors duration-150",
          drawer ? "min-h-11" : "min-h-9 py-2",
          recolhido && "justify-center px-0",
          active
            ? "bg-primary text-primary-foreground shadow-[var(--shadow-xs)]"
            : "text-sidebar-foreground/75 hover:bg-black/[0.06] hover:text-sidebar-foreground dark:hover:bg-white/[0.06]",
        )}
      >
        <item.icon
          className={cn("h-[1.0625rem] w-[1.0625rem] shrink-0", !active && "opacity-70")}
          aria-hidden="true"
        />
        {!recolhido && <span className="truncate">{item.label}</span>}
      </Link>
    );
    if (!recolhido) return el;
    return (
      <Tooltip key={item.to} delayDuration={0}>
        <TooltipTrigger asChild>{el}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div className="group/sidebar relative flex h-full flex-col border-r border-black/[0.07] bg-sidebar text-sidebar-foreground dark:border-white/[0.06]">
      {/* Marca no topo (como o logo do ERP): SisRodov | Prefeitura. */}
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center border-b border-black/[0.07] dark:border-white/[0.06]",
          recolhido ? "h-16 px-2" : drawer ? "h-20 justify-start pr-12 pl-4" : "h-24 px-3.5",
        )}
      >
        {recolhido ? (
          <SisRodovLogo compact />
        ) : (
          <Link
            to="/dashboard"
            onClick={onNavigate}
            className="flex min-w-0 justify-center rounded-lg"
            aria-label="SisRodov — início"
          >
            {/* No drawer (escala 100%) o lockup é reduzido para caber ao lado do X. */}
            <MarcaSisRodovPrefeitura size="md" className={drawer ? "[zoom:0.74]" : undefined} />
          </Link>
        )}
        {onClose && (
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={onClose}
            className="absolute top-1/2 right-1 grid h-11 w-11 shrink-0 -translate-y-1/2 place-items-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-black/[0.06] hover:text-sidebar-foreground dark:hover:bg-white/[0.06]"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Só a navegação rola; a barra aparece apenas com o mouse em cima. */}
      <nav
        aria-label="Menu principal"
        className={cn(
          "scrollbar-hover min-h-0 flex-1 overflow-y-auto py-3",
          recolhido ? "px-2" : "px-3",
        )}
      >
        {menuDoPapel(usuario.papel).map((secao, i) => (
          <div key={secao.titulo ?? i}>
            {secao.titulo && <Divisoria titulo={secao.titulo} recolhido={recolhido} />}
            <div className="space-y-0.5">{secao.itens.map(link)}</div>
          </div>
        ))}

        {!recolhido && (
          <a
            href="/painel"
            target="_blank"
            rel="noreferrer"
            className={cn(
              "mt-4 flex items-center gap-3 rounded-lg px-3 text-xs font-medium text-sidebar-foreground/70 transition-colors hover:bg-black/[0.06] hover:text-sidebar-foreground dark:hover:bg-white/[0.06]",
              drawer ? "min-h-11" : "min-h-8 py-1.5",
            )}
          >
            <ExternalLink className="h-4 w-4 shrink-0 opacity-70" /> Abrir painel público
            <span className="sr-only">(abre em nova aba)</span>
          </a>
        )}
      </nav>

      {/* No drawer: usuário + sair (no desktop isso fica no avatar do header). */}
      {drawer && (
        <div className="flex shrink-0 items-center gap-3 border-t border-black/[0.07] px-4 py-3 dark:border-white/[0.06]">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-xs font-bold text-primary-foreground">
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
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-black/[0.06] hover:text-sidebar-foreground dark:hover:bg-white/[0.06]"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Recolher/expandir: aba na borda da sidebar, aparece com o mouse em cima. */}
      {onAlternar && (
        <button
          type="button"
          onClick={onAlternar}
          aria-label={recolhido ? "Expandir menu" : "Recolher menu"}
          title={recolhido ? "Expandir menu" : "Recolher menu"}
          className={cn(
            "absolute top-1/2 left-full z-50 -ml-px flex h-12 w-3.5 -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 border-black/[0.07] bg-sidebar text-sidebar-foreground/50 transition-all duration-200 hover:w-4 hover:text-primary dark:border-white/[0.06]",
            "pointer-events-none opacity-0 group-hover/sidebar:pointer-events-auto group-hover/sidebar:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100",
          )}
        >
          <ChevronLeft
            className={cn("h-3 w-3 transition-transform duration-300", recolhido && "rotate-180")}
          />
        </button>
      )}
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
        <Button
          variant="ghost"
          size="icon"
          className="relative h-11 w-11 rounded-xl text-muted-foreground md:h-9 md:w-9"
          aria-label={
            pendentes.length > 0 ? `Notificações (${pendentes.length} pendentes)` : "Notificações"
          }
        >
          <Bell className="h-[1.125rem] w-[1.125rem]" />
          {pendentes.length > 0 && (
            <span className="absolute top-1.5 right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-warning px-1 text-[0.625rem] leading-none font-bold text-warning-foreground md:top-0.5 md:right-0.5">
              {pendentes.length > 9 ? "9+" : pendentes.length}
            </span>
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

/** Barra inferior do celular: até 4 atalhos do papel + "Mais" (abre o menu completo). */
function BarraInferior({ onMais, maisAberto }: { onMais: () => void; maisAberto: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { papel } = useUsuarioLogado();
  const itens = menuDoPapel(papel).flatMap((s) => s.itens);
  const atalhos = PRIORIDADE_CELULAR.map((to) => itens.find((i) => i.to === to))
    .filter((i): i is NavItem => Boolean(i))
    .slice(0, 4);
  const emAtalho = atalhos.some((i) => itemAtivo(pathname, i.to));
  const classe = (ativo: boolean) =>
    cn(
      "flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[0.6875rem] leading-none font-medium transition-colors",
      ativo ? "text-primary" : "text-muted-foreground active:bg-muted",
    );

  return (
    <nav
      aria-label="Atalhos"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-card/90 md:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch gap-1 px-2 py-1">
        {atalhos.map((item) => {
          const ativo = itemAtivo(pathname, item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={ativo ? "page" : undefined}
              className={classe(ativo)}
            >
              <item.icon className={cn("h-5 w-5", ativo && "stroke-[2.4]")} aria-hidden="true" />
              <span className={cn("max-w-full truncate", ativo && "font-semibold")}>
                {item.curto ?? item.label}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMais}
          aria-haspopup="dialog"
          aria-expanded={maisAberto}
          className={classe(maisAberto || (!emAtalho && atalhos.length > 0))}
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
          <span>Mais</span>
        </button>
      </div>
    </nav>
  );
}

const CHAVE_MENU = "sisrodov-menu-recolhido";

export function AdminShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [recolhido, setRecolhido] = useState(false);
  const usuario = useUsuarioLogado();
  const sairEVoltar = useSairEVoltar();

  // Preferência de menu recolhido (só no cliente; falha de storage = expandido).
  useEffect(() => {
    try {
      setRecolhido(localStorage.getItem(CHAVE_MENU) === "1");
    } catch {
      /* sem storage */
    }
  }, []);
  const alternarMenu = () => {
    setRecolhido((r) => {
      try {
        localStorage.setItem(CHAVE_MENU, r ? "0" : "1");
      } catch {
        /* sem storage */
      }
      return !r;
    });
  };

  return (
    <TooltipProvider>
      <div data-admin-shell="" className="flex min-h-screen bg-background">
        <aside
          className={cn(
            "sticky top-0 z-30 hidden h-screen shrink-0 transition-[width] duration-300 lg:block",
            recolhido ? "w-[4.5rem]" : "w-[19rem]",
          )}
        >
          <SidebarContent recolhido={recolhido} onAlternar={alternarMenu} />
        </aside>

        {/* Drawer do celular/tablet (foco preso, Esc fecha, X dentro da sidebar). */}
        <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 lg:hidden" />
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

        <div className="flex min-w-0 flex-1 flex-col max-md:pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
          <header className="sticky top-0 z-40 flex h-14 items-center gap-1 border-b border-border/70 bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:gap-2 md:h-16 md:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-xl text-muted-foreground lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Marca no header só quando a sidebar está escondida. */}
            <Link
              to="/dashboard"
              className="mr-2 flex min-w-0 items-center rounded-lg lg:hidden"
              aria-label="SisRodov — início"
            >
              <MarcaSisRodovPrefeitura size="sm" />
            </Link>

            <div className="ml-auto flex items-center gap-0.5 sm:gap-1.5">
              <GlobalSearch papel={usuario.papel} />
              <BuscaCelular papel={usuario.papel} />
              <ThemeToggle />
              <Notificacoes />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="grid h-11 w-11 place-items-center rounded-xl transition-colors hover:bg-black/[0.05] md:h-9 md:w-9 dark:hover:bg-white/[0.06]"
                    aria-label={`Conta de ${usuario.nome}`}
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-xs font-bold text-primary-foreground">
                      {usuario.iniciais}
                    </span>
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

          <main className="flex-1 px-4 py-5 md:p-6">{children}</main>

          <footer className="px-4 pt-2 pb-5 text-xs text-muted-foreground md:px-6">
            <p className="max-w-2xl text-pretty">
              SisRodov · Sistema Municipal de Gestão e Controle do Terminal Rodoviário de Manhuaçu.
              Linhas e horários oficiais da ANTT e do DER-MG.
            </p>
          </footer>
        </div>

        <BarraInferior onMais={() => setMobileOpen(true)} maisAberto={mobileOpen} />
      </div>
    </TooltipProvider>
  );
}
