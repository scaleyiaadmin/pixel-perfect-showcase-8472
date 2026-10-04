import { useId } from "react";
import { cn } from "@/lib/utils";
import prefeituraLogo from "@/assets/prefeitura-logo.png";
// Mesmo arquivo com o texto em branco e o brasão nas cores originais (fundo escuro).
import prefeituraLogoEscuro from "@/assets/prefeitura-logo-escuro.png";

/**
 * Marcas institucionais.
 * Os arquivos oficiais da Prefeitura e da Nova Rodoviária ainda não foram enviados;
 * enquanto isso usamos lockups tipográficos neutros, isolados neste arquivo para que
 * a troca pelos arquivos reais seja pontual.
 */

/**
 * Brasão + nome da Prefeitura.
 * - `variant="color"` (padrão): arquivo oficial, para fundo claro.
 * - `variant="light"`: brasão colorido com texto branco, para fundo escuro (painel).
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
        src={variant === "light" && !inverted ? prefeituraLogoEscuro : prefeituraLogo}
        alt="Prefeitura de Manhuaçu"
        className={cn(
          "w-auto object-contain",
          size === "sm" ? "h-7" : size === "lg" ? "h-14" : size === "xl" ? "h-20" : "h-10",
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
            "font-bold tracking-[0.14em] uppercase",
            large ? "text-base" : "text-[11px]",
            inverted ? "text-white" : "text-foreground",
          )}
        >
          Nova Rodoviária
        </p>
        <p
          className={cn(
            "font-semibold tracking-[0.14em] uppercase",
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
 * Símbolo do SisRodov: frente de ônibus em silhueta (para-brisa, letreiro,
 * faróis e rodas recortados), sem caixa. Os recortes são transparentes
 * (máscara), então funciona sobre qualquer fundo. A cor vem de `text-*`
 * (padrão `text-primary`).
 */
export function SisRodovSimbolo({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-8 w-8 shrink-0 text-primary", className)}
      aria-hidden="true"
    >
      <defs>
        <mask id={`sr-${id}`}>
          <rect width="32" height="32" fill="white" />
          {/* letreiro */}
          <rect x="11" y="4.6" width="10" height="1.8" rx="0.9" fill="black" />
          {/* para-brisa */}
          <path d="M8.6 9.2c0-.9.7-1.6 1.6-1.6h11.6c.9 0 1.6.7 1.6 1.6v6.6H8.6z" fill="black" />
          {/* faróis */}
          <rect x="8.4" y="19.2" width="3.6" height="2.4" rx="1.2" fill="black" />
          <rect x="20" y="19.2" width="3.6" height="2.4" rx="1.2" fill="black" />
          {/* grade */}
          <rect x="14" y="19.8" width="4" height="1.2" rx="0.6" fill="black" />
        </mask>
      </defs>
      <g fill="currentColor" mask={`url(#sr-${id})`}>
        <rect x="5.5" y="2.5" width="21" height="22.5" rx="5" />
        {/* retrovisores */}
        <rect x="3" y="8" width="2" height="5.5" rx="1" />
        <rect x="27" y="8" width="2" height="5.5" rx="1" />
        {/* rodas */}
        <rect x="7.5" y="24" width="4.5" height="5.5" rx="1.6" />
        <rect x="20" y="24" width="4.5" height="5.5" rx="1.6" />
      </g>
    </svg>
  );
}

/**
 * Marca do sistema, horizontal (conversa com a logo da Prefeitura):
 * símbolo à esquerda + "SisRodov" em negrito e subtítulo em caixa alta espaçada.
 * - `compact`: só o símbolo (menu recolhido).
 * - `inverted`: fundo escuro/azul (símbolo e texto brancos).
 * - `size`: sm (h-6) · md (h-8, padrão) · lg (h-11, login).
 * - `subtitle`: padrão "Rodoviária"; `""` remove.
 *
 * <SisRodovLogo />  ·  <SisRodovLogo compact />  ·  <SisRodovLogo size="lg" inverted />
 */
export function SisRodovLogo({
  className,
  inverted,
  compact,
  size = "md",
  subtitle = "Rodoviária",
}: {
  className?: string;
  inverted?: boolean;
  compact?: boolean;
  size?: "sm" | "md" | "lg";
  subtitle?: string;
}) {
  const simbolo = (
    <SisRodovSimbolo
      className={cn(
        size === "sm" ? "h-6 w-6" : size === "lg" ? "h-11 w-11" : "h-8 w-8",
        inverted && "text-white",
      )}
    />
  );
  if (compact) {
    return (
      <span role="img" aria-label="SisRodov" className={cn("inline-flex", className)}>
        {simbolo}
      </span>
    );
  }
  return (
    <div
      className={cn(
        "flex min-w-0 items-center",
        size === "sm" ? "gap-1.5" : size === "lg" ? "gap-3" : "gap-2",
        className,
      )}
    >
      {simbolo}
      <div className="min-w-0 leading-none">
        <p
          className={cn(
            "font-extrabold tracking-[-0.02em]",
            size === "sm" ? "text-[0.9375rem]" : size === "lg" ? "text-[1.75rem]" : "text-lg",
            inverted ? "text-white" : "text-[hsl(222_38%_24%)] dark:text-foreground",
          )}
        >
          SisRodov
        </p>
        {subtitle && (
          <p
            className={cn(
              "font-semibold tracking-[0.22em] uppercase",
              size === "sm"
                ? "mt-0.5 text-[0.5rem]"
                : size === "lg"
                  ? "mt-1.5 text-[0.75rem]"
                  : "mt-1 text-[0.5625rem]",
              inverted ? "text-white/75" : "text-muted-foreground",
            )}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Lockup institucional lado a lado: [SisRodov] | [Prefeitura de Manhuaçu].
 * As duas marcas são horizontais, com a mesma altura, centralizadas e separadas
 * por uma linha vertical fina com o mesmo respiro dos dois lados. Use no topo
 * da sidebar, no header do celular, na tela de login e em relatórios.
 * - `size`: sm (header do celular: símbolo + brasão; o nome aparece a partir
 *   de 420px) · md (topo da sidebar) · lg (login/relatório).
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
  const sm = size === "sm";
  const lg = size === "lg";
  // Nome em azul-marinho próximo ao da logo da Prefeitura (no "auto", segue o tema).
  const corNome = escuro
    ? "text-white"
    : auto
      ? "text-[hsl(222_38%_24%)] dark:text-foreground"
      : "text-[hsl(222_38%_24%)]";
  const corSub = escuro
    ? "text-white/70"
    : auto
      ? "text-muted-foreground"
      : "text-[hsl(220_12%_42%)]";
  return (
    <div
      role="img"
      aria-label="SisRodov — Prefeitura de Manhuaçu"
      className={cn(
        "flex min-w-0 items-center",
        sm ? "gap-2" : lg ? "gap-4" : "gap-2.5",
        className,
      )}
    >
      {/* SisRodov: símbolo + nome em duas linhas (mesma altura da logo da Prefeitura). */}
      <div className={cn("flex shrink-0 items-center", sm ? "gap-1.5" : lg ? "gap-2.5" : "gap-2")}>
        <SisRodovSimbolo
          className={cn(
            sm ? "h-6 w-6" : lg ? "h-[3.25rem] w-[3.25rem]" : "h-[2.125rem] w-[2.125rem]",
            escuro && "text-white",
          )}
        />
        <div className={cn("leading-none", sm && "hidden min-[420px]:block")}>
          <p
            className={cn(
              "font-extrabold tracking-[-0.02em]",
              sm ? "text-[0.9375rem]" : lg ? "text-[1.75rem]" : "text-[1.125rem]",
              corNome,
            )}
          >
            SisRodov
          </p>
          {!sm && (
            <p
              className={cn(
                "font-semibold tracking-[0.2em] uppercase",
                lg ? "mt-1.5 text-[0.6875rem]" : "mt-[0.3rem] text-[0.5625rem]",
                corSub,
              )}
            >
              Rodoviária
            </p>
          )}
        </div>
      </div>
      <span
        aria-hidden="true"
        className={cn(
          "w-px shrink-0",
          sm ? "h-6" : lg ? "h-12" : "h-[2.125rem]",
          escuro ? "bg-white/30" : auto ? "bg-foreground/15" : "bg-[hsl(224_33%_14%/0.18)]",
        )}
      />
      {/* Fundo claro: arquivo oficial · fundo escuro: brasão colorido com texto branco. */}
      <img
        src={escuro ? prefeituraLogoEscuro : prefeituraLogo}
        alt=""
        className={cn(
          "w-auto min-w-0 shrink object-contain object-left",
          sm ? "h-[1.625rem]" : lg ? "h-[3.5rem]" : "h-[2.375rem]",
          auto && "dark:hidden",
        )}
      />
      {auto && (
        <img
          src={prefeituraLogoEscuro}
          alt=""
          className={cn(
            "hidden w-auto min-w-0 shrink object-contain object-left dark:block",
            sm ? "h-[1.625rem]" : lg ? "h-[3.5rem]" : "h-[2.375rem]",
          )}
        />
      )}
    </div>
  );
}
