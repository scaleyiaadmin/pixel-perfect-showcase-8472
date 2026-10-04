import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { toneClass, toneText, type Tone } from "./status";

/* -------------------------------- StatCard ------------------------------- */

/**
 * Indicador (KPI). Um só estilo para o sistema todo; compacto no celular.
 * - `variant="card"` (padrão): cartão branco, ícone opcional em selo do tom.
 * - `variant="soft"`: fundo suave do tom, sem sombra — substitui os antigos
 *   "mini-cards coloridos" (situação das viagens, divergências etc.).
 *
 * <StatCard label="Partidas hoje" value={42} icon={Bus} tone="info" hint="12 já saíram" />
 * <StatCard variant="soft" tone="danger" label="Atrasadas/canceladas" value={3} />
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  trend,
  variant = "card",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  /** Texto curto de variação, exibido em verde antes do `hint` (ex.: "+12%"). */
  trend?: string;
  variant?: "card" | "soft";
  className?: string;
}) {
  const soft = variant === "soft";
  return (
    <Card
      className={cn(
        "flex min-w-0 flex-col gap-0 p-4 sm:p-5",
        soft ? cn("border shadow-none", toneClass[tone]) : "surface-card",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "line-clamp-2 min-w-0 text-[11px] leading-snug font-semibold tracking-[0.08em] uppercase sm:text-xs",
            soft ? "opacity-90" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
        {Icon && (
          <span
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-lg sm:h-9 sm:w-9",
              soft ? "bg-card/70" : cn("border", toneClass[tone]),
            )}
          >
            <Icon className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" aria-hidden="true" />
          </span>
        )}
      </div>
      <p
        className={cn(
          "tabular mt-2 font-display text-2xl leading-none font-bold tracking-tight break-words sm:mt-3 sm:text-3xl",
          soft ? toneText[tone] : "text-foreground",
        )}
      >
        {value}
      </p>
      {(hint || trend) && (
        <p
          className={cn(
            "mt-1.5 text-xs text-pretty sm:mt-2",
            soft ? "opacity-90" : "text-muted-foreground",
          )}
        >
          {trend && <span className="font-semibold text-success">{trend} </span>}
          {hint}
        </p>
      )}
    </Card>
  );
}

/* -------------------------------- StatGrid ------------------------------- */

const colsClass = {
  // 2 no celular sempre; o último card ímpar ocupa a linha inteira enquanto a grade tem 2 colunas.
  2: "sm:grid-cols-2 [&>*:last-child:nth-child(odd)]:col-span-2",
  3: "sm:grid-cols-3 max-sm:[&>*:last-child:nth-child(odd)]:col-span-2",
  4: "xl:grid-cols-4 max-xl:[&>*:last-child:nth-child(odd)]:col-span-2",
} as const;

/**
 * Grade de KPIs: 2 colunas no celular; `cols` define o máximo (4 a partir de xl, 3 a partir de sm).
 *
 * <StatGrid>
 *   <StatCard ... /> <StatCard ... /> <StatCard ... /> <StatCard ... />
 * </StatGrid>
 * <StatGrid cols={3}>{mini-cards soft}</StatGrid>
 */
export function StatGrid({
  children,
  cols = 4,
  className,
}: {
  children: ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:gap-4", colsClass[cols], className)}>
      {children}
    </div>
  );
}
