import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------ StatusBadge ------------------------------ */

export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "primary";

/** Fundo suave + texto + borda por tom (contraste AA garantido pelos tokens). */
export const toneClass: Record<Tone, string> = {
  success: "bg-success-soft text-success border-success/25",
  warning: "bg-warning-soft text-warning-foreground border-warning/40",
  danger: "bg-danger-soft text-danger border-danger/25",
  info: "bg-info-soft text-info border-info/25",
  neutral: "bg-neutral-soft text-muted-foreground border-border",
  primary: "bg-primary-soft text-primary border-primary/20",
};

/** Só a cor do texto/ícone por tom (para ícones e números). */
export const toneText: Record<Tone, string> = {
  success: "text-success",
  warning: "text-warning-foreground",
  danger: "text-danger",
  info: "text-info",
  neutral: "text-muted-foreground",
  primary: "text-primary",
};

/**
 * Pílula de status: largura do conteúdo (w-fit), nunca quebra linha.
 * `size="sm"` para tabelas densas; `dot={false}` remove a bolinha.
 *
 * <StatusBadge tone="success">Pago</StatusBadge>
 */
export function StatusBadge({
  tone = "neutral",
  children,
  dot = true,
  size = "md",
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border font-semibold leading-none whitespace-nowrap",
        size === "sm" ? "h-5 px-2 text-[11px]" : "h-6 px-2.5 text-xs",
        toneClass[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />}
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
