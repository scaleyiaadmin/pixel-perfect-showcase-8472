import type { ReactNode } from "react";
import { DatabaseZap, FlaskConical, Inbox, Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { VAZIO } from "@/lib/format";

/* ------------------------------- EmptyState ------------------------------ */

/**
 * Estado vazio centralizado, com respiro lateral (px-6) e texto limitado (max-w-md),
 * seguro dentro de `bodyClassName="p-0"`.
 *
 * <EmptyState message="Nenhuma plataforma cadastrada." action={<Button>Nova plataforma</Button>} />
 * <EmptyState icon={Bus} title="Sem viagens hoje" message="As viagens chegam pela integração." />
 */
export function EmptyState({
  message,
  title,
  icon: Icon = Inbox,
  action,
  compact,
  className,
}: {
  /** Texto principal (ou a explicação, quando há `title`). */
  message?: ReactNode;
  title?: ReactNode;
  icon?: LucideIcon;
  /** Botão/link de próxima ação (ex.: "Cadastrar"). */
  action?: ReactNode;
  /** Menos altura (cards pequenos). */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 text-center",
        compact ? "py-8" : "py-12",
        className,
      )}
    >
      <span className="grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      {title && <p className="font-display text-base font-semibold text-foreground">{title}</p>}
      {message && <p className="max-w-md text-sm text-pretty text-muted-foreground">{message}</p>}
      {action && <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "Carregando..." }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-muted-foreground"
    >
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {label}
    </div>
  );
}

/* --------------------------------- Vazio --------------------------------- */

/**
 * Traço padrão para valor ausente em células e campos. `title` vira dica nativa
 * (ex.: "Não informada pelo DER-MG").
 *
 * {viagem.plataforma ?? <Vazio title="Plataforma a definir" />}
 */
export function Vazio({ title, className }: { title?: string; className?: string }) {
  return (
    <span
      className={cn("text-muted-foreground", title && "cursor-help", className)}
      title={title}
      aria-label={title ?? "Não informado"}
    >
      {VAZIO}
    </span>
  );
}

/** Valor ou <Vazio/> quando nulo/vazio. `ouVazio(t.veiculo)` · `ouVazio(t.valor, brl)` */
export function ouVazio<V>(
  valor: V | null | undefined | "",
  formatar?: (v: V) => ReactNode,
  title?: string,
): ReactNode {
  if (valor === null || valor === undefined || valor === "") return <Vazio title={title} />;
  return formatar ? formatar(valor as V) : (valor as ReactNode);
}

/* ------------------------------- DemoBanner ------------------------------ */

/** Aviso para telas que ainda mostram dados fictícios (sem fonte real integrada). */
export function DemoBanner({
  reason = "aguardando integração com empresas e catracas",
}: {
  reason?: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning-foreground">
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        <span className="font-semibold">Dados de exemplo.</span> Esta tela ainda não tem fonte real
        ({reason}).
      </p>
    </div>
  );
}

/** Selo curto de fonte oficial para telas com dados reais. */
export function SourceNote({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-xs text-pretty text-muted-foreground">{children}</p>;
}

/* ------------------------------- QueryState ------------------------------ */

/** Loading / erro de uma consulta ao banco; devolve null quando os dados chegaram. */
export function QueryState({ isLoading, error }: { isLoading: boolean; error: unknown }) {
  if (isLoading) return <LoadingState />;
  if (error) {
    const message = error instanceof Error ? error.message : "Falha ao consultar o banco de dados.";
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-danger-soft text-danger">
          <DatabaseZap className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="max-w-md text-sm text-pretty text-muted-foreground">{message}</p>
      </div>
    );
  }
  return null;
}

export function DemoNote({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-xs text-muted-foreground italic">{children}</p>;
}
