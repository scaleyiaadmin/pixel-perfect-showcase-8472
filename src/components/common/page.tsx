import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

/* ------------------------------- PageHeader ------------------------------ */

/**
 * Cabeçalho da página: título forte, subtítulo curto (max-w-2xl) e ações.
 * No celular as ações descem para baixo do título e ocupam a largura toda;
 * a partir de `md` ficam à direita, alinhadas ao topo, sem encolher.
 * `eyebrow` é um texto/breadcrumb pequeno acima do título (use em vez de
 * "Financeiro · Taxas" no título).
 *
 * <PageHeader
 *   eyebrow={<Link to="/empresas">Empresas</Link>}
 *   title="Viação Águia Branca S.A."
 *   subtitle="Linhas, horários e taxas da empresa no terminal."
 *   actions={<Button>Nova viagem</Button>}
 * />
 */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  /** Conteúdo extra abaixo do subtítulo (badges, metadados). */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-5 flex flex-col gap-3 md:mb-6 md:flex-row md:items-center md:justify-between md:gap-6",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted-foreground [&_a]:transition-colors [&_a:hover]:text-primary">
            {eyebrow}
          </div>
        )}
        <h1 className="text-xl leading-tight font-bold tracking-tight text-foreground md:text-2xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 max-w-2xl text-sm text-pretty text-muted-foreground">{subtitle}</p>
        )}
        {children}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 max-sm:[&>*]:flex-1 md:shrink-0 md:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ SectionCard ------------------------------ */

const temPadding = (classes?: string) => /(^|\s)p[xytrbl]?-/.test(classes ?? "");

/**
 * Cartão de seção com cabeçalho opcional (título, descrição, ações).
 * Padding padrão p-4 (celular) / p-6; passe `bodyClassName="p-0"` para tabelas.
 *
 * <SectionCard title="Partidas de hoje" description="Fonte: DER-MG" actions={<Button size="sm">Ver todas</Button>} bodyClassName="p-0">
 *   <DataTable ... />
 * </SectionCard>
 */
export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    // overflow-clip (e não hidden) para não quebrar o thead sticky das tabelas.
    <Card className={cn("surface-card gap-0 overflow-clip p-0", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b border-border/70 px-4 py-4 sm:px-6">
          <div className="min-w-0 flex-1 basis-[14rem]">
            {title && (
              <h2 className="text-base leading-snug font-semibold tracking-tight text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-[0.8125rem] text-pretty text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn(!temPadding(bodyClassName) && "p-4 sm:p-6", bodyClassName)}>
        {children}
      </div>
    </Card>
  );
}
