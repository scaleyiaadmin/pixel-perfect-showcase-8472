import { cn } from "@/lib/utils";
import prefeituraLogo from "@/assets/prefeitura-logo.png";

/**
 * Marcas institucionais.
 * Os arquivos oficiais da Prefeitura e da Nova Rodoviária ainda não foram enviados;
 * enquanto isso usamos lockups tipográficos neutros, isolados neste arquivo para que
 * a troca pelos arquivos reais seja pontual.
 */

/**
 * Brasão + nome da Prefeitura.
 * - `variant="color"` (padrão): arquivo oficial, para fundo claro.
 * - `variant="light"`: versão monocromática branca, para fundo escuro (sidebar, painel).
 * - `inverted` (legado): arquivo colorido dentro de um quadro branco.
 * - `size`: sm (h-7) · md (h-10, padrão) · lg (h-14).
 */
export function PrefeituraLogo({
  className,
  inverted,
  variant = "color",
  size = "md",
}: {
  className?: string;
  inverted?: boolean;
  variant?: "color" | "light";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div className={cn("flex items-center", inverted && "rounded-md bg-card px-2 py-1", className)}>
      <img
        src={prefeituraLogo}
        alt="Prefeitura de Manhuaçu"
        className={cn(
          "w-auto object-contain",
          size === "sm" ? "h-7" : size === "lg" ? "h-14" : "h-10",
          variant === "light" && !inverted && "opacity-90 [filter:brightness(0)_invert(1)]",
        )}
      />
    </div>
  );
}

/** Lockup "Nova Rodoviária de Manhuaçu" (ícone de ônibus + nome em duas linhas). */
export function RodoviariaLogo({
  className,
  inverted,
  size = "md",
}: {
  className?: string;
  inverted?: boolean;
  size?: "md" | "lg";
}) {
  const large = size === "lg";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <svg
        viewBox="0 0 56 44"
        className={cn("shrink-0", large ? "h-14 w-[4.5rem]" : "h-9 w-12")}
        aria-hidden="true"
      >
        <rect
          x="2"
          y="6"
          width="52"
          height="26"
          rx="6"
          fill="currentColor"
          className={inverted ? "text-sidebar-primary" : "text-primary"}
        />
        <rect
          x="8"
          y="12"
          width="16"
          height="10"
          rx="2"
          className={inverted ? "text-board" : "text-card"}
          fill="currentColor"
        />
        <rect
          x="32"
          y="12"
          width="16"
          height="10"
          rx="2"
          className={inverted ? "text-board" : "text-card"}
          fill="currentColor"
        />
        <circle
          cx="15"
          cy="35"
          r="5"
          fill="currentColor"
          className={inverted ? "text-sidebar-foreground" : "text-foreground"}
        />
        <circle
          cx="41"
          cy="35"
          r="5"
          fill="currentColor"
          className={inverted ? "text-sidebar-foreground" : "text-foreground"}
        />
      </svg>
      <div className="leading-tight">
        <p
          className={cn(
            "font-display font-bold uppercase tracking-[0.14em]",
            large ? "text-base" : "text-[11px]",
            inverted ? "text-sidebar-foreground" : "text-foreground",
          )}
        >
          Nova Rodoviária
        </p>
        <p
          className={cn(
            "font-display font-semibold uppercase tracking-[0.14em]",
            large ? "text-sm" : "text-[10px]",
            inverted ? "text-sidebar-primary" : "text-muted-foreground",
          )}
        >
          de Manhuaçu
        </p>
      </div>
    </div>
  );
}

/**
 * Marca do sistema: selo "SR" + "SisRodov" e subtítulo.
 * - `inverted`: para fundo escuro (sidebar).
 * - `compact`: só o selo.
 * - `size="sm"`: selo de 32px (header do celular).
 * - `subtitle`: padrão "Manhuaçu"; na sidebar usamos "Nova Rodoviária de Manhuaçu".
 */
export function SisRodovLogo({
  className,
  inverted,
  compact,
  size = "md",
  subtitle = "Manhuaçu",
}: {
  className?: string;
  inverted?: boolean;
  compact?: boolean;
  size?: "sm" | "md";
  subtitle?: string;
}) {
  const small = size === "sm";
  return (
    <div className={cn("flex min-w-0 items-center", small ? "gap-2" : "gap-3", className)}>
      <div
        role={compact ? "img" : undefined}
        aria-hidden={compact ? undefined : true}
        aria-label={compact ? "SisRodov" : undefined}
        className={cn(
          "grid shrink-0 place-items-center rounded-lg font-display font-extrabold tracking-tight",
          small ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm",
          inverted
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "bg-primary text-primary-foreground",
        )}
      >
        SR
      </div>
      {!compact && (
        <div className="min-w-0 leading-tight">
          <p
            className={cn(
              "font-display font-extrabold tracking-tight",
              small ? "text-[0.9375rem]" : "text-base",
              inverted ? "text-sidebar-accent-foreground" : "text-foreground",
            )}
          >
            SisRodov
          </p>
          {subtitle && (
            <p
              className={cn(
                "truncate text-[11px] font-medium",
                inverted ? "text-sidebar-foreground/75" : "text-muted-foreground",
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
