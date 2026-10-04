import { useId, type ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* -------------------------------- FilterBar ------------------------------ */

/**
 * Classe padrão de selects/inputs de filtro: largura total e 44px de altura no
 * celular; no desktop largura do conteúdo com mínimo de 12rem. Use no lugar de
 * `w-[11rem]`, `w-60` etc.
 *
 * <SelectTrigger className={filterControlClass}>…</SelectTrigger>
 */
export const filterControlClass = "h-11 w-full sm:h-10 sm:w-auto sm:min-w-[12rem] sm:max-w-[20rem]";

/**
 * Barra de filtros: busca (flex-1) + filtros (children) + `actions` à direita.
 * Celular: tudo em coluna, largura total, controles de 44px — mesmo que a página
 * ainda passe larguras fixas nos filhos. Desktop: linha que quebra quando falta espaço.
 *
 * <FilterBar search={busca} onSearch={setBusca} placeholder="Buscar viagem ou destino"
 *   actions={<Button variant="outline">Exportar</Button>}>
 *   <FilterSelect value={status} onValueChange={setStatus} allLabel="Todos os status" options={opcoes} />
 *   <DateRangeFilter from={de} to={ate} onFromChange={setDe} onToChange={setAte} />
 * </FilterBar>
 */
export function FilterBar({
  search,
  onSearch,
  placeholder = "Buscar...",
  children,
  actions,
  className,
}: {
  search?: string;
  onSearch?: (v: string) => void;
  /** Curto (cabe em 390px): "Buscar viagem ou destino". */
  placeholder?: string;
  children?: ReactNode;
  /** Botões alinhados à direita no desktop (exportar, limpar). */
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // Como no ERP: sem cartão — busca e filtros brancos direto sobre o fundo.
        "mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center",
        // Celular: filhos (selects, inputs, grupos) sempre em largura total e 44px.
        "max-sm:[&>*]:w-full max-sm:[&>button]:h-11 max-sm:[&>input]:h-11",
        className,
      )}
    >
      {onSearch && (
        <div className="relative w-full sm:w-auto sm:max-w-[26rem] sm:min-w-[16rem] sm:flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="h-11 pl-9 sm:h-10"
          />
        </div>
      )}
      {children}
      {actions && (
        <div className="flex flex-wrap items-center gap-2 max-sm:[&>*]:flex-1 sm:ml-auto">
          {actions}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- FilterSelect ---------------------------- */

export type FilterOption = { value: string; label: string };

/**
 * Select de filtro já no tamanho padrão. `allLabel` adiciona a opção "todos"
 * no topo com o valor `allValue` (padrão "todos").
 *
 * <FilterSelect
 *   value={status}
 *   onValueChange={setStatus}
 *   placeholder="Status"
 *   allLabel="Todos os status"
 *   options={[{ value: "pago", label: "Pago" }, { value: "pendente", label: "Pendente" }]}
 * />
 */
export function FilterSelect({
  value,
  onValueChange,
  options,
  placeholder,
  allLabel,
  allValue = "todos",
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: FilterOption[];
  placeholder?: string;
  allLabel?: string;
  allValue?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        className={cn(filterControlClass, "bg-card", className)}
        aria-label={ariaLabel ?? placeholder ?? allLabel}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allLabel && <SelectItem value={allValue}>{allLabel}</SelectItem>}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ----------------------------- DateRangeFilter --------------------------- */

/**
 * Período "de / até" com inputs de data. Quebra em linhas no celular sem
 * vazar em 375px; no desktop fica inline com inputs de 10rem.
 * Datas no formato "YYYY-MM-DD" (valor nativo do input date).
 *
 * <DateRangeFilter label="Período" from={de} to={ate} onFromChange={setDe} onToChange={setAte} />
 */
export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  label,
  fromLabel = "De",
  toLabel = "até",
  min,
  max,
  className,
}: {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  /** Rótulo do grupo (ex.: "Período", "Emissão"). */
  label?: string;
  fromLabel?: string;
  toLabel?: string;
  min?: string;
  max?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div
      role="group"
      aria-labelledby={label ? `${id}-rotulo` : undefined}
      className={cn(
        "flex w-full flex-wrap items-center gap-x-3 gap-y-2 text-sm sm:w-auto",
        className,
      )}
    >
      {label && (
        <span
          id={`${id}-rotulo`}
          className="w-full font-medium whitespace-nowrap text-muted-foreground sm:w-auto"
        >
          {label}
        </span>
      )}
      <label
        htmlFor={`${id}-de`}
        className="flex min-w-0 flex-1 basis-[9.5rem] items-center gap-2 sm:flex-none sm:basis-auto"
      >
        <span className="w-7 shrink-0 whitespace-nowrap text-muted-foreground sm:w-auto">
          {fromLabel}
        </span>
        <Input
          id={`${id}-de`}
          type="date"
          value={from}
          min={min}
          max={to || max}
          onChange={(e) => onFromChange(e.target.value)}
          className="tabular h-11 w-full min-w-0 sm:h-10 sm:w-[10rem]"
        />
      </label>
      <label
        htmlFor={`${id}-ate`}
        className="flex min-w-0 flex-1 basis-[9.5rem] items-center gap-2 sm:flex-none sm:basis-auto"
      >
        <span className="w-7 shrink-0 whitespace-nowrap text-muted-foreground sm:w-auto">
          {toLabel}
        </span>
        <Input
          id={`${id}-ate`}
          type="date"
          value={to}
          min={from || min}
          max={max}
          onChange={(e) => onToChange(e.target.value)}
          className="tabular h-11 w-full min-w-0 sm:h-10 sm:w-[10rem]"
        />
      </label>
    </div>
  );
}

/* ----------------------------- SegmentedFilter --------------------------- */

/**
 * Filtro segmentado em pílulas (poucas opções, como "Todos · Leads · Clientes"
 * no ERP). Rola na horizontal no celular se não couber.
 *
 * <SegmentedFilter value={aba} onValueChange={setAba} options={[
 *   { value: "todas", label: "Todas", count: 42 },
 *   { value: "hoje", label: "Hoje" },
 * ]} />
 */
export function SegmentedFilter({
  value,
  onValueChange,
  options,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: (FilterOption & { count?: number })[];
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "scrollbar-none inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-xl bg-muted p-1 max-sm:w-full",
        className,
      )}
    >
      {options.map((o) => {
        const ativo = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => onValueChange(o.value)}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors sm:min-h-8",
              ativo
                ? "bg-card text-foreground shadow-[var(--shadow-xs)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span className="tabular text-xs text-muted-foreground">({o.count})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
