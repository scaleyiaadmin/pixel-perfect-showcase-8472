// Operação do terminal: viagens do dia, plataformas e embarques (catraca).
// Viagens são geradas da grade pública por public.gerar_viagens (cron diário ou botão)
// e atualizadas pela equipe nas telas ou pela integração (supabase/functions/ingestao).
// SQL em supabase/migrations/20261004120200_operacao.sql.
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase";
import { hojeISO, hora, TZ } from "@/lib/format";
import type {
  Bilhete,
  Conciliacao,
  EventoEmbarque,
  Plataforma,
  RelatoEmpresa,
  StatusViagem,
  TipoViagem,
  Viagem,
} from "@/services/gestao-tipos";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface EmpresaResumo {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
}

export interface LinhaResumo {
  id: string;
  codigo: string;
  descricao: string;
  fonte: "ANTT" | "DER-MG";
  cidades_atendidas: string[];
}

export interface ViagemDetalhada extends Viagem {
  empresa: EmpresaResumo | null;
  plataforma: Plataforma | null;
  linha: LinhaResumo | null;
}

export interface ViagemCompleta extends ViagemDetalhada {
  bilhetes: Bilhete[];
  eventos: EventoEmbarque[];
  relato: RelatoEmpresa | null;
  conciliacao: Conciliacao | null;
}

export interface EmbarquesViagem {
  viagem_id: string;
  data: string;
  acessos: number;
  reentradas: number;
  negados: number;
  ultimo_evento_em: string | null;
}

export interface EmbarquesDia {
  dia: string;
  acessos: number;
  reentradas: number;
  negados: number;
}

export interface EventoEmbarqueDetalhado extends EventoEmbarque {
  viagem:
    | (Pick<Viagem, "id" | "numero" | "origem" | "destino" | "previsto_em" | "tipo"> & {
        empresa: EmpresaResumo | null;
      })
    | null;
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

const VIAGEM_COLS =
  "*, empresa:empresas(id, razao_social, nome_fantasia), plataforma:plataformas(*), linha:linhas(id, codigo, descricao, fonte, cidades_atendidas)";

/** Atualização "ao vivo" das telas de operação e dos painéis. */
export const AO_VIVO_MS = 30_000;

async function paginado<T>(
  build: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>,
) {
  const page = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await build(from, from + page - 1);
    if (error) throw error;
    const lote = (data ?? []) as T[];
    rows.push(...lote);
    if (lote.length < page) return rows;
  }
}

/** Data de hoje no fuso do terminal; null até montar no navegador (evita divergência no SSR). */
export function useHoje() {
  const [hoje, setHoje] = useState<string | null>(null);
  useEffect(() => {
    setHoje(hojeISO());
    const id = window.setInterval(() => setHoje(hojeISO()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return hoje;
}

export function useViagensDoDia(data: string | null, opts: { aoVivo?: boolean } = {}) {
  return useQuery({
    queryKey: ["viagens", data],
    enabled: Boolean(data),
    refetchInterval: opts.aoVivo === false ? false : AO_VIVO_MS,
    queryFn: () =>
      paginado<ViagemDetalhada>((from, to) =>
        getSupabase()
          .from("viagens")
          .select(VIAGEM_COLS)
          .eq("data", data!)
          .order("previsto_em", { ascending: true, nullsFirst: false })
          .order("numero")
          .range(from, to),
      ),
  });
}

export function useViagem(id: string) {
  return useQuery({
    queryKey: ["viagem", id],
    refetchInterval: AO_VIVO_MS,
    queryFn: async (): Promise<ViagemCompleta | null> => {
      const db = getSupabase();
      const { data: viagem, error } = await db
        .from("viagens")
        .select(VIAGEM_COLS)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!viagem) return null;
      const [bilhetes, eventos, relato, conciliacao] = await Promise.all([
        db.from("bilhetes").select("*").eq("viagem_id", id).order("emitido_em"),
        db
          .from("eventos_embarque")
          .select("*")
          .eq("viagem_id", id)
          .order("ocorrido_em", { ascending: false }),
        db.from("relatos_empresa").select("*").eq("viagem_id", id).maybeSingle(),
        db.from("conciliacoes").select("*").eq("viagem_id", id).maybeSingle(),
      ]);
      for (const r of [bilhetes, eventos, relato]) if (r.error) throw r.error;
      return {
        ...(viagem as ViagemDetalhada),
        bilhetes: (bilhetes.data ?? []) as Bilhete[],
        eventos: (eventos.data ?? []) as EventoEmbarque[],
        relato: (relato.data ?? null) as RelatoEmpresa | null,
        // Conciliação é lida por quem tem acesso; sem permissão fica nula.
        conciliacao: conciliacao.error ? null : ((conciliacao.data ?? null) as Conciliacao | null),
      };
    },
  });
}

export function usePlataformas(opts: { aoVivo?: boolean } = {}) {
  return useQuery({
    queryKey: ["plataformas"],
    refetchInterval: opts.aoVivo ? AO_VIVO_MS : false,
    queryFn: async () => {
      const { data, error } = await getSupabase().from("plataformas").select("*");
      if (error) throw error;
      return ((data ?? []) as Plataforma[]).sort((a, b) =>
        a.numero.localeCompare(b.numero, "pt-BR", { numeric: true }),
      );
    },
  });
}

/** Contagem de catraca por viagem da data. */
export function useEmbarquesPorViagem(data: string | null) {
  return useQuery({
    queryKey: ["embarques_por_viagem", data],
    enabled: Boolean(data),
    refetchInterval: AO_VIVO_MS,
    queryFn: async () => {
      const rows = await paginado<EmbarquesViagem>((from, to) =>
        getSupabase().from("embarques_por_viagem").select("*").eq("data", data!).range(from, to),
      );
      return new Map(rows.map((r) => [r.viagem_id, r]));
    },
  });
}

/** Totais de catraca por dia a partir de `desde` (YYYY-MM-DD). */
export function useEmbarquesPorDia(desde: string | null) {
  return useQuery({
    queryKey: ["embarques_por_dia", desde],
    enabled: Boolean(desde),
    refetchInterval: AO_VIVO_MS,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("embarques_por_dia")
        .select("*")
        .gte("dia", desde!)
        .order("dia");
      if (error) throw error;
      return (data ?? []) as EmbarquesDia[];
    },
  });
}

/** Leituras de catraca de um dia (no fuso do terminal), mais recentes primeiro. */
export function useEventosEmbarque(data: string | null) {
  return useQuery({
    queryKey: ["eventos_embarque", data],
    enabled: Boolean(data),
    refetchInterval: AO_VIVO_MS,
    queryFn: () => {
      const { inicio, fim } = limitesDoDia(data!);
      return paginado<EventoEmbarqueDetalhado>((from, to) =>
        getSupabase()
          .from("eventos_embarque")
          .select(
            "*, viagem:viagens(id, numero, origem, destino, previsto_em, tipo, empresa:empresas(id, razao_social, nome_fantasia))",
          )
          .gte("ocorrido_em", inicio)
          .lt("ocorrido_em", fim)
          .order("ocorrido_em", { ascending: false })
          .range(from, to),
      );
    },
  });
}

// ---------------------------------------------------------------------------
// Escrita
// ---------------------------------------------------------------------------

async function auditar(acao: string, descricao: string) {
  // Falha na auditoria não deve desfazer a ação já gravada.
  await getSupabase().rpc("registrar_auditoria", {
    p_acao: acao,
    p_modulo: "Operação",
    p_descricao: descricao,
  });
}

/** Update que falha quando o RLS não deixa alterar nada (o Supabase não acusa erro). */
async function atualizar(tabela: string, id: string, patch: Record<string, unknown>) {
  const { data, error } = await getSupabase().from(tabela).update(patch).eq("id", id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Sem permissão para alterar este registro. Entre com um usuário da operação.");
  }
}

function useInvalidarOperacao() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["viagens"] });
    void qc.invalidateQueries({ queryKey: ["viagem"] });
    void qc.invalidateQueries({ queryKey: ["plataformas"] });
  };
}

export function useGerarViagens() {
  const invalidar = useInvalidarOperacao();
  return useMutation({
    mutationFn: async (data: string) => {
      const { data: criadas, error } = await getSupabase().rpc("gerar_viagens", { p_data: data });
      if (error) throw error;
      await auditar(
        "Gerar viagens",
        `Viagens de ${dataBR(data)} geradas da grade pública (${criadas ?? 0} novas).`,
      );
      return (criadas ?? 0) as number;
    },
    onSuccess: invalidar,
  });
}

export type AcaoViagem =
  | { acao: "chegada" }
  | { acao: "plataforma"; plataforma_id: string | null }
  | { acao: "embarque" }
  | { acao: "ultima-chamada" }
  | { acao: "partida" }
  | { acao: "cancelar"; motivo: string }
  | { acao: "reabrir" }
  | { acao: "editar"; previsto_em: string | null; veiculo: string; observacao: string };

export function useAcaoViagem() {
  const invalidar = useInvalidarOperacao();
  return useMutation({
    mutationFn: async ({ viagem, ...a }: AcaoViagem & { viagem: ViagemDetalhada }) => {
      const agora = new Date().toISOString();
      const ref = `${descreverViagem(viagem)}`;
      let patch: Record<string, unknown>;
      let rotulo: string;
      switch (a.acao) {
        case "chegada":
          // Viagem que termina aqui se encerra com a chegada.
          patch = {
            chegou_em: agora,
            ...(viagem.tipo === "chegada" ? { status: "realizada" } : {}),
          };
          rotulo = "Registrar chegada";
          break;
        case "plataforma":
          patch = { plataforma_id: a.plataforma_id };
          rotulo = "Definir plataforma";
          break;
        case "embarque":
          patch = { status: "embarque" };
          rotulo = "Iniciar embarque";
          break;
        case "ultima-chamada":
          patch = { status: "ultima-chamada" };
          rotulo = "Última chamada";
          break;
        case "partida":
          patch = { partiu_em: agora, status: "partiu" };
          rotulo = "Registrar partida";
          break;
        case "cancelar":
          patch = {
            status: "cancelada",
            observacao: [viagem.observacao, `Cancelada: ${a.motivo}`].filter(Boolean).join(" · "),
          };
          rotulo = "Cancelar viagem";
          break;
        case "reabrir":
          patch = { status: "prevista", partiu_em: null };
          rotulo = "Reabrir viagem";
          break;
        case "editar":
          patch = { previsto_em: a.previsto_em, veiculo: a.veiculo, observacao: a.observacao };
          rotulo = "Editar viagem";
          break;
      }
      await atualizar("viagens", viagem.id, patch);
      await auditar(rotulo, a.acao === "cancelar" ? `${ref} — motivo: ${a.motivo}` : ref);
    },
    onSuccess: invalidar,
  });
}

export interface NovaViagem {
  data: string;
  hora: string; // HH:MM no fuso do terminal
  tipo: TipoViagem;
  empresa_id: string | null;
  numero: string;
  origem: string;
  destino: string;
  plataforma_id: string | null;
  veiculo: string;
  observacao: string;
}

export function useNovaViagem() {
  const invalidar = useInvalidarOperacao();
  return useMutation({
    mutationFn: async (v: NovaViagem) => {
      const { hora: h, ...resto } = v;
      const { error } = await getSupabase()
        .from("viagens")
        .insert({ ...resto, previsto_em: h ? instanteNoTerminal(v.data, h) : null });
      if (error) throw error;
      await auditar(
        "Criar viagem",
        `Viagem lançada manualmente: ${v.origem} → ${v.destino}, ${dataBR(v.data)}${h ? ` ${h}` : ""}.`,
      );
    },
    onSuccess: invalidar,
  });
}

export function useSalvarPlataforma() {
  const invalidar = useInvalidarOperacao();
  return useMutation({
    mutationFn: async (p: Omit<Plataforma, "id"> & { id?: string }) => {
      const { id, ...dados } = p;
      if (id) {
        await atualizar("plataformas", id, dados);
      } else {
        const { error } = await getSupabase().from("plataformas").insert(dados);
        if (error) throw error;
      }
      await auditar(
        id ? "Editar plataforma" : "Cadastrar plataforma",
        `Plataforma ${p.numero}${p.em_manutencao ? " (em manutenção)" : ""}${p.ativa ? "" : " (inativa)"}.`,
      );
    },
    onSuccess: invalidar,
  });
}

export function useExcluirPlataforma() {
  const invalidar = useInvalidarOperacao();
  return useMutation({
    mutationFn: async (p: Plataforma) => {
      const { data, error } = await getSupabase()
        .from("plataformas")
        .delete()
        .eq("id", p.id)
        .select("id");
      if (error) {
        if (error.code === "23503") {
          throw new Error("A plataforma já foi usada em viagens. Desative-a em vez de excluir.");
        }
        throw error;
      }
      if (!data || data.length === 0) throw new Error("Sem permissão para excluir a plataforma.");
      await auditar("Excluir plataforma", `Plataforma ${p.numero}.`);
    },
    onSuccess: invalidar,
  });
}

// ---------------------------------------------------------------------------
// Regras e formatação
// ---------------------------------------------------------------------------

export const nomeEmpresaViagem = (v: Pick<ViagemDetalhada, "empresa" | "linha">) =>
  v.empresa?.nome_fantasia ||
  v.empresa?.razao_social ||
  (v.linha?.fonte === "DER-MG" ? "Intermunicipal" : "Não informada");

export const horaPrevista = (v: Pick<Viagem, "previsto_em">) =>
  v.previsto_em ? hora(v.previsto_em) : "—";

export const descreverViagem = (
  v: Pick<Viagem, "numero" | "origem" | "destino" | "previsto_em" | "data">,
) =>
  `${v.numero ? `${v.numero} · ` : ""}${v.origem} → ${v.destino} (${dataBR(v.data)}${v.previsto_em ? ` ${hora(v.previsto_em)}` : ""})`;

export const tipoViagemLabel: Record<TipoViagem, string> = {
  partida: "Partida",
  chegada: "Chegada",
  passagem: "Passagem",
};

/** Viagem que não se encerrou nem foi cancelada. */
export const emAberto = (v: Pick<Viagem, "status">) =>
  !(["partiu", "realizada", "cancelada"] as StatusViagem[]).includes(v.status);

/** Viagem que está ocupando a plataforma agora. */
export function ocupaPlataforma(v: Viagem) {
  if (!v.plataforma_id || !emAberto(v)) return false;
  return (
    v.status === "embarque" ||
    v.status === "ultima-chamada" ||
    (v.chegou_em !== null && v.partiu_em === null)
  );
}

/** "2026-10-04" → "04/10/2026" */
export const dataBR = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Soma dias a uma data YYYY-MM-DD. */
export function somarDias(iso: string, dias: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Início e fim (exclusivo) do dia no fuso do terminal, em ISO UTC. Brasília é UTC-3 fixo. */
export function limitesDoDia(iso: string) {
  return { inicio: `${iso}T00:00:00-03:00`, fim: `${somarDias(iso, 1)}T00:00:00-03:00` };
}

/** Data + hora local do terminal → ISO com fuso. */
export const instanteNoTerminal = (data: string, hhmm: string) => `${data}T${hhmm}:00-03:00`;

/** HH:MM de um timestamptz no fuso do terminal (para inputs type=time). */
export const horaInput = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString("pt-BR", {
        timeZone: TZ,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "";

/** Minutos desde 00:00 no fuso do terminal. */
export function minutosNoTerminal(iso: string | Date) {
  const [h, m] = horaInput(typeof iso === "string" ? iso : iso.toISOString())
    .split(":")
    .map(Number);
  return h * 60 + m;
}

export function mensagemErro(e: unknown) {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e)
    return String((e as { message: unknown }).message);
  return "Falha ao gravar no banco de dados.";
}
