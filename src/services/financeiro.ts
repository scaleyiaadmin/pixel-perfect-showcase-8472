// Financeiro, passagens (bilhetes) e conciliação do terminal.
// Tabelas em supabase/migrations/20261004120000_gestao_base.sql; view, funções e jobs em
// supabase/migrations/20261004120300_financeiro.sql.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase";
import { TZ, hojeISO } from "@/lib/format";
import type { Empresa } from "@/services/dados-publicos";
import type { Bilhete, Conciliacao, Pagamento, Taxa } from "@/services/gestao-tipos";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type StatusTaxa = Taxa["status"];
export type StatusConciliacao = "conciliado" | "analise" | "divergencia";
export type SituacaoConferencia = Conciliacao["situacao"];

/** Taxa com o total já pago (pagamentos confirmados) e o saldo em aberto. */
export interface TaxaComSaldo extends Taxa {
  pago: number;
  saldo: number;
}

export interface PagamentoComTaxa extends Pagamento {
  taxa: Pick<Taxa, "id" | "numero" | "competencia"> | null;
}

export interface BilheteComViagem extends Bilhete {
  viagem: { numero: string; data: string } | null;
}

/** Linha da view public.conciliacao_viagens. */
export interface ConciliacaoViagem {
  viagem_id: string;
  data: string;
  numero: string;
  tipo: "partida" | "chegada" | "passagem";
  origem: string;
  destino: string;
  previsto_em: string | null;
  partiu_em: string | null;
  status_viagem: string;
  empresa_id: string | null;
  bilhetes: number;
  bilhetes_cancelados: number;
  acessos: number;
  relato: number | null;
  situacao: SituacaoConferencia | null;
  observacao: string | null;
  conferido_por: string | null;
  conferido_em: string | null;
  diferenca: number;
  status: StatusConciliacao;
  situacao_conferencia: SituacaoConferencia;
}

export interface ConfigFinanceiro {
  taxaEmbarque: number | null;
  diaVencimento: number | null;
  toleranciaConciliacao: number;
  nomeTerminal: string;
}

export interface Periodo {
  /** "YYYY-MM-DD" inclusive */
  de: string;
  /** "YYYY-MM-DD" inclusive */
  ate: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PAGINA = 1000;

// O Supabase devolve no máximo 1000 linhas por chamada; percorre as páginas.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function todasAsPaginas<T>(montar: (from: number, to: number) => PromiseLike<any>) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGINA) {
    const { data, error } = await montar(from, from + PAGINA - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGINA) return rows;
  }
}

async function auditar(acao: string, modulo: string, descricao: string) {
  // Falha na auditoria não deve desfazer a ação já gravada.
  try {
    await getSupabase().rpc("registrar_auditoria", {
      p_acao: acao,
      p_modulo: modulo,
      p_descricao: descricao,
    });
  } catch (e) {
    console.error("Falha ao registrar auditoria", e);
  }
}

async function usuarioAtual() {
  const { data } = await getSupabase().auth.getUser();
  return data.user?.id ?? null;
}

const numeroOuNulo = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Nome curto da empresa (fantasia quando cadastrada). */
export function nomeDaEmpresa(e: Empresa | undefined) {
  if (!e) return "—";
  const fantasia = (e as Empresa & { nome_fantasia?: string | null }).nome_fantasia;
  return fantasia?.trim() || e.razao_social;
}

export function mapaEmpresas(empresas: Empresa[] | undefined) {
  const map = new Map<string, Empresa>();
  for (const e of empresas ?? []) map.set(e.id, e);
  return (id: string | null | undefined) => (id ? nomeDaEmpresa(map.get(id)) : "—");
}

/** "2026-09" → "09/2026" */
export const competenciaLegivel = (c: string) => `${c.slice(5, 7)}/${c.slice(0, 4)}`;

/** Competência (AAAA-MM) do mês anterior ao de hoje, no fuso do terminal. */
export function competenciaAnterior() {
  const [a, m] = hojeISO().split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "2026-10-04" (coluna date) → "04/10/2026" sem conversão de fuso. */
export const dataISO = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

/** Dias entre uma data (YYYY-MM-DD) e hoje no fuso do terminal. */
export function diasDesde(d: string) {
  const hoje = Date.parse(`${hojeISO()}T00:00:00Z`);
  return Math.max(0, Math.round((hoje - Date.parse(`${d}T00:00:00Z`)) / 86_400_000));
}

/** Instante UTC do início de um dia (YYYY-MM-DD) em Brasília. */
export function inicioDoDia(d: string) {
  // America/Sao_Paulo não tem horário de verão desde 2019: UTC-3 fixo.
  return `${d}T00:00:00-03:00`;
}

export function somarDias(d: string, dias: number) {
  const t = new Date(`${d}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + dias);
  return t.toISOString().slice(0, 10);
}

/** Primeiro dia do mês corrente no fuso do terminal. */
export const inicioDoMes = () => `${hojeISO().slice(0, 7)}-01`;

/** Data (YYYY-MM-DD) de um instante no fuso do terminal. */
export const dataLocal = (iso: string) =>
  new Date(iso).toLocaleDateString("sv-SE", { timeZone: TZ });

export const mensagemErro = (e: unknown) =>
  e instanceof Error
    ? e.message
    : typeof e === "object" && e && "message" in e
      ? String((e as { message: unknown }).message)
      : "Falha ao gravar no banco de dados.";

/** Situação considerada em aberto para cobrança (inclui pendente já vencida). */
export const emAtraso = (t: Pick<Taxa, "status" | "vencimento">) =>
  t.status === "inadimplente" || (t.status === "pendente" && t.vencimento < hojeISO());

const minuto = 60 * 1000;

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

export function useConfigFinanceiro() {
  return useQuery({
    queryKey: ["financeiro", "configuracoes"],
    staleTime: minuto,
    queryFn: async (): Promise<ConfigFinanceiro> => {
      const { data, error } = await getSupabase().from("configuracoes").select("chave, valor");
      if (error) throw error;
      const v = new Map((data ?? []).map((c) => [c.chave as string, c.valor as unknown]));
      return {
        taxaEmbarque: numeroOuNulo(v.get("taxa_embarque")),
        diaVencimento: numeroOuNulo(v.get("dia_vencimento_taxa")),
        toleranciaConciliacao: numeroOuNulo(v.get("tolerancia_conciliacao")) ?? 0,
        nomeTerminal:
          typeof v.get("nome_terminal") === "string"
            ? (v.get("nome_terminal") as string)
            : "Terminal Rodoviário de Manhuaçu",
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Taxas
// ---------------------------------------------------------------------------

export interface FiltroTaxas {
  competencia?: string;
  empresaId?: string;
  status?: StatusTaxa | StatusTaxa[];
}

type TaxaBruta = Taxa & { pagamentos: Pick<Pagamento, "valor" | "status">[] | null };

export function useTaxas(filtro: FiltroTaxas = {}) {
  return useQuery({
    queryKey: ["financeiro", "taxas", filtro],
    queryFn: async () => {
      const rows = await todasAsPaginas<TaxaBruta>((from, to) => {
        let q = getSupabase()
          .from("taxas")
          .select("*, pagamentos(valor, status)")
          .order("competencia", { ascending: false })
          .order("numero")
          .range(from, to);
        if (filtro.competencia) q = q.eq("competencia", filtro.competencia);
        if (filtro.empresaId) q = q.eq("empresa_id", filtro.empresaId);
        if (filtro.status)
          q = Array.isArray(filtro.status)
            ? q.in("status", filtro.status)
            : q.eq("status", filtro.status);
        return q;
      });
      return rows.map(({ pagamentos, ...t }): TaxaComSaldo => {
        const valor = Number(t.valor);
        const pago = (pagamentos ?? [])
          .filter((p) => p.status === "confirmado")
          .reduce((s, p) => s + Number(p.valor), 0);
        return {
          ...t,
          valor,
          valor_unitario: Number(t.valor_unitario),
          pago,
          saldo: t.status === "cancelada" ? 0 : Math.max(0, valor - pago),
        };
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Pagamentos
// ---------------------------------------------------------------------------

export interface FiltroPagamentos {
  empresaId?: string;
  status?: Pagamento["status"];
  periodo?: Periodo;
}

export function usePagamentos(filtro: FiltroPagamentos = {}) {
  return useQuery({
    queryKey: ["financeiro", "pagamentos", filtro],
    queryFn: async () => {
      const rows = await todasAsPaginas<PagamentoComTaxa>((from, to) => {
        let q = getSupabase()
          .from("pagamentos")
          .select("*, taxa:taxas(id, numero, competencia)")
          .order("pago_em", { ascending: false })
          .range(from, to);
        if (filtro.empresaId) q = q.eq("empresa_id", filtro.empresaId);
        if (filtro.status) q = q.eq("status", filtro.status);
        if (filtro.periodo)
          q = q
            .gte("pago_em", inicioDoDia(filtro.periodo.de))
            .lt("pago_em", inicioDoDia(somarDias(filtro.periodo.ate, 1)));
        return q;
      });
      return rows.map((p) => ({ ...p, valor: Number(p.valor) }));
    },
  });
}

// ---------------------------------------------------------------------------
// Conciliação
// ---------------------------------------------------------------------------

export interface FiltroConciliacao {
  periodo?: Periodo;
  status?: StatusConciliacao;
  empresaId?: string;
}

export function useConciliacao(filtro: FiltroConciliacao = {}) {
  return useQuery({
    queryKey: ["financeiro", "conciliacao", filtro],
    queryFn: () =>
      todasAsPaginas<ConciliacaoViagem>((from, to) => {
        let q = getSupabase()
          .from("conciliacao_viagens")
          .select("*")
          .order("data", { ascending: false })
          .order("previsto_em", { ascending: false, nullsFirst: false })
          .range(from, to);
        if (filtro.periodo) q = q.gte("data", filtro.periodo.de).lte("data", filtro.periodo.ate);
        if (filtro.status) q = q.eq("status", filtro.status);
        if (filtro.empresaId) q = q.eq("empresa_id", filtro.empresaId);
        return q;
      }),
  });
}

/**
 * Pendências de cobrança: taxas em aberto e divergências de viagens ainda não conferidas
 * (a taxa é calculada pelos acessos na catraca, então divergência pode alterar a cobrança).
 */
export function usePendencias() {
  const taxas = useTaxas({ status: ["pendente", "inadimplente"] });
  const divergencias = useQuery({
    queryKey: ["financeiro", "conciliacao", "pendencias"],
    queryFn: () =>
      todasAsPaginas<ConciliacaoViagem>((from, to) =>
        getSupabase()
          .from("conciliacao_viagens")
          .select("*")
          .eq("status", "divergencia")
          .neq("situacao_conferencia", "conferido")
          .order("data", { ascending: false })
          .range(from, to),
      ),
  });
  return { taxas, divergencias };
}

// ---------------------------------------------------------------------------
// Bilhetes
// ---------------------------------------------------------------------------

export interface FiltroBilhetes {
  periodo: Periodo;
  status?: Bilhete["status"];
  empresaId?: string;
}

export function useBilhetes(filtro: FiltroBilhetes) {
  return useQuery({
    queryKey: ["financeiro", "bilhetes", filtro],
    queryFn: async () => {
      const rows = await todasAsPaginas<BilheteComViagem>((from, to) => {
        let q = getSupabase()
          .from("bilhetes")
          .select("*, viagem:viagens(numero, data)")
          .gte("emitido_em", inicioDoDia(filtro.periodo.de))
          .lt("emitido_em", inicioDoDia(somarDias(filtro.periodo.ate, 1)))
          .order("emitido_em", { ascending: false })
          .range(from, to);
        if (filtro.status) q = q.eq("status", filtro.status);
        if (filtro.empresaId) q = q.eq("empresa_id", filtro.empresaId);
        return q;
      });
      return rows.map((b) => ({ ...b, valor: b.valor === null ? null : Number(b.valor) }));
    },
  });
}

// ---------------------------------------------------------------------------
// Viagens do período (relatórios)
// ---------------------------------------------------------------------------

export interface ViagemResumo {
  id: string;
  data: string;
  status: string;
  tipo: string;
  empresa_id: string | null;
}

export function useViagensPeriodo(periodo: Periodo) {
  return useQuery({
    queryKey: ["financeiro", "viagens", periodo],
    queryFn: () =>
      todasAsPaginas<ViagemResumo>((from, to) =>
        getSupabase()
          .from("viagens")
          .select("id, data, status, tipo, empresa_id")
          .gte("data", periodo.de)
          .lte("data", periodo.ate)
          .order("data")
          .range(from, to),
      ),
  });
}

// ---------------------------------------------------------------------------
// Escrita
// ---------------------------------------------------------------------------

function useInvalidarFinanceiro() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["financeiro"] });
}

export function useFecharCompetencia() {
  const invalidar = useInvalidarFinanceiro();
  return useMutation({
    mutationFn: async (competencia: string) => {
      const { data, error } = await getSupabase().rpc("fechar_competencia", {
        p_competencia: competencia,
      });
      if (error) throw error;
      const geradas = Number(data ?? 0);
      await auditar(
        "Fechar competência",
        "Financeiro",
        `Competência ${competenciaLegivel(competencia)}: ${geradas} taxa(s) gerada(s).`,
      );
      return geradas;
    },
    onSuccess: invalidar,
  });
}

export interface NovoPagamento {
  taxa: Pick<Taxa, "id" | "numero" | "empresa_id">;
  valor: number;
  /** "YYYY-MM-DD" */
  data: string;
  meio: string;
  referencia: string;
}

export function useRegistrarPagamento() {
  const invalidar = useInvalidarFinanceiro();
  return useMutation({
    mutationFn: async (p: NovoPagamento) => {
      if (!(p.valor > 0)) throw new Error("Informe um valor maior que zero.");
      const { error } = await getSupabase()
        .from("pagamentos")
        .insert({
          taxa_id: p.taxa.id,
          empresa_id: p.taxa.empresa_id,
          valor: Math.round(p.valor * 100) / 100,
          // Meio-dia de Brasília para a data não "pular" de dia em outro fuso.
          pago_em: `${p.data}T12:00:00-03:00`,
          meio: p.meio,
          referencia_externa: p.referencia,
          status: "confirmado",
          registrado_por: await usuarioAtual(),
        });
      if (error) throw error;
      await auditar(
        "Registrar pagamento",
        "Financeiro",
        `Pagamento manual de ${p.valor.toFixed(2)} na taxa ${p.taxa.numero} (${p.meio || "meio não informado"}).`,
      );
    },
    onSuccess: invalidar,
  });
}

export function useEstornarPagamento() {
  const invalidar = useInvalidarFinanceiro();
  return useMutation({
    mutationFn: async (p: Pick<PagamentoComTaxa, "id" | "valor" | "taxa">) => {
      const { data, error } = await getSupabase()
        .from("pagamentos")
        .update({ status: "estornado" })
        .eq("id", p.id)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Sem permissão para estornar este pagamento.");
      await auditar(
        "Estornar pagamento",
        "Financeiro",
        `Estorno de ${p.valor.toFixed(2)}${p.taxa ? ` da taxa ${p.taxa.numero}` : ""}.`,
      );
    },
    onSuccess: invalidar,
  });
}

export function useCancelarTaxa() {
  const invalidar = useInvalidarFinanceiro();
  return useMutation({
    mutationFn: async ({ taxa, motivo }: { taxa: Pick<Taxa, "id" | "numero">; motivo: string }) => {
      const { data, error } = await getSupabase()
        .from("taxas")
        .update({ status: "cancelada" })
        .eq("id", taxa.id)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Sem permissão para cancelar esta taxa.");
      await auditar(
        "Cancelar taxa",
        "Financeiro",
        `Taxa ${taxa.numero} cancelada.${motivo ? ` Motivo: ${motivo}` : ""}`,
      );
    },
    onSuccess: invalidar,
  });
}

export function useAtualizarInadimplencia() {
  const invalidar = useInvalidarFinanceiro();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await getSupabase().rpc("atualizar_inadimplencia");
      if (error) throw error;
      return Number(data ?? 0);
    },
    onSuccess: invalidar,
  });
}

export function useConferirViagem() {
  const invalidar = useInvalidarFinanceiro();
  return useMutation({
    mutationFn: async (c: {
      viagemId: string;
      numero: string;
      situacao: Exclude<SituacaoConferencia, "em-analise">;
      observacao: string;
    }) => {
      const conferido = c.situacao === "conferido";
      const { error } = await getSupabase()
        .from("conciliacoes")
        .upsert({
          viagem_id: c.viagemId,
          situacao: c.situacao,
          observacao: c.observacao,
          conferido_por: await usuarioAtual(),
          conferido_em: new Date().toISOString(),
        });
      if (error) throw error;
      await auditar(
        conferido ? "Conferir viagem" : "Marcar para conferência",
        "Conciliação",
        `Viagem ${c.numero || c.viagemId}: ${conferido ? "conferida" : "necessita conferência"}.${
          c.observacao ? ` ${c.observacao}` : ""
        }`,
      );
    },
    onSuccess: invalidar,
  });
}

// ---------------------------------------------------------------------------
// Exportação
// ---------------------------------------------------------------------------

/** Gera e baixa um CSV (separador ";" e BOM para abrir certo no Excel pt-BR). */
export function baixarCsv(nome: string, cabecalho: string[], linhas: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = typeof v === "number" ? String(v).replace(".", ",") : v;
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cabecalho, ...linhas].map((l) => l.map(esc).join(";")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome.endsWith(".csv") ? nome : `${nome}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
