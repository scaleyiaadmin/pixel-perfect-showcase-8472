import { Link } from "@tanstack/react-router";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BellRing,
  BusFront,
  Check,
  Clock3,
  Info,
  LoaderCircle,
  Maximize2,
  Minimize2,
  WifiOff,
  X,
} from "lucide-react";
import { MarcaSisRodovPrefeitura } from "@/components/brand/Logos";
import { TZ, tituloNome } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ViagemDetalhada } from "@/services/operacao";

/* ------------------------------------------------------------------ */
/* Hooks                                                              */
/* ------------------------------------------------------------------ */

/** Relógio do painel para os filtros (atualiza a cada 30 s). */
export function useAgora() {
  const [agora, setAgora] = useState<number | null>(null);
  useEffect(() => {
    setAgora(Date.now());
    const id = window.setInterval(() => setAgora(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return agora;
}

/** Relógio de parede (hh:mm, segundos e data por extenso). */
function useRelogio() {
  const [agora, setAgora] = useState<Date | null>(null);
  useEffect(() => {
    setAgora(new Date());
    const id = window.setInterval(() => setAgora(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!agora) return { hhmm: "", ss: "", data: "" };
  const [hh, mm, ss] = agora
    .toLocaleTimeString("pt-BR", {
      timeZone: TZ,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    .split(":");
  const data = agora.toLocaleDateString("pt-BR", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return { hhmm: `${hh}:${mm}`, ss, data };
}

/** Mouse/teclado ativos nos últimos `ms` (controles da TV somem depois disso). */
function useAtividade(ms = 5000) {
  const [ativo, setAtivo] = useState(true);
  useEffect(() => {
    let timer = window.setTimeout(() => setAtivo(false), ms);
    const acordar = () => {
      setAtivo(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setAtivo(false), ms);
    };
    const eventos = ["mousemove", "mousedown", "keydown", "touchstart", "wheel"] as const;
    eventos.forEach((e) => window.addEventListener(e, acordar, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      eventos.forEach((e) => window.removeEventListener(e, acordar));
    };
  }, [ms]);
  return ativo;
}

function useTelaCheia() {
  const [cheia, setCheia] = useState(false);
  useEffect(() => {
    const atualizar = () => setCheia(Boolean(document.fullscreenElement));
    atualizar();
    document.addEventListener("fullscreenchange", atualizar);
    return () => document.removeEventListener("fullscreenchange", atualizar);
  }, []);
  const alternar = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  };
  return { cheia, alternar };
}

/** Altura útil de um elemento (ResizeObserver). */
function useAltura<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [altura, setAltura] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => setAltura(entry.contentRect.height));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, altura] as const;
}

/** Altura da linha do quadro, proporcional à altura da tela (legível a ~5 m em 1080p). */
function useAlturaLinha() {
  const [linha, setLinha] = useState(96);
  useEffect(() => {
    const calcular = () =>
      setLinha(Math.round(Math.min(116, Math.max(60, window.innerHeight * 0.09))));
    calcular();
    window.addEventListener("resize", calcular);
    return () => window.removeEventListener("resize", calcular);
  }, []);
  return linha;
}

/* ------------------------------------------------------------------ */
/* Moldura do painel                                                  */
/* ------------------------------------------------------------------ */

type Tela = "partidas" | "chegadas";

type Paginacao = { atual: number; total: number };

/** O quadro informa a página atual para o indicador do rodapé. */
const PaginacaoCtx = createContext<(p: Paginacao) => void>(() => {});

export function BoardShell({
  tela,
  nota,
  children,
}: {
  tela: Tela;
  /** Texto do rodapé. */
  nota?: string;
  children: ReactNode;
}) {
  const { hhmm, ss, data } = useRelogio();
  const ativo = useAtividade();
  const { cheia, alternar } = useTelaCheia();
  const [paginacao, setPaginacao] = useState<Paginacao>({ atual: 0, total: 1 });
  const controlesVisiveis = ativo && !cheia;
  const titulo = tela === "partidas" ? "Partidas" : "Chegadas";
  const IconeTitulo = tela === "partidas" ? ArrowUpRight : ArrowDownLeft;

  const controle =
    "inline-flex min-h-11 items-center gap-2 rounded-xl bg-board-foreground/[0.06] px-4 text-sm font-medium text-board-foreground/90 ring-1 ring-board-foreground/10 transition-colors hover:bg-board-foreground/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-board-accent";
  const controleAtivo = {
    className: "bg-board-accent/20 text-board-foreground ring-board-accent/50",
  };

  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col gradient-board font-sans text-board-foreground antialiased md:h-screen md:overflow-hidden",
        !ativo && "md:cursor-none",
      )}
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-5 px-4 pt-4 pb-2 md:flex-nowrap md:gap-x-[2.5vw] md:px-[3vw] md:pt-[3vh] md:pb-[1.5vh]">
        <div className="flex min-w-0 items-center gap-x-[2.5vw]">
          <MarcaSisRodovPrefeitura size="sm" tone="dark" className="md:hidden" />
          {/* Lockup em escala de TV (zoom acompanha a resolução do painel). */}
          <MarcaSisRodovPrefeitura
            size="lg"
            tone="dark"
            className="hidden md:flex min-[1600px]:[zoom:1.3] min-[2400px]:[zoom:1.8]"
          />
          <span
            aria-hidden
            className="hidden h-[clamp(3rem,8vh,5.5rem)] w-px bg-board-foreground/15 md:block"
          />
          <div className="hidden min-w-0 items-center gap-[1.1vw] md:flex">
            <TituloPainel titulo={titulo} Icone={IconeTitulo} />
          </div>
        </div>

        <div className="text-right">
          <p className="tabular leading-none font-semibold tracking-[-0.02em] whitespace-nowrap">
            <span className="text-3xl md:text-[clamp(2.5rem,7vh,5.25rem)]">{hhmm}</span>
            <span className="ml-1 text-lg font-medium text-board-muted/80 md:ml-[0.3vw] md:text-[clamp(1.25rem,3.2vh,2.4rem)]">
              {ss}
            </span>
          </p>
          <p className="mt-1.5 text-xs font-medium whitespace-nowrap text-board-muted first-letter:uppercase md:mt-[0.8vh] md:text-[clamp(0.85rem,1.9vh,1.4rem)]">
            {data}
          </p>
        </div>

        <div className="flex w-full items-center gap-3 md:hidden">
          <TituloPainel titulo={titulo} Icone={IconeTitulo} />
        </div>
      </header>

      <PaginacaoCtx.Provider value={setPaginacao}>
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </PaginacaoCtx.Provider>

      <footer className="flex shrink-0 flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:gap-[2vw] md:border-t md:border-board-foreground/10 md:bg-board/40 md:px-[3vw] md:py-[1.3vh]">
        <p className="flex min-w-0 flex-1 items-center gap-2.5 text-sm text-board-muted md:text-[clamp(0.95rem,1.85vh,1.35rem)]">
          <Info aria-hidden className="h-[1.15em] w-[1.15em] shrink-0 text-board-accent" />
          <span>
            {nota ?? "Horários sujeitos a alteração. Confirme a plataforma antes do embarque."}
          </span>
        </p>

        <nav
          aria-label="Painéis"
          className={cn(
            "flex flex-wrap gap-2 transition-opacity duration-500",
            !controlesVisiveis && "md:pointer-events-none md:opacity-0",
          )}
        >
          <Link
            to="/painel"
            className={controle}
            activeOptions={{ exact: true }}
            activeProps={controleAtivo}
          >
            Partidas
          </Link>
          <Link to="/painel/chegadas" className={controle} activeProps={controleAtivo}>
            Chegadas
          </Link>
          <button
            type="button"
            onClick={alternar}
            className={cn(controle, "hidden md:inline-flex")}
          >
            {cheia ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            {cheia ? "Sair da tela cheia" : "Tela cheia"}
          </button>
          <Link to="/dashboard" className={controle}>
            Voltar ao sistema
          </Link>
        </nav>

        {paginacao.total > 1 && (
          <div className="hidden shrink-0 items-center gap-3 md:flex" aria-hidden>
            <div className="flex gap-1.5">
              {Array.from({ length: paginacao.total }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-500",
                    i === paginacao.atual ? "w-8 bg-board-accent" : "w-1.5 bg-board-foreground/25",
                  )}
                />
              ))}
            </div>
            <span className="tabular text-[clamp(0.85rem,1.7vh,1.25rem)] font-medium text-board-muted">
              {paginacao.atual + 1}/{paginacao.total}
            </span>
          </div>
        )}
      </footer>
    </div>
  );
}

function TituloPainel({ titulo, Icone }: { titulo: string; Icone: typeof ArrowUpRight }) {
  return (
    <>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-board-accent text-board-accent-foreground shadow-[0_8px_24px_-8px_hsl(226_95%_72%/0.6)] md:h-[clamp(2.75rem,7vh,5rem)] md:w-[clamp(2.75rem,7vh,5rem)] md:rounded-[clamp(0.75rem,1.8vh,1.25rem)]">
        <Icone aria-hidden className="h-[58%] w-[58%]" strokeWidth={2.4} />
      </span>
      <div className="min-w-0">
        <h1 className="text-3xl leading-none font-bold tracking-[-0.03em] md:text-[clamp(2.25rem,6vh,4.5rem)]">
          {titulo}
        </h1>
        <p className="mt-1 truncate text-sm font-medium text-board-muted md:mt-[0.7vh] md:text-[clamp(0.9rem,1.9vh,1.4rem)]">
          Terminal Rodoviário de Manhuaçu
        </p>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Quadro de horários                                                 */
/* ------------------------------------------------------------------ */

export type StatusPainel =
  "prevista" | "embarque" | "ultima-chamada" | "atrasada" | "cancelada" | "partiu" | "chegou";

/**
 * Situação: "Previsto" é neutro; só o que pede ação do passageiro ganha cor sólida.
 * `pilula: false` = só texto (sem fundo).
 */
const situacoes: Record<
  StatusPainel,
  { label: string; className: string; Icone?: typeof Check; pulso?: boolean; pilula?: boolean }
> = {
  prevista: { label: "Previsto", className: "text-board-muted", pilula: false },
  embarque: {
    label: "Embarque",
    className: "bg-board-success text-board-success-foreground",
    pulso: true,
  },
  "ultima-chamada": {
    label: "Última chamada",
    className: "board-blink bg-board-warning text-board-warning-foreground",
    Icone: BellRing,
  },
  atrasada: {
    label: "Atrasado",
    className: "bg-board-danger text-board-danger-foreground",
    Icone: Clock3,
  },
  cancelada: {
    label: "Cancelado",
    className: "bg-board-danger/20 text-[hsl(0_90%_80%)] ring-1 ring-board-danger/50 ring-inset",
    Icone: X,
  },
  partiu: {
    label: "Partiu",
    className: "text-board-muted/70",
    Icone: ArrowUpRight,
    pilula: false,
  },
  chegou: {
    label: "Chegou",
    className: "bg-board-success/15 text-board-success ring-1 ring-board-success/40 ring-inset",
    Icone: Check,
  },
};

export type LinhaPainel = {
  id: string;
  hora: string;
  /** Horário previsto (ms) para a contagem "em 12 min" da próxima. */
  previsto?: number | null;
  /** Destino (partidas) ou origem (chegadas). */
  local: string;
  /** Vazio quando não há empresa cadastrada. */
  empresa: string;
  /** Código da linha (ANTT/DER), quando houver. */
  linha?: string | null;
  plataforma: string | null;
  status: StatusPainel;
  /** Próxima partida/chegada: ganha destaque. */
  destaque?: boolean;
};

/** Empresa para o painel: só o nome real (sem "Intermunicipal"/"Não informada"). */
export const empresaPainel = (v: Pick<ViagemDetalhada, "empresa">) =>
  tituloNome(v.empresa?.nome_fantasia || v.empresa?.razao_social);

const ROTACAO_MS = 10_000;

/** "Linha 3110 · Viação Águia Branca" (só o que existir). */
const detalheLinha = (l: LinhaPainel) =>
  [l.linha ? `Linha ${l.linha}` : "", l.empresa].filter(Boolean).join(" · ");

const encerrada = (s: StatusPainel) => s === "partiu" || s === "cancelada" || s === "chegou";

/** Contagem regressiva curta da próxima: "agora", "em 12 min", "em 1 h 05". */
function useContagem(previsto: number | null | undefined) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    if (!previsto) return;
    const id = window.setInterval(() => setAgora(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, [previsto]);
  if (!previsto) return null;
  const min = Math.ceil((previsto - agora) / 60_000);
  if (min <= 0) return "agora";
  if (min < 60) return `em ${min} min`;
  if (min >= 180) return null;
  return `em ${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
}

export function BoardTable({
  linhas,
  colunaLocal,
  carregando,
  erro,
  vazio,
}: {
  linhas: LinhaPainel[];
  colunaLocal: "Destino" | "Origem";
  carregando: boolean;
  erro: boolean;
  vazio: { titulo: string; detalhe?: string };
}) {
  if (carregando) return <Aviso titulo="Carregando horários…" tipo="carregando" />;
  if (erro)
    return (
      <Aviso
        titulo="Painel temporariamente indisponível"
        detalhe="Tentando novamente em instantes."
        tipo="erro"
      />
    );
  if (linhas.length === 0)
    return <Aviso titulo={vazio.titulo} detalhe={vazio.detalhe} tipo="vazio" />;

  return (
    <>
      <QuadroTV linhas={linhas} colunaLocal={colunaLocal} />
      <ListaCelular linhas={linhas} />
    </>
  );
}

/** Estado vazio/carregando/erro grande e centralizado no meio da tela. */
function Aviso({
  titulo,
  detalhe,
  tipo,
}: {
  titulo: string;
  detalhe?: string;
  tipo: "carregando" | "erro" | "vazio";
}) {
  const Icone = tipo === "carregando" ? LoaderCircle : tipo === "erro" ? WifiOff : BusFront;
  return (
    <div
      role={tipo === "erro" ? "alert" : "status"}
      className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center md:gap-[2.5vh]"
    >
      <span className="grid h-20 w-20 place-items-center rounded-3xl bg-board-foreground/[0.06] ring-1 ring-board-foreground/10 md:h-[clamp(5rem,13vh,9rem)] md:w-[clamp(5rem,13vh,9rem)] md:rounded-[clamp(1.25rem,3vh,2rem)]">
        <Icone
          aria-hidden
          className={cn(
            "h-[46%] w-[46%]",
            tipo === "carregando" ? "animate-spin text-board-accent" : "text-board-muted",
          )}
          strokeWidth={1.75}
        />
      </span>
      <p className="max-w-[22ch] text-2xl leading-tight text-balance font-semibold tracking-[-0.02em] md:max-w-[28ch] md:text-[clamp(2rem,5vh,3.75rem)]">
        {titulo}
      </p>
      {detalhe && (
        <p className="max-w-[46ch] text-base text-board-muted md:text-[clamp(1.1rem,2.4vh,1.75rem)]">
          {detalhe}
        </p>
      )}
    </div>
  );
}

/** Colunas proporcionais à altura da linha: nunca encavalam. */
const COLUNAS =
  "grid-cols-[calc(var(--linha)*1.75)_minmax(0,1fr)_calc(var(--linha)*1.3)_calc(var(--linha)*3)]";

function QuadroTV({ linhas, colunaLocal }: { linhas: LinhaPainel[]; colunaLocal: string }) {
  const alturaLinha = useAlturaLinha();
  const [areaRef, alturaArea] = useAltura<HTMLDivElement>();
  const porPagina = Math.max(1, Math.floor(alturaArea / alturaLinha) || 1);
  const paginas = Math.max(1, Math.ceil(linhas.length / porPagina));
  const [pagina, setPagina] = useState(0);
  const atual = pagina % paginas;
  const setPaginacao = useContext(PaginacaoCtx);

  useEffect(() => {
    if (paginas <= 1) return;
    const id = window.setInterval(() => setPagina((p) => (p + 1) % paginas), ROTACAO_MS);
    return () => window.clearInterval(id);
  }, [paginas]);

  useEffect(() => {
    setPaginacao({ atual, total: paginas });
  }, [atual, paginas, setPaginacao]);
  useEffect(() => () => setPaginacao({ atual: 0, total: 1 }), [setPaginacao]);

  const visiveis = alturaArea ? linhas.slice(atual * porPagina, (atual + 1) * porPagina) : [];
  // As linhas esticam um pouco para ocupar a área (sem sobra grande embaixo).
  const linhaEfetiva = alturaArea
    ? Math.min(alturaLinha * 1.2, alturaArea / porPagina)
    : alturaLinha;
  const estilo = {
    "--linha": `${Math.floor(linhaEfetiva)}px`,
    "--base": `${alturaLinha}px`,
  } as CSSProperties;

  return (
    <div
      className="hidden min-h-0 flex-1 flex-col px-[3vw] pt-[1vh] pb-[1.2vh] md:flex"
      style={estilo}
    >
      <div
        className={cn(
          "grid shrink-0 items-end gap-x-[2vw] px-[calc(var(--base)*0.32)] pb-[0.9vh] font-medium text-board-muted/90",
          COLUNAS,
          "text-[length:calc(var(--base)*0.19)]",
        )}
      >
        <span>Horário</span>
        <span>{colunaLocal}</span>
        <span className="text-center">Plataforma</span>
        <span className="pl-[0.2em]">Situação</span>
      </div>

      <div ref={areaRef} className="min-h-0 flex-1 overflow-hidden">
        {visiveis.map((l) => (
          <LinhaTV key={l.id} linha={l} />
        ))}
      </div>
    </div>
  );
}

function Situacao({ status, tamanho }: { status: StatusPainel; tamanho: string }) {
  const s = situacoes[status];
  const Icone = s.Icone;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[0.5em] rounded-full leading-none font-semibold whitespace-nowrap",
        s.pilula === false ? "py-[0.5em]" : "px-[0.9em] py-[0.5em]",
        tamanho,
        s.className,
      )}
    >
      {s.pulso && (
        <span aria-hidden className="relative flex h-[0.55em] w-[0.55em]">
          <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-60" />
          <span className="relative h-full w-full rounded-full bg-current" />
        </span>
      )}
      {Icone && <Icone aria-hidden className="h-[1.05em] w-[1.05em]" strokeWidth={2.5} />}
      <span className={cn(status === "cancelada" && "line-through decoration-2")}>{s.label}</span>
    </span>
  );
}

function LinhaTV({ linha: l }: { linha: LinhaPainel }) {
  const fim = encerrada(l.status);
  const detalhe = detalheLinha(l);
  const contagem = useContagem(l.destaque ? l.previsto : null);
  const ativa = l.status === "embarque" || l.status === "ultima-chamada";
  return (
    <div className="h-[var(--linha)] py-[calc(var(--linha)*0.055)]">
      <div
        className={cn(
          "relative grid h-full items-center gap-x-[2vw] rounded-[calc(var(--linha)*0.2)] px-[calc(var(--base)*0.32)] transition-colors",
          COLUNAS,
          fim ? "bg-board-row/50" : "bg-board-row",
          l.destaque &&
            "bg-[hsl(225_48%_19%)] shadow-[0_12px_32px_-16px_hsl(226_95%_72%/0.55)] ring-2 ring-board-accent/80 ring-inset",
        )}
      >
        <span
          className={cn(
            "tabular text-[length:calc(var(--linha)*0.42)] leading-none font-bold tracking-[-0.02em]",
            fim && "text-board-muted/70",
          )}
        >
          {l.hora}
        </span>

        <div className="min-w-0">
          <p
            className={cn(
              "truncate text-[length:calc(var(--linha)*0.36)] leading-[1.1] font-semibold tracking-[-0.015em]",
              fim && "text-board-muted/70",
              l.status === "cancelada" && "line-through decoration-board-danger/70 decoration-2",
            )}
          >
            {l.local}
          </p>
          {(detalhe || l.destaque) && (
            <p className="mt-[calc(var(--linha)*0.05)] flex min-w-0 items-center gap-[0.6em] text-[length:max(0.8125rem,calc(var(--linha)*0.18))] leading-tight font-medium text-board-muted">
              {l.destaque && (
                <span className="inline-flex shrink-0 items-center rounded-full bg-board-accent px-[0.65em] py-[0.2em] font-semibold text-board-accent-foreground">
                  {contagem ? `Próxima · ${contagem}` : "Próxima"}
                </span>
              )}
              <span className="truncate">{detalhe}</span>
            </p>
          )}
        </div>

        <span className="flex justify-center">
          <span
            className={cn(
              "tabular grid aspect-square h-[calc(var(--linha)*0.64)] place-items-center rounded-[calc(var(--linha)*0.16)] leading-none",
              l.plataforma
                ? ativa
                  ? l.status === "embarque"
                    ? "bg-board-success text-board-success-foreground"
                    : "bg-board-warning text-board-warning-foreground"
                  : "bg-board-foreground/[0.09] ring-1 ring-board-foreground/15 ring-inset"
                : "bg-board-foreground/[0.035]",
              fim && "opacity-50",
            )}
          >
            {l.plataforma ? (
              <span className="text-[length:calc(var(--linha)*0.36)] font-bold">
                {l.plataforma}
              </span>
            ) : (
              <span className="text-[length:calc(var(--linha)*0.22)] font-medium text-board-muted/60">
                —
              </span>
            )}
          </span>
        </span>

        <span className="flex min-w-0">
          <Situacao status={l.status} tamanho="text-[length:calc(var(--linha)*0.22)]" />
        </span>
      </div>
    </div>
  );
}

/** Celular: lista de cartões (hora + local; embaixo situação e detalhes), sem rolagem horizontal. */
function ListaCelular({ linhas }: { linhas: LinhaPainel[] }) {
  return (
    <ul className="flex flex-col gap-2 px-4 pt-2 md:hidden">
      {linhas.map((l) => {
        const fim = encerrada(l.status);
        const detalhe = detalheLinha(l);
        return (
          <li
            key={l.id}
            className={cn(
              "grid grid-cols-[3.75rem_minmax(0,1fr)] items-center gap-x-3 rounded-2xl px-4 py-3",
              fim ? "bg-board-row/50" : "bg-board-row",
              l.destaque && "bg-[hsl(225_48%_19%)] ring-2 ring-board-accent/80 ring-inset",
            )}
          >
            <span
              className={cn(
                "tabular row-span-2 text-2xl leading-none font-bold tracking-[-0.02em]",
                fim && "text-board-muted/70",
              )}
            >
              {l.hora}
            </span>
            <div className="flex min-w-0 items-center gap-2">
              <p
                className={cn(
                  "min-w-0 flex-1 truncate text-lg leading-tight font-semibold tracking-[-0.01em]",
                  fim && "text-board-muted/70",
                  l.status === "cancelada" && "line-through decoration-board-danger/70",
                )}
              >
                {l.local}
              </p>
              {l.plataforma && (
                <span
                  className={cn(
                    "tabular shrink-0 rounded-lg bg-board-foreground/[0.09] px-2 py-0.5 text-sm font-semibold",
                    fim && "opacity-60",
                  )}
                >
                  Plat. {l.plataforma}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex min-w-0 items-center gap-2 text-[0.8125rem] text-board-muted">
              {l.destaque && (
                <span className="shrink-0 rounded-full bg-board-accent px-2 py-0.5 text-xs font-semibold text-board-accent-foreground">
                  Próxima
                </span>
              )}
              <Situacao status={l.status} tamanho="shrink-0 text-xs" />
              {detalhe && <span className="truncate">{detalhe}</span>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
