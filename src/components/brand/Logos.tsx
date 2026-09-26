import { cn } from "@/lib/utils";

/**
 * Marcas institucionais.
 * Os arquivos oficiais da Prefeitura e da Nova Rodoviária ainda não foram enviados;
 * enquanto isso usamos lockups tipográficos neutros, isolados neste arquivo para que
 * a troca pelos arquivos reais seja pontual.
 */

export function PrefeituraLogo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 48 48" className="h-9 w-9 shrink-0" aria-hidden="true">
        <path
          d="M24 3 44 13v4H4v-4L24 3Z"
          fill="currentColor"
          className={inverted ? "text-sidebar-primary" : "text-primary"}
        />
        <rect x="9" y="20" width="4.5" height="17" rx="1" fill="currentColor" className={inverted ? "text-sidebar-foreground" : "text-primary"} />
        <rect x="17" y="20" width="4.5" height="17" rx="1" fill="currentColor" className={inverted ? "text-sidebar-foreground" : "text-primary"} />
        <rect x="26" y="20" width="4.5" height="17" rx="1" fill="currentColor" className={inverted ? "text-sidebar-foreground" : "text-primary"} />
        <rect x="34.5" y="20" width="4.5" height="17" rx="1" fill="currentColor" className={inverted ? "text-sidebar-foreground" : "text-primary"} />
        <rect x="5" y="39" width="38" height="5" rx="1.5" fill="currentColor" className={inverted ? "text-sidebar-primary" : "text-primary"} />
      </svg>
      <div className="leading-tight">
        <p
          className={cn(
            "font-display text-[11px] font-bold uppercase tracking-[0.16em]",
            inverted ? "text-sidebar-foreground" : "text-foreground",
          )}
        >
          Prefeitura de
        </p>
        <p
          className={cn(
            "font-display text-sm font-bold uppercase tracking-[0.12em]",
            inverted ? "text-sidebar-primary" : "text-primary",
          )}
        >
          Manhuaçu
        </p>
      </div>
    </div>
  );
}

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
      <svg viewBox="0 0 56 44" className={cn("shrink-0", large ? "h-14 w-[4.5rem]" : "h-9 w-12")} aria-hidden="true">
        <rect x="2" y="6" width="52" height="26" rx="6" fill="currentColor" className={inverted ? "text-sidebar-primary" : "text-primary"} />
        <rect x="8" y="12" width="16" height="10" rx="2" className={inverted ? "text-board" : "text-card"} fill="currentColor" />
        <rect x="32" y="12" width="16" height="10" rx="2" className={inverted ? "text-board" : "text-card"} fill="currentColor" />
        <circle cx="15" cy="35" r="5" fill="currentColor" className={inverted ? "text-sidebar-foreground" : "text-foreground"} />
        <circle cx="41" cy="35" r="5" fill="currentColor" className={inverted ? "text-sidebar-foreground" : "text-foreground"} />
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
            "font-display font-semibold uppercase tracking-[0.2em]",
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

export function SisRodovLogo({
  className,
  inverted,
  compact,
}: {
  className?: string;
  inverted?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "grid h-10 w-10 place-items-center rounded-lg font-display text-sm font-extrabold tracking-tight",
          inverted ? "bg-sidebar-primary text-sidebar-primary-foreground" : "gradient-institutional text-primary-foreground",
        )}
      >
        SR
      </div>
      {!compact && (
        <div className="leading-tight">
          <p
            className={cn(
              "font-display text-base font-extrabold tracking-tight",
              inverted ? "text-sidebar-accent-foreground" : "text-foreground",
            )}
          >
            SisRodov
          </p>
          <p
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.22em]",
              inverted ? "text-sidebar-foreground/70" : "text-muted-foreground",
            )}
          >
            Manhuaçu
          </p>
        </div>
      )}
    </div>
  );
}
