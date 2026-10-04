import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { BusFront, Maximize2, Minimize2 } from "lucide-react";
import { PrefeituraLogo, RodoviariaLogo } from "@/components/brand/Logos";
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
  const controlesVisiveis = ativo && !cheia;
  const titulo = tela === "partidas" ? "Partidas" : "Chegadas";

  const controle =
    "inline-flex min-h-11 items-center gap-2 rounded-lg border border-board-foreground/25 px-4 font-sans text-sm font-semibold tracking-wide uppercase transition-colors hover:bg-board-row focus-visible:outline-2 focus-visible:outline-primary";

  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col gradient-board text-board-foreground md:h-screen md:overflow-hidden",
        !ativo && "md:cursor-none",
      )}
    >
      <header className="grid shrink-0 grid-cols-[1fr_auto] items-center gap-x-6 gap-y-3 border-b border-board-foreground/15 px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-x-10 md:px-[3vw] md:py-[2.2vh]">
        <div className="min-w-0">
          <RodoviariaLogo inverted className="md:hidden" />
          <RodoviariaLogo inverted size="lg" className="hidden md:flex" />
        </div>

        <h1 className="order-last col-span-2 font-board text-4xl leading-none font-bold tracking-[0.12em] uppercase md:order-none md:col-span-1 md:text-center md:text-[clamp(2.75rem,7.5vh,6rem)]">
          {titulo}
        </h1>

        <div className="flex min-w-0 items-center justify-end gap-6">
          <div className="text-right">
            <p className="tabular font-board leading-none font-bold whitespace-nowrap">
              <span className="text-4xl md:text-[clamp(2.5rem,7vh,5.5rem)]">{hhmm}</span>
              <span className="ml-1 align-top text-xl text-board-foreground/60 md:text-[clamp(1.25rem,3vh,2.25rem)]">
                {ss}
              </span>
            </p>
            <p className="mt-1 text-xs font-medium tracking-[0.12em] whitespace-nowrap text-board-foreground/75 uppercase md:text-[clamp(0.8rem,1.6vh,1.15rem)]">
              {data}
            </p>
          </div>
          <PrefeituraLogo
            variant="light"
            size="sm"
            className="hidden border-l border-board-foreground/15 pl-6 xl:flex"
          />
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">{children}</main>

      <footer className="flex shrink-0 flex-col gap-3 border-t border-board-foreground/15 px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-6 md:px-[3vw] md:py-[1.4vh]">
        <nav
          aria-label="Painéis"
          className={cn(
            "flex gap-2 transition-opacity duration-500",
            !controlesVisiveis && "md:pointer-events-none md:opacity-0",
          )}
        >
          <Link
            to="/painel"
            className={controle}
            activeOptions={{ exact: true }}
            activeProps={{ className: "bg-board-row border-primary/60" }}
          >
            Partidas
          </Link>
          <Link
            to="/painel/chegadas"
            className={controle}
            activeProps={{ className: "bg-board-row border-primary/60" }}
          >
            Chegadas
          </Link>
        </nav>

        <p className="text-sm text-board-foreground/75 md:text-center md:text-[clamp(0.95rem,1.9vh,1.35rem)]">
          {nota ?? "Horários sujeitos a alteração. Confirme a plataforma antes do embarque."}
        </p>

        <div
          className={cn(
            "flex gap-2 transition-opacity duration-500 md:justify-end",
            !controlesVisiveis && "md:pointer-events-none md:opacity-0",
          )}
        >
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
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Quadro de horários                                                 */
/* ------------------------------------------------------------------ */

export type StatusPainel =
  "prevista" | "embarque" | "ultima-chamada" | "atrasada" | "cancelada" | "partiu" | "chegou";

const pilula: Record<StatusPainel, { label: string; className: string }> = {
  prevista: {
    label: "Previsto",
    className: "border-primary bg-primary/25 text-board-foreground",
  },
  embarque: { label: "Embarque", className: "border-success bg-success text-success-foreground" },
  "ultima-chamada": {
    label: "Última chamada",
    className: "border-warning bg-warning text-warning-foreground",
  },
  atrasada: { label: "Atrasado", className: "border-danger bg-danger text-danger-foreground" },
  cancelada: {
    label: "Cancelado",
    className: "border-danger bg-danger/20 text-board-foreground line-through decoration-2",
  },
  partiu: {
    label: "Partiu",
    className: "border-board-foreground/20 bg-board-foreground/5 text-board-foreground/65",
  },
  chegou: { label: "Chegou", className: "border-success/70 bg-success/20 text-board-foreground" },
};

export type LinhaPainel = {
  id: string;
  hora: string;
  /** Destino (partidas) ou origem (chegadas). */
  local: string;
  /** Vazio quando não há empresa cadastrada. */
  empresa: string;
  plataforma: string | null;
  status: StatusPainel;
  /** Próxima partida/chegada: ganha destaque. */
  destaque?: boolean;
};

/** Empresa para o painel: só o nome real (sem "Intermunicipal"/"Não informada"). */
export const empresaPainel = (v: Pick<ViagemDetalhada, "empresa">) =>
  tituloNome(v.empresa?.nome_fantasia || v.empresa?.razao_social);

const ROTACAO_MS = 10_000;

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
  if (carregando) return <Aviso titulo="Carregando horários…" />;
  if (erro)
    return (
      <Aviso
        titulo="Painel temporariamente indisponível"
        detalhe="Tentando novamente em instantes."
      />
    );
  if (linhas.length === 0) return <Aviso titulo={vazio.titulo} detalhe={vazio.detalhe} icone />;

  return (
    <>
      <QuadroTV linhas={linhas} colunaLocal={colunaLocal} />
      <ListaCelular linhas={linhas} />
    </>
  );
}

/** Estado vazio/carregando/erro grande e centralizado no meio da tela. */
function Aviso({ titulo, detalhe, icone }: { titulo: string; detalhe?: string; icone?: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      {icone && (
        <BusFront
          aria-hidden
          className="h-16 w-16 text-board-foreground/35 md:h-[clamp(4rem,11vh,8rem)] md:w-[clamp(4rem,11vh,8rem)]"
          strokeWidth={1.5}
        />
      )}
      <p className="max-w-[24ch] font-board text-3xl leading-tight font-semibold tracking-wide uppercase md:max-w-[30ch] md:text-[clamp(2.25rem,6vh,4.5rem)]">
        {titulo}
      </p>
      {detalhe && (
        <p className="max-w-[48ch] text-base text-board-foreground/75 md:text-[clamp(1.1rem,2.4vh,1.75rem)]">
          {detalhe}
        </p>
      )}
    </div>
  );
}

/** Colunas fixas proporcionais à altura da linha: nunca encavalam. */
const COLUNAS =
  "grid-cols-[calc(var(--linha)*1.7)_minmax(0,2fr)_minmax(0,1.3fr)_calc(var(--linha)*1.9)_calc(var(--linha)*3.3)]";

function QuadroTV({ linhas, colunaLocal }: { linhas: LinhaPainel[]; colunaLocal: string }) {
  const alturaLinha = useAlturaLinha();
  const [areaRef, alturaArea] = useAltura<HTMLDivElement>();
  const porPagina = Math.max(1, Math.floor(alturaArea / alturaLinha) || 1);
  const paginas = Math.max(1, Math.ceil(linhas.length / porPagina));
  const [pagina, setPagina] = useState(0);
  const atual = pagina % paginas;

  useEffect(() => {
    if (paginas <= 1) return;
    const id = window.setInterval(() => setPagina((p) => (p + 1) % paginas), ROTACAO_MS);
    return () => window.clearInterval(id);
  }, [paginas]);

  const visiveis = alturaArea ? linhas.slice(atual * porPagina, (atual + 1) * porPagina) : [];
  // As linhas esticam para preencher a área inteira (sem sobra embaixo).
  const linhaEfetiva = alturaArea
    ? Math.min(alturaLinha * 1.25, alturaArea / porPagina)
    : alturaLinha;
  const estilo = {
    "--linha": `${Math.floor(linhaEfetiva)}px`,
    "--base": `${alturaLinha}px`,
  } as CSSProperties;

  return (
    <div className="hidden min-h-0 flex-1 flex-col px-[3vw] pt-[1.6vh] md:flex" style={estilo}>
      <div
        className={cn(
          "grid shrink-0 items-end gap-x-[2.2vw] border-b border-board-foreground/20 px-[1.2vw] pb-[1vh] font-board font-semibold tracking-[0.12em] text-board-foreground/75 uppercase",
          COLUNAS,
          "text-[length:calc(var(--base)*0.24)]",
        )}
      >
        <span>Horário</span>
        <span>{colunaLocal}</span>
        <span>Empresa</span>
        <span className="text-center">Plataforma</span>
        <span className="text-center">Situação</span>
      </div>

      <div ref={areaRef} className="min-h-0 flex-1 overflow-hidden">
        {visiveis.map((l, i) => (
          <LinhaTV key={l.id} linha={l} zebra={i % 2 === 1} />
        ))}
      </div>

      <div className="flex h-[3.2vh] min-h-6 shrink-0 items-center justify-end gap-3">
        {paginas > 1 && (
          <>
            <div className="flex gap-1.5" aria-hidden>
              {Array.from({ length: paginas }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === atual ? "w-10 bg-primary" : "w-5 bg-board-foreground/25",
                  )}
                />
              ))}
            </div>
            <span className="tabular font-board text-[clamp(0.95rem,1.9vh,1.35rem)] font-semibold tracking-[0.12em] text-board-foreground/75 uppercase">
              Página {atual + 1} de {paginas}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function LinhaTV({ linha: l, zebra }: { linha: LinhaPainel; zebra: boolean }) {
  const p = pilula[l.status];
  const encerrada = l.status === "partiu" || l.status === "cancelada" || l.status === "chegou";
  return (
    <div
      className={cn(
        "relative grid h-[var(--linha)] items-center gap-x-[2.2vw] border-b border-board-foreground/[0.07] px-[1.2vw] font-board",
        COLUNAS,
        zebra && "bg-board-foreground/[0.035]",
        l.destaque && "bg-board-row",
      )}
    >
      {l.destaque && (
        <span aria-hidden className="absolute inset-y-[12%] left-0 w-1.5 rounded-r bg-primary" />
      )}
      <span
        className={cn(
          "tabular text-[length:calc(var(--linha)*0.56)] leading-none font-bold",
          encerrada && "text-board-foreground/60",
        )}
      >
        {l.hora}
      </span>
      <span
        className={cn(
          "truncate text-[length:calc(var(--linha)*0.48)] leading-none font-semibold tracking-wide uppercase",
          encerrada && "text-board-foreground/60",
        )}
      >
        {l.local}
      </span>
      <span className="truncate text-[length:calc(var(--linha)*0.32)] leading-none font-medium text-board-foreground/60">
        {l.empresa}
      </span>
      <span className="text-center leading-none">
        {l.plataforma ? (
          <span className="tabular text-[length:calc(var(--linha)*0.52)] font-bold">
            {l.plataforma}
          </span>
        ) : (
          <span className="text-[length:calc(var(--linha)*0.3)] font-semibold text-board-foreground/35">
            —
          </span>
        )}
      </span>
      <span className="flex justify-center">
        <span
          className={cn(
            "inline-flex w-full items-center justify-center rounded-full border-2 px-[0.8em] py-[0.28em] text-[length:calc(var(--linha)*0.26)] leading-none font-bold tracking-[0.08em] whitespace-nowrap uppercase",
            p.className,
          )}
        >
          {p.label}
        </span>
      </span>
    </div>
  );
}

/** Celular: lista simples (hora + local + situação), sem rolagem horizontal. */
function ListaCelular({ linhas }: { linhas: LinhaPainel[] }) {
  return (
    <ul className="divide-y divide-board-foreground/10 md:hidden">
      {linhas.map((l) => {
        const p = pilula[l.status];
        return (
          <li
            key={l.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3",
              l.destaque && "border-l-4 border-primary bg-board-row pl-3",
            )}
          >
            <span className="tabular w-[4.25rem] shrink-0 font-board text-3xl leading-none font-bold">
              {l.hora}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-board text-xl leading-tight font-semibold tracking-wide uppercase">
                {l.local}
              </p>
              {(l.empresa || l.plataforma) && (
                <p className="truncate text-sm text-board-foreground/70">
                  {[l.empresa, l.plataforma ? `Plataforma ${l.plataforma}` : ""]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 font-board text-sm leading-none font-bold tracking-[0.06em] whitespace-nowrap uppercase",
                p.className,
              )}
            >
              {p.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
