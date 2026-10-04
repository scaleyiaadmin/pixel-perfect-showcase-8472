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
 * - `variant="light"`: versão monocromática branca, para fundo escuro (painel).
 * - `inverted`: arquivo colorido num selo branco arredondado — o mais legível
 *   sobre fundo escuro quando o brasão é pequeno (TV).
 * - `size`: sm (h-7) · md (h-10, padrão) · lg (h-14) · xl (h-20).
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
  size?: "sm" | "md" | "lg" | "xl";
}) {
  return (
    <div
      className={cn(
        "flex items-center",
        inverted && "rounded-lg bg-white px-2.5 py-1.5 shadow-sm",
        className,
      )}
    >
      <img
        src={prefeituraLogo}
        alt="Prefeitura de Manhuaçu"
        className={cn(
          "w-auto object-contain",
          size === "sm" ? "h-7" : size === "lg" ? "h-14" : size === "xl" ? "h-20" : "h-10",
          variant === "light" &&
            !inverted &&
            "[filter:brightness(0)_invert(1)_drop-shadow(0_1px_1px_rgb(0_0_0/0.35))]",
        )}
      />
    </div>
  );
}

/** Desenho do ônibus usado nas marcas (carroceria, janelas e rodas). */
function OnibusSvg({
  className,
  corpo,
  janela,
  roda,
}: {
  className?: string;
  corpo: string;
  janela: string;
  roda: string;
}) {
  return (
    <svg viewBox="0 0 56 44" className={cn("shrink-0", className)} aria-hidden="true">
      <rect x="2" y="6" width="52" height="26" rx="6" fill="currentColor" className={corpo} />
      <rect x="8" y="12" width="16" height="10" rx="2" fill="currentColor" className={janela} />
      <rect x="32" y="12" width="16" height="10" rx="2" fill="currentColor" className={janela} />
      <circle cx="15" cy="35" r="5" fill="currentColor" className={roda} />
      <circle cx="41" cy="35" r="5" fill="currentColor" className={roda} />
    </svg>
  );
}

/**
 * Lockup "Nova Rodoviária de Manhuaçu" (ônibus + nome em duas linhas).
 * - `inverted`: para fundo escuro ou azul (painel de TV, login) — texto branco.
 * - `accent`: classe de cor da carroceria no modo invertido (padrão branco;
 *   no painel de TV use `text-board-accent`).
 */
export function RodoviariaLogo({
  className,
  inverted,
  accent,
  size = "md",
}: {
  className?: string;
  inverted?: boolean;
  accent?: string;
  size?: "md" | "lg";
}) {
  const large = size === "lg";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <OnibusSvg
        className={large ? "h-14 w-[4.5rem]" : "h-9 w-12"}
        corpo={inverted ? (accent ?? "text-white") : "text-primary"}
        janela={inverted ? "text-board" : "text-card"}
        roda={inverted ? "text-white/70" : "text-foreground"}
      />
      <div className="leading-tight">
        <p
          className={cn(
            "font-display font-bold tracking-[0.14em] uppercase",
            large ? "text-base" : "text-[11px]",
            inverted ? "text-white" : "text-foreground",
          )}
        >
          Nova Rodoviária
        </p>
        <p
          className={cn(
            "font-display font-semibold tracking-[0.14em] uppercase",
            large ? "text-sm" : "text-[10px]",
            inverted ? "text-white/80" : "text-muted-foreground",
          )}
        >
          de Manhuaçu
        </p>
      </div>
    </div>
  );
}

/**
 * Marca do sistema: selo com ônibus + "SisRodov" e subtítulo.
 * - `inverted`: para fundo escuro/azul (texto branco).
 * - `compact`: só o selo.
 * - `size="sm"`: selo de 32px (header do celular).
 * - `subtitle`: padrão "Manhuaçu".
 * - `stacked`: versão grande centralizada (topo da sidebar, como o logo do ERP).
 */
export function SisRodovLogo({
  className,
  inverted,
  compact,
  stacked,
  size = "md",
  subtitle = "Manhuaçu",
}: {
  className?: string;
  inverted?: boolean;
  compact?: boolean;
  stacked?: boolean;
  size?: "sm" | "md";
  subtitle?: string;
}) {
  const small = size === "sm";
  const selo = (
    <div
      role={compact ? "img" : undefined}
      aria-hidden={compact ? undefined : true}
      aria-label={compact ? "SisRodov" : undefined}
      className={cn(
        "grid shrink-0 place-items-center",
        stacked ? "h-12 w-12 rounded-2xl" : small ? "h-8 w-8 rounded-lg" : "h-10 w-10 rounded-xl",
        inverted ? "bg-white" : "bg-primary shadow-[var(--shadow-xs)]",
      )}
    >
      <OnibusSvg
        className={stacked ? "h-6 w-8" : small ? "h-4 w-5" : "h-5 w-6"}
        corpo={inverted ? "text-primary" : "text-white"}
        janela={inverted ? "text-white" : "text-primary"}
        roda={inverted ? "text-primary/70" : "text-white/80"}
      />
    </div>
  );

  if (stacked && !compact) {
    return (
      <div className={cn("flex min-w-0 flex-col items-center text-center", className)}>
        {selo}
        <p
          className={cn(
            "mt-2 text-[0.6875rem] leading-tight font-bold tracking-[0.16em] uppercase",
            inverted ? "text-white" : "text-foreground",
          )}
        >
          Nova Rodoviária
        </p>
        <p
          className={cn(
            "text-[0.625rem] leading-tight font-semibold tracking-[0.16em] uppercase",
            inverted ? "text-white/80" : "text-muted-foreground",
          )}
        >
          de Manhuaçu
        </p>
        <p
          className={cn(
            "mt-1.5 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold tracking-wide",
            inverted ? "bg-white/15 text-white" : "bg-primary/10 text-primary",
          )}
        >
          SisRodov
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex min-w-0 items-center", small ? "gap-2" : "gap-3", className)}>
      {selo}
      {!compact && (
        <div className="min-w-0 leading-tight">
          <p
            className={cn(
              "font-display font-bold tracking-tight",
              small ? "text-[0.9375rem]" : "text-base",
              inverted ? "text-white" : "text-foreground",
            )}
          >
            SisRodov
          </p>
          {subtitle && (
            <p
              className={cn(
                "truncate text-[11px] font-medium",
                inverted ? "text-white/75" : "text-muted-foreground",
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

/**
 * Lockup institucional lado a lado: [SisRodov] | [Prefeitura de Manhuaçu],
 * separados por uma linha vertical fina. Use no topo da sidebar, no header do
 * celular, na tela de login e em relatórios impressos.
 * - `size`: sm (header do celular: só o selo + brasão pequeno) · md (sidebar:
 *   selo sobre o nome) · lg (login/relatório: selo + nome ao lado).
 * - `tone`: "auto" (padrão; segue o tema claro/escuro) · "light" (sempre fundo
 *   claro — use em impressão) · "dark" (sempre fundo escuro/azul).
 *
 * <MarcaSisRodovPrefeitura size="md" />
 * <MarcaSisRodovPrefeitura size="lg" tone="dark" />
 */
export function MarcaSisRodovPrefeitura({
  size = "md",
  tone = "auto",
  className,
}: {
  size?: "sm" | "md" | "lg";
  tone?: "auto" | "light" | "dark";
  className?: string;
}) {
  const escuro = tone === "dark";
  const auto = tone === "auto";
  const texto = escuro ? "text-white" : cn("text-foreground", !auto && "text-[hsl(224_33%_14%)]");
  // Brasão: colorido no claro; branco no escuro (no "auto", só quando o tema é escuro).
  const brasaoEscuro = "[filter:brightness(0)_invert(1)]";
  return (
    <div
      role="img"
      aria-label="SisRodov — Prefeitura de Manhuaçu"
      className={cn(
        "flex min-w-0 items-center",
        size === "sm" ? "gap-2" : size === "md" ? "gap-2.5" : "gap-3.5",
        className,
      )}
    >
      {size === "md" ? (
        <div className="flex shrink-0 flex-col items-center gap-1">
          <SisRodovLogo compact inverted={escuro} className="[&>div]:h-10 [&>div]:w-10" />
          <span className={cn("text-[0.8125rem] leading-none font-bold tracking-tight", texto)}>
            SisRodov
          </span>
        </div>
      ) : size === "lg" ? (
        <div className="flex shrink-0 items-center gap-2.5">
          <SisRodovLogo compact inverted={escuro} className="[&>div]:h-11 [&>div]:w-11" />
          <span className={cn("text-xl leading-none font-bold tracking-tight", texto)}>
            SisRodov
          </span>
        </div>
      ) : (
        <SisRodovLogo compact size="sm" inverted={escuro} className="shrink-0" />
      )}
      <span
        aria-hidden="true"
        className={cn(
          "w-px shrink-0 self-stretch",
          escuro ? "bg-white/30" : auto ? "bg-foreground/20" : "bg-[hsl(224_33%_14%/0.2)]",
          size === "sm" ? "my-0.5" : "my-1",
        )}
      />
      <img
        src={prefeituraLogo}
        alt=""
        className={cn(
          "w-auto min-w-0 shrink object-contain",
          size === "sm" ? "h-6" : size === "lg" ? "h-12" : "h-10",
          escuro && brasaoEscuro,
          auto && "dark:[filter:brightness(0)_invert(1)]",
        )}
      />
    </div>
  );
}
