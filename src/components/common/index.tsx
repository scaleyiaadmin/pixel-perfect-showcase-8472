import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Inbox, Loader2, type LucideIcon } from "lucide-react";

/* ------------------------------ StatusBadge ------------------------------ */

export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "primary";

const toneClass: Record<Tone, string> = {
  success: "bg-success-soft text-success border-success/25",
  warning: "bg-warning-soft text-warning-foreground border-warning/35",
  danger: "bg-danger-soft text-danger border-danger/25",
  info: "bg-info-soft text-info border-info/25",
  neutral: "bg-neutral-soft text-muted-foreground border-border",
  primary: "bg-primary-soft text-primary border-primary/20",
};

export function StatusBadge({
  tone = "neutral",
  children,
  dot = true,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        toneClass[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export const tripStatusTone: Record<string, { tone: Tone; label: string }> = {
  prevista: { tone: "info", label: "Prevista" },
  embarque: { tone: "success", label: "Embarque" },
  "ultima-chamada": { tone: "warning", label: "Última chamada" },
  realizada: { tone: "neutral", label: "Realizada" },
  cancelada: { tone: "danger", label: "Cancelada" },
  atrasada: { tone: "danger", label: "Atrasada" },
  partiu: { tone: "neutral", label: "Partiu" },
};

export const reconciliationTone: Record<string, { tone: Tone; label: string }> = {
  conciliado: { tone: "success", label: "Conciliado" },
  analise: { tone: "warning", label: "Em análise" },
  divergencia: { tone: "danger", label: "Divergência" },
};

export const feeTone: Record<string, { tone: Tone; label: string }> = {
  pago: { tone: "success", label: "Pago" },
  pendente: { tone: "warning", label: "Pendente" },
  inadimplente: { tone: "danger", label: "Inadimplente" },
};

/* ------------------------------- PageHeader ------------------------------ */

export function PageHeader({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* -------------------------------- StatCard ------------------------------- */

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  trend,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: Tone;
  trend?: string;
}) {
  return (
    <Card className="surface-card gap-0 p-5 transition-shadow hover:shadow-[var(--shadow-raised)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
        {Icon && (
          <span className={cn("grid h-9 w-9 place-items-center rounded-lg border", toneClass[tone])}>
            <Icon className="h-4.5 w-4.5" />
          </span>
        )}
      </div>
      <p className="tabular mt-3 font-display text-3xl font-bold tracking-tight">{value}</p>
      {(hint || trend) && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {trend && <span className="font-semibold text-success">{trend} </span>}
          {hint}
        </p>
      )}
    </Card>
  );
}

/* -------------------------------- Section -------------------------------- */

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card className={cn("surface-card gap-0 overflow-hidden p-0", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            {title && <h2 className="font-display text-base font-bold">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </Card>
  );
}

/* -------------------------------- DataTable ------------------------------ */

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  className?: string;
  render: (row: T) => ReactNode;
}

export function DataTable<T extends { id?: string }>({
  columns,
  rows,
  onRowClick,
  emptyMessage = "Nenhum registro encontrado.",
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[42rem] text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground",
                  c.align === "right" && "text-right",
                  c.align === "center" && "text-center",
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
              className={cn(
                "border-b border-border/60 transition-colors last:border-0",
                onRowClick && "cursor-pointer hover:bg-muted/70",
              )}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    "px-4 py-3 align-middle",
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center",
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
  );
}

/* -------------------------------- FilterBar ------------------------------ */

export function FilterBar({
  search,
  onSearch,
  placeholder = "Pesquisar...",
  children,
}: {
  search?: string;
  onSearch?: (v: string) => void;
  placeholder?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
      {onSearch && (
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={placeholder}
            className="h-9 pl-9"
          />
        </div>
      )}
      {children}
    </div>
  );
}

/* ------------------------------- EmptyState ------------------------------ */

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <Inbox className="h-7 w-7 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
    </div>
  );
}

export function DemoNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 text-xs text-muted-foreground italic">{children}</p>
  );
}
