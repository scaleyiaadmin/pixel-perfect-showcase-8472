import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { toneClass, toneText, type Tone } from "./status";

/* -------------------------------- StatCard ------------------------------- */

/** Selo do ícone por tom: quadradinho com fundo suave do tom (ERP). */
const seloIcone: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning-foreground",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-neutral-soft text-muted-foreground",
};

/**
 * Indicador (KPI) no padrão do ERP: cartão branco, rótulo pequeno em cima,
 * valor grande em negrito, dica embaixo e ícone num quadradinho do tom no
 * canto superior direito. Compacto no celular (ícone menor, no canto).
 * - `variant="card"` (padrão): cartão branco.
 * - `variant="soft"`: fundo suave do tom, sem sombra — substitui os antigos
 *   "mini-cards coloridos" (situação das viagens, divergências etc.).
 * - `valueTone`: pinta o valor com a cor do tom (`true` = o próprio `tone`).
 *   Na variante soft o valor já sai colorido.
 *
 * <StatCard label="Partidas hoje" value={42} icon={Bus} tone="info" hint="12 já saíram" />
 * <StatCard label="Vencidas" value={brl(1900)} icon={AlertTriangle} tone="danger" valueTone />
 * <StatCard variant="soft" tone="danger" label="Atrasadas/canceladas" value={3} />
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  valueTone,
  trend,
  variant = "card",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  /** Colore o valor: `true` usa o `tone`; ou passe outro tom. */
  valueTone?: boolean | Tone;
  /** Texto curto de variação, exibido em verde antes do `hint` (ex.: "+12%"). */
  trend?: string;
  variant?: "card" | "soft";
  className?: string;
}) {
  const soft = variant === "soft";
  const tomValor: Tone | null =
    typeof valueTone === "string" ? valueTone : valueTone || soft ? tone : null;
  return (
    <Card
      className={cn(
        "relative flex min-w-0 flex-col gap-0 p-4 sm:p-5 xl:p-6",
        soft ? cn("border-0 shadow-none", toneClass[tone]) : "surface-card card-hover",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn("min-w-0 flex-1", Icon && "max-sm:pr-8")}>
          <p
            className={cn(
              "text-[0.8125rem] leading-snug font-medium text-pretty break-words sm:text-sm",
              soft ? "opacity-90" : "text-muted-foreground",
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              "tabular mt-1.5 text-2xl leading-none font-bold tracking-tight break-words sm:mt-2 sm:text-[1.75rem]",
              tomValor ? toneText[tomValor] : "text-foreground",
            )}
          >
            {value}
          </p>
        </div>
        {Icon && (
          <span
            className={cn(
              "grid shrink-0 place-items-center rounded-xl",
              // Celular: menor e no canto, para o rótulo ter espaço.
              "absolute top-3 right-3 h-7 w-7 sm:static sm:h-11 sm:w-11",
              soft ? "bg-card/70" : seloIcone[tone],
            )}
          >
            <Icon className="h-4 w-4 sm:h-[1.3rem] sm:w-[1.3rem]" aria-hidden="true" />
          </span>
        )}
      </div>
      {(hint || trend) && (
        <p
          className={cn(
            "mt-2 text-xs text-pretty sm:text-[0.8125rem]",
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
