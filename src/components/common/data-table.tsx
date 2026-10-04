import {
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { VAZIO } from "@/lib/format";
import { EmptyState, Vazio } from "./feedback";

/* -------------------------------- DataTable ------------------------------ */

/**
 * Papel da coluna no modo cartão (celular, abaixo de `md`):
 * - `title`: destaque do cartão (negrito) · `subtitle`: linha cinza abaixo do título
 * - `badge`: canto superior direito (status) · `meta`: par rótulo/valor em 2 colunas
 * - `action`: rodapé do cartão, sempre visível · `hidden`: não aparece no celular
 * Sem configuração: 1ª coluna = title; coluna "status" = badge; coluna sem
 * cabeçalho ou "actions"/"acoes" = action; demais = meta.
 */
export type MobileRole = "title" | "subtitle" | "badge" | "meta" | "hidden" | "action";

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  /** Classe do cabeçalho (compatibilidade). */
  className?: string;
  /** Classe das células do corpo. */
  cellClassName?: string;
  /** Impede quebra de linha na célula (CNPJ, horários, valores). */
  nowrap?: boolean;
  /** Papel no modo cartão do celular. */
  mobile?: MobileRole;
  /** Atalho para `mobile: "hidden"`. */
  hideOnMobile?: boolean;
  /** Esconde a coluna da tabela abaixo do breakpoint (th e td). */
  hideBelow?: "md" | "lg" | "xl";
  /** Rótulo no cartão quando difere do cabeçalho (ex.: cabeçalho vazio). */
  mobileLabel?: string;
  render: (row: T) => ReactNode;
}

const ehAcao = (c: Column<unknown>) =>
  c.header.trim() === "" || /^(actions?|acoes|ações|acao)$/i.test(c.key);
const ehStatus = (c: Column<unknown>) => /status|situa/i.test(c.key) || /^status$/i.test(c.header);

/** Resolve o papel de cada coluna no cartão, aplicando o fallback documentado acima. */
function papeis<T>(columns: Column<T>[]): MobileRole[] {
  const explicitos = columns.map((c) => (c.hideOnMobile ? "hidden" : c.mobile));
  const temTitulo = explicitos.includes("title");
  const temBadge = explicitos.includes("badge");
  let tituloUsado = temTitulo;
  let badgeUsado = temBadge;
  return columns.map((c, i) => {
    const e = explicitos[i];
    if (e) return e;
    const col = c as Column<unknown>;
    if (ehAcao(col)) return "action";
    if (!tituloUsado) {
      tituloUsado = true;
      return "title";
    }
    if (!badgeUsado && ehStatus(col)) {
      badgeUsado = true;
      return "badge";
    }
    return "meta";
  });
}

/** Detecta se o conteúdo rola na horizontal e em qual ponta está. */
function useRolagemHorizontal(ativo: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState({ rola: false, inicio: true, fim: true });
  const medir = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const rola = el.scrollWidth > el.clientWidth + 1;
    const inicio = el.scrollLeft <= 1;
    const fim = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
    setEstado((s) =>
      s.rola === rola && s.inicio === inicio && s.fim === fim ? s : { rola, inicio, fim },
    );
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    el.addEventListener("scroll", medir, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", medir);
    };
  }, [medir, ativo]);
  return { ref, ...estado };
}

const hideBelowClass = {
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
} as const;

/** Conteúdo "vazio" no cartão: null/false/"" ou só o traço (<Vazio/> / "—"). */
const semConteudo = (n: ReactNode) =>
  n === null ||
  n === undefined ||
  n === false ||
  n === "" ||
  n === VAZIO ||
  (isValidElement(n) && n.type === Vazio);

/**
 * Some, nos cartões, a linha cujo texto é só o traço de vazio — inclusive quando
 * o "—" vem de dentro de um componente da página (o React não enxerga isso antes).
 */
function useOcultaVazios() {
  const ref = useRef<HTMLUListElement>(null);
  useLayoutEffect(() => {
    ref.current?.querySelectorAll<HTMLElement>(".cartao-slot, .cartao-meta").forEach((el) => {
      const alvo = el.classList.contains("cartao-meta") ? el.querySelector("dd") : el;
      el.hidden = (alvo?.textContent ?? "").trim() === VAZIO;
    });
  });
  return ref;
}

const alinhamento = (a?: Column<unknown>["align"]) =>
  a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

/**
 * Tabela padrão. API antiga continua igual (`columns`, `rows`, `onRowClick`,
 * `emptyMessage`). Novidades:
 * - Celular (< md): cada linha vira cartão — configure com `column.mobile`
 *   ou deixe o fallback. `mobile="scroll"` mantém a tabela rolando.
 * - Desktop: cabeçalho fixo ao rolar a página (quando a tabela cabe no
 *   container), cabeçalhos sem quebra e sombra lateral indicando rolagem
 *   horizontal quando a tabela é mais larga (tablet).
 *
 * <DataTable
 *   rows={viagens}
 *   onRowClick={(v) => navigate(...)}
 *   columns={[
 *     { key: "hora", header: "Hora", nowrap: true, mobile: "meta", render: (v) => hora(v.previsto_em) },
 *     { key: "destino", header: "Destino", mobile: "title", render: (v) => v.destino },
 *     { key: "empresa", header: "Empresa", mobile: "subtitle", render: (v) => tituloNome(v.empresa) },
 *     { key: "status", header: "Status", mobile: "badge", render: (v) => <StatusBadge … /> },
 *     { key: "acoes", header: "", align: "right", mobile: "action", render: (v) => <Button … /> },
 *   ]}
 * />
 */
export function DataTable<T extends { id?: string }>({
  columns,
  rows,
  onRowClick,
  emptyMessage = "Nenhum registro encontrado.",
  empty,
  mobile = "cards",
  minWidth = "42rem",
  stickyHeader = true,
  rowClassName,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  /** Substitui o EmptyState padrão (ex.: com `action`). */
  empty?: ReactNode;
  /** Comportamento abaixo de `md`. */
  mobile?: "cards" | "scroll";
  /** Largura mínima da tabela no desktop antes de rolar. */
  minWidth?: string;
  stickyHeader?: boolean;
  rowClassName?: (row: T) => string | undefined;
  className?: string;
}) {
  const rolagem = useRolagemHorizontal(rows.length > 0);
  const cartoes = useOcultaVazios();

  if (rows.length === 0) {
    return <>{empty ?? <EmptyState message={emptyMessage} />}</>;
  }

  const roles = papeis(columns);
  const cards = mobile === "cards";

  const teclado = (row: T) =>
    onRowClick
      ? (e: KeyboardEvent) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onRowClick(row);
          }
        }
      : undefined;

  return (
    <div className={cn("w-full", className)}>
      {/* ---------- Tabela (desktop; também no celular com mobile="scroll") ---------- */}
      <div className={cn("relative", cards && "hidden md:block")}>
        <div
          ref={rolagem.ref}
          className={cn(
            "scrollbar-thin w-full",
            rolagem.rola ? "overflow-x-auto" : "overflow-visible",
          )}
        >
          <table className="w-full text-sm" style={{ minWidth }}>
            <thead>
              <tr className="border-b border-border/70">
                {columns.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    className={cn(
                      "h-11 bg-card px-4 text-[0.8125rem] font-medium whitespace-nowrap text-muted-foreground first:pl-5 last:pr-5",
                      // Sticky só funciona quando a tabela não rola na horizontal.
                      stickyHeader &&
                        !rolagem.rola &&
                        "sticky top-16 z-10 shadow-[inset_0_-1px_0_color-mix(in_oklab,var(--border)_70%,transparent)]",
                      alinhamento(c.align),
                      c.hideBelow && hideBelowClass[c.hideBelow],
                      c.className,
                    )}
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.id ?? i}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={teclado(row)}
                  tabIndex={onRowClick ? 0 : undefined}
                  className={cn(
                    "border-b border-border/60 transition-colors last:border-0",
                    onRowClick && "cursor-pointer hover:bg-muted/40 focus-visible:bg-muted/50",
                    rowClassName?.(row),
                  )}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "px-4 py-3.5 align-middle first:pl-5 last:pr-5",
                        alinhamento(c.align),
                        c.nowrap && "whitespace-nowrap",
                        c.hideBelow && hideBelowClass[c.hideBelow],
                        c.cellClassName,
                      )}
                    >
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Indicação de rolagem horizontal. */}
        {rolagem.rola && !rolagem.inicio && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-foreground/10 to-transparent"
          />
        )}
        {rolagem.rola && !rolagem.fim && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-foreground/10 to-transparent"
          />
        )}
      </div>

      {/* ---------- Cartões (celular) ---------- */}
      {cards && (
        <ul ref={cartoes} className="divide-y divide-border/70 md:hidden">
          {rows.map((row, i) => {
            // Cada slot só aparece se tiver conteúdo (sem "—" sozinho nem rodapé vazio).
            const pick = (r: MobileRole) =>
              columns
                .filter((_, j) => roles[j] === r)
                .map((c) => ({ c, node: c.render(row) }))
                .filter((x) => !semConteudo(x.node));
            const titulo = pick("title");
            const subtitulo = pick("subtitle");
            const badges = pick("badge");
            const metas = pick("meta");
            const acoes = pick("action");
            return (
              <li
                key={row.id ?? i}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={teclado(row)}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? "button" : undefined}
                className={cn(
                  "flex flex-col gap-3 px-4 py-4",
                  onRowClick && "cursor-pointer active:bg-muted/60",
                  rowClassName?.(row),
                )}
              >
                {(titulo.length > 0 || badges.length > 0) && (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {titulo.map(({ c, node }) => (
                        <div
                          key={c.key}
                          className="cartao-slot text-[0.9375rem] leading-snug font-semibold text-foreground"
                        >
                          {node}
                        </div>
                      ))}
                      {subtitulo.map(({ c, node }) => (
                        <div
                          key={c.key}
                          className="cartao-slot mt-0.5 text-sm text-muted-foreground"
                        >
                          {node}
                        </div>
                      ))}
                    </div>
                    {badges.length > 0 && (
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {badges.map(({ c, node }) => (
                          <div key={c.key}>{node}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {metas.length > 0 && (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                    {metas.map(({ c, node }) => (
                      <div key={c.key} className="cartao-meta min-w-0">
                        <dt className="text-xs font-medium text-muted-foreground">
                          {c.mobileLabel ?? c.header}
                        </dt>
                        <dd className="mt-0.5 break-words text-foreground">{node}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {acoes.length > 0 && (
                  // Ações não disparam o clique da linha.
                  <div
                    className="flex flex-wrap items-center justify-end gap-2"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {acoes.map(({ c, node }) => (
                      <div key={c.key}>{node}</div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
