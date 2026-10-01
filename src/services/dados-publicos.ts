// Leitura dos dados públicos (ANTT + DER-MG) gravados no Supabase por
// scripts/importar-dados-publicos.ts. Tabelas em supabase/migrations.
import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase";

export type Fonte = "ANTT" | "DER-MG";

export interface Empresa {
  id: string;
  cnpj: string;
  razao_social: string;
  fonte: Fonte;
  ativa: boolean;
}

export interface Linha {
  id: string;
  fonte: Fonte;
  codigo: string;
  numero: string | null;
  descricao: string;
  empresa_id: string | null;
  origem: string;
  uf_origem: string;
  destino: string;
  uf_destino: string;
  ambito: "interestadual" | "intermunicipal";
  relacao_manhuacu: "origem" | "destino" | "passagem";
  cidades_atendidas: string[];
  ativa: boolean;
  empresa: Pick<Empresa, "id" | "razao_social"> | null;
}

export interface Horario {
  id: string;
  linha_id: string;
  sentido: "ida" | "volta";
  hora: string;
  tipo_servico: string;
  parte_de_manhuacu: boolean;
  dias_semana: number[];
  feriado: boolean | null;
  meses: number[];
  competencia: string;
  linha: Linha;
}

export interface PassagemMensal {
  mes_emissao: string;
  mes_viagem: string;
  origem: string;
  uf_origem: string;
  destino: string;
  uf_destino: string;
  tipo_servico: string;
  tipo_gratuidade: string;
  valor_medio: number;
  quantidade: number;
}

export interface Importacao {
  fonte: string;
  recurso: string;
  competencia: string;
  registros: number;
  executado_em: string;
}

const LINHA_COLS = "*, empresa:empresas(id, razao_social)";

// O Supabase devolve no máximo 1000 linhas por chamada.
async function selectAll<T>(table: string, columns: string, order: string): Promise<T[]> {
  const db = getSupabase();
  const page = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await db
      .from(table)
      .select(columns)
      .order(order)
      .range(from, from + page - 1);
    if (error) throw error;
    rows.push(...(data as T[]));
    if (!data || data.length < page) return rows;
  }
}

const fiveMinutes = 5 * 60 * 1000;

export function useEmpresas() {
  return useQuery({
    queryKey: ["empresas"],
    staleTime: fiveMinutes,
    queryFn: () => selectAll<Empresa>("empresas", "*", "razao_social"),
  });
}

export function useLinhas() {
  return useQuery({
    queryKey: ["linhas"],
    staleTime: fiveMinutes,
    queryFn: async () =>
      (await selectAll<Linha>("linhas", LINHA_COLS, "descricao")).filter((l) => l.ativa),
  });
}

export function useHorarios() {
  return useQuery({
    queryKey: ["horarios"],
    staleTime: fiveMinutes,
    queryFn: async () =>
      (await selectAll<Horario>("horarios", `*, linha:linhas(${LINHA_COLS})`, "hora")).filter(
        (h) => h.linha?.ativa,
      ),
  });
}

export function usePassagensMensais() {
  return useQuery({
    queryKey: ["passagens_mensais"],
    staleTime: fiveMinutes,
    queryFn: () => selectAll<PassagemMensal>("passagens_mensais", "*", "mes_emissao"),
  });
}

export function useImportacoes() {
  return useQuery({
    queryKey: ["importacoes"],
    staleTime: fiveMinutes,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("importacoes")
        .select("*")
        .order("executado_em", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as Importacao[];
    },
  });
}

// ---------------------------------------------------------------------------
// Regras sobre os dados
// ---------------------------------------------------------------------------

/** O horário vale para essa data (dia da semana e mês de operação)? */
export function operaEm(h: Pick<Horario, "dias_semana" | "meses">, date: Date) {
  const mes = date.getMonth() + 1;
  return h.dias_semana.includes(date.getDay()) && (h.meses.length === 0 || h.meses.includes(mes));
}

/** Partidas do terminal de Manhuaçu na data, ordenadas pela hora. */
export function partidasDoDia(horarios: Horario[], date: Date) {
  return horarios.filter((h) => h.parte_de_manhuacu && operaEm(h, date));
}

/** Destino de quem embarca em Manhuaçu naquele horário. */
export function destinoDaPartida(h: Horario) {
  return h.sentido === "ida" ? h.linha.destino : h.linha.origem;
}

export const horaCurta = (hora: string) => hora.slice(0, 5);

export const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function descreverDias(dias: number[]) {
  if (dias.length === 7) return "Diária";
  if (dias.length === 6 && !dias.includes(0)) return "Seg a Sáb";
  if (dias.length === 5 && [1, 2, 3, 4, 5].every((d) => dias.includes(d))) return "Seg a Sex";
  return dias.map((d) => DIAS_CURTOS[d]).join(", ");
}

export const nomeEmpresa = (l: Pick<Linha, "empresa" | "fonte">) =>
  l.empresa?.razao_social ?? (l.fonte === "DER-MG" ? "Não informada pelo DER-MG" : "—");

export const formatCnpj = (cnpj: string) =>
  cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");

/** "2026-08-01" → "08/2026" */
export const mesAno = (iso: string) => `${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
