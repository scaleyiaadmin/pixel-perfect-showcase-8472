import { useMemo, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
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
import { allTrips, companies, companyName, currentUser, destinations, notifications, tickets } from "@/data/mock";
import { StatusBadge } from "@/components/common";

type NavItem = { label: string; to: string; icon: typeof Bus; children?: { label: string; to: string }[] };

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

function GlobalSearch() {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (q.length < 2) return null;
    return {
      viagens: allTrips
        .filter((t) => `${t.number} ${t.destination} ${companyName(t.companyId)}`.toLowerCase().includes(q))
        .slice(0, 4),
      empresas: companies.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 3),
      passagens: tickets.filter((t) => t.code.toLowerCase().includes(q)).slice(0, 3),
      destinos: destinations.filter((d) => d.name.toLowerCase().includes(q)).slice(0, 3),
    };
  }, [term]);

  const total = results
    ? results.viagens.length + results.empresas.length + results.passagens.length + results.destinos.length
    : 0;

  return (
    <div className="relative hidden flex-1 max-w-xl md:block">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar empresa, viagem, destino ou passagem..."
        className="h-9 bg-muted/60 pl-9"
      />
      {open && results && (
        <div className="absolute top-11 left-0 z-50 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-[var(--shadow-raised)]">
          {total === 0 && <p className="px-4 py-5 text-sm text-muted-foreground">Nenhum resultado nos dados demonstrativos.</p>}
          {results.viagens.length > 0 && (
            <SearchGroup title="Viagens">
              {results.viagens.map((t) => (
                <Link
                  key={t.id}
                  to="/operacao/viagens/$tripId"
                  params={{ tripId: t.id }}
                  className="flex items-center justify-between px-4 py-2 text-sm hover:bg-muted"
                >
                  <span>
                    {t.scheduled} · {t.destination}
                  </span>
                  <span className="text-xs text-muted-foreground">#{t.number}</span>
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
                  className="block px-4 py-2 text-sm hover:bg-muted"
                >
                  {c.name}
                </Link>
              ))}
            </SearchGroup>
          )}
          {results.passagens.length > 0 && (
            <SearchGroup title="Passagens">
              {results.passagens.map((t) => (
                <Link key={t.id} to="/passagens" className="block px-4 py-2 text-sm hover:bg-muted">
                  {t.code} · {t.destination}
                </Link>
              ))}
            </SearchGroup>
          )}
          {results.destinos.length > 0 && (
            <SearchGroup title="Destinos">
              {results.destinos.map((d) => (
                <Link key={d.name} to="/operacao/destinos" className="block px-4 py-2 text-sm hover:bg-muted">
                  {d.name} · {d.trips} viagens
                </Link>
              ))}
            </SearchGroup>
          )}
        </div>
      )}
    </div>
  );
}

function SearchGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-border last:border-0">
      <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <SisRodovLogo inverted />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navigation.map((item) => {
          const active = pathname === item.to || (item.children?.some((c) => pathname.startsWith(c.to)) ?? false) || (item.to !== "/dashboard" && pathname.startsWith(item.to));
          return (
            <div key={item.label}>
              <Link
                to={item.to}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="h-4.5 w-4.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
              {item.children && active && (
                <div className="mt-1 mb-2 ml-6 space-y-0.5 border-l border-sidebar-border pl-3">
                  {item.children.map((child) => (
                    <Link
                      key={child.to}
                      to={child.to}
                      onClick={onNavigate}
                      className={cn(
                        "block rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                        pathname.startsWith(child.to)
                          ? "bg-sidebar-primary/15 font-semibold text-sidebar-primary"
                          : "text-sidebar-foreground/70 hover:text-sidebar-accent-foreground",
                      )}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <a
          href="/painel"
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex items-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 text-xs font-semibold text-sidebar-primary transition-colors hover:bg-sidebar-accent/60"
        >
          <ExternalLink className="h-4 w-4" /> Abrir Painel Público
        </a>
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
            {currentUser.initials}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">{currentUser.name}</p>
            <p className="truncate text-xs text-sidebar-foreground/70">{currentUser.role}</p>
          </div>
        </div>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-sidebar-primary">
          Perfil: {currentUser.profile}
        </p>
        <Link
          to="/"
          onClick={onNavigate}
          className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
        >
          <LogOut className="h-4 w-4" /> Sair
        </Link>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-[17rem] shrink-0 lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[17rem]">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
          <button
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
            className="absolute top-4 right-4 rounded-md bg-card p-2 text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur md:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </Button>

          <div className="hidden xl:block">
            <PrefeituraLogo />
          </div>

          <GlobalSearch />

          <div className="ml-auto flex items-center gap-1.5">
            <StatusBadge tone="success" className="hidden sm:inline-flex">
              Sistema operacional
            </StatusBadge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-danger" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notificações</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.map((n) => (
                  <DropdownMenuItem key={n.id} className="flex-col items-start gap-0.5 py-2.5">
                    <span className="text-sm font-medium">{n.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {n.detail} · {n.time}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted">
                  <div className="grid h-8 w-8 place-items-center rounded-full gradient-institutional text-xs font-bold text-primary-foreground">
                    {currentUser.initials}
                  </div>
                  <div className="hidden text-left leading-tight sm:block">
                    <p className="text-sm font-semibold">{currentUser.name}</p>
                    <p className="text-[11px] text-muted-foreground">{currentUser.role}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/configuracoes">Meu perfil</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/configuracoes">Preferências</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/">Sair</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">{children}</main>

        <footer className="border-t border-border px-6 py-4 text-xs text-muted-foreground">
          SisRodov Manhuaçu · Sistema Municipal de Gestão e Controle do Terminal Rodoviário · Ambiente
          demonstrativo com dados fictícios.
        </footer>
      </div>
    </div>
  );
}
