// Acesso ao sistema: sessão (Supabase Auth), perfil do usuário, permissões por papel,
// administração de usuários, parâmetros (public.configuracoes), auditoria e cadastro
// das empresas. Tabelas em supabase/migrations/20261004120000_gestao_base.sql.
import { useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";
import type {
  Bilhete,
  Configuracao,
  EventoEmbarque,
  Papel,
  Perfil,
  RegistroAuditoria,
  Taxa,
  Viagem,
} from "@/services/gestao-tipos";
import type { Empresa } from "@/services/dados-publicos";

// ---------------------------------------------------------------------------
// Sessão
// ---------------------------------------------------------------------------

export interface EstadoSessao {
  /** true até a sessão guardada no navegador ser lida (e sempre no servidor). */
  carregando: boolean;
  sessao: Session | null;
  /** O usuário abriu o link de "Esqueci minha senha" e precisa definir uma nova. */
  recuperacaoSenha: boolean;
}

const ESTADO_INICIAL: EstadoSessao = { carregando: true, sessao: null, recuperacaoSenha: false };

let estado: EstadoSessao = ESTADO_INICIAL;
const ouvintes = new Set<() => void>();
let iniciado = false;

function publicar(novo: Partial<EstadoSessao>) {
  estado = { ...estado, ...novo };
  ouvintes.forEach((o) => o());
}

function iniciarSessao() {
  if (iniciado || typeof window === "undefined") return;
  iniciado = true;
  if (!supabaseConfigured) {
    publicar({ carregando: false });
    return;
  }
  const auth = getSupabase().auth;
  // O link de recuperação chega com "type=recovery" na URL.
  const veioDeRecuperacao = /type=recovery/.test(window.location.hash + window.location.search);
  auth.onAuthStateChange((evento: AuthChangeEvent, sessao) => {
    publicar({
      carregando: false,
      sessao,
      recuperacaoSenha:
        evento === "PASSWORD_RECOVERY" ||
        (estado.recuperacaoSenha && evento !== "SIGNED_OUT") ||
        (veioDeRecuperacao && evento === "INITIAL_SESSION" && Boolean(sessao)),
    });
  });
}

function assinar(ouvinte: () => void) {
  iniciarSessao();
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

/** Sessão do usuário logado. No servidor fica sempre "carregando" (checagem só no cliente). */
export function useSessao(): EstadoSessao {
  return useSyncExternalStore(
    assinar,
    () => estado,
    () => ESTADO_INICIAL,
  );
}

/** Perfil (tabela perfis) do usuário logado. */
export function usePerfil() {
  const { sessao, carregando } = useSessao();
  const userId = sessao?.user.id;
  const query = useQuery({
    queryKey: ["perfil", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("perfis")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as Perfil | null;
    },
  });
  return {
    ...query,
    perfil: query.data ?? null,
    sessao,
    /** Sessão ainda sendo lida ou perfil sendo buscado. */
    carregando: carregando || (Boolean(userId) && query.isLoading),
  };
}

// ---------------------------------------------------------------------------
// Login, cadastro e senha
// ---------------------------------------------------------------------------

/** Traduz as mensagens do Supabase Auth para o português. */
export function traduzirErroAuth(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed"))
    return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Já existe uma conta com este e-mail. Use “Entrar” ou “Esqueci minha senha”.";
  if (m.includes("password should be at least") || m.includes("weak password"))
    return "A senha precisa ter pelo menos 6 caracteres.";
  if (
    m.includes("unable to validate email") ||
    m.includes("invalid email") ||
    (m.includes("email address") && m.includes("invalid"))
  )
    return "E-mail inválido.";
  if (m.includes("rate limit") || m.includes("too many") || m.includes("security purposes"))
    return "Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.";
  if (m.includes("signups not allowed") || m.includes("signup is disabled"))
    return "O cadastro de novas contas está desativado no momento.";
  if (m.includes("same password") || m.includes("different from the old"))
    return "A nova senha precisa ser diferente da anterior.";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "Sem conexão com o servidor. Verifique sua internet.";
  if (m.includes("vite_supabase")) return msg;
  return msg ? `Não foi possível concluir: ${msg}` : "Não foi possível concluir a operação.";
}

export async function entrar(email: string, senha: string) {
  const db = getSupabase();
  const { error } = await db.auth.signInWithPassword({ email: email.trim(), password: senha });
  if (error) throw new Error(traduzirErroAuth(error));
  // Último acesso: falha aqui não impede o login.
  await db.rpc("registrar_acesso").then(
    () => undefined,
    () => undefined,
  );
}

/** Cria a conta. Devolve true se já entrou (sem confirmação de e-mail exigida pelo projeto). */
export async function criarConta(nome: string, email: string, senha: string) {
  const { data, error } = await getSupabase().auth.signUp({
    email: email.trim(),
    password: senha,
    options: {
      data: { nome: nome.trim() },
      emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/` : undefined,
    },
  });
  if (error) throw new Error(traduzirErroAuth(error));
  // Com proteção contra enumeração, e-mail repetido volta sem identidades.
  if (data.user && data.user.identities?.length === 0)
    throw new Error(traduzirErroAuth("User already registered"));
  if (data.session) {
    await getSupabase()
      .rpc("registrar_acesso")
      .then(
        () => undefined,
        () => undefined,
      );
  }
  return Boolean(data.session);
}

export async function recuperarSenha(email: string) {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
    redirectTo: typeof window !== "undefined" ? `${window.location.origin}/` : undefined,
  });
  if (error) throw new Error(traduzirErroAuth(error));
}

export async function definirNovaSenha(senha: string) {
  const { error } = await getSupabase().auth.updateUser({ password: senha });
  if (error) throw new Error(traduzirErroAuth(error));
  publicar({ recuperacaoSenha: false });
}

export async function sair() {
  await getSupabase().auth.signOut();
}

/** Sair e limpar os dados em cache do usuário anterior. */
export function useSair() {
  const queryClient = useQueryClient();
  return async () => {
    await sair();
    queryClient.clear();
  };
}

// ---------------------------------------------------------------------------
// Papéis e permissões
// ---------------------------------------------------------------------------

export const PAPEIS: { valor: Papel; nome: string; descricao: string }[] = [
  {
    valor: "administrador",
    nome: "Administrador",
    descricao: "Acesso completo, inclusive usuários.",
  },
  {
    valor: "gestor",
    nome: "Gestor do terminal",
    descricao: "Todos os módulos, menos a gestão de usuários.",
  },
  {
    valor: "operacional",
    nome: "Operacional",
    descricao: "Viagens, horários, plataformas e embarques.",
  },
  { valor: "financeiro", nome: "Financeiro", descricao: "Taxas, pagamentos e conciliação." },
  {
    valor: "auditor",
    nome: "Auditor",
    descricao: "Consulta de tudo e conferência na conciliação.",
  },
  { valor: "consulta", nome: "Consulta", descricao: "Somente visualização." },
  {
    valor: "empresa",
    nome: "Empresa de transporte",
    descricao: "Apenas os dados da própria empresa.",
  },
];

export const nomePapel = (papel: Papel | null | undefined) =>
  PAPEIS.find((p) => p.valor === papel)?.nome ?? "—";

export type Modulo =
  | "dashboard"
  | "operacao"
  | "painel"
  | "passagens"
  | "controle-embarque"
  | "conciliacao"
  | "empresas"
  | "financeiro"
  | "relatorios"
  | "integracoes"
  | "configuracoes"
  | "usuarios"
  | "parametros"
  | "auditoria";

const TODOS: Modulo[] = [
  "dashboard",
  "operacao",
  "painel",
  "passagens",
  "controle-embarque",
  "conciliacao",
  "empresas",
  "financeiro",
  "relatorios",
  "integracoes",
  "configuracoes",
  "usuarios",
  "parametros",
  "auditoria",
];

const exceto = (...fora: Modulo[]) => TODOS.filter((m) => !fora.includes(m));

const VER: Record<Papel, Modulo[]> = {
  administrador: TODOS,
  gestor: exceto("usuarios"),
  operacional: ["dashboard", "operacao", "painel", "passagens", "controle-embarque", "empresas"],
  financeiro: [
    "dashboard",
    "painel",
    "passagens",
    "conciliacao",
    "empresas",
    "financeiro",
    "relatorios",
  ],
  auditor: exceto("usuarios"),
  consulta: exceto("integracoes", "configuracoes", "usuarios", "parametros", "auditoria"),
  // Só a própria empresa: o RLS do banco limita bilhetes, taxas e pagamentos a ela.
  empresa: ["empresas", "passagens", "financeiro", "painel"],
};

const EDITAR: Record<Papel, Modulo[]> = {
  administrador: TODOS,
  // Financeiro fica com administrador/financeiro: é o que o RLS de taxas e pagamentos permite.
  gestor: exceto("usuarios", "auditoria", "financeiro"),
  operacional: ["operacao", "controle-embarque"],
  financeiro: ["financeiro", "conciliacao"],
  auditor: ["conciliacao"],
  consulta: [],
  empresa: [],
};

export function podeVer(papel: Papel | null | undefined, modulo: Modulo) {
  return Boolean(papel && VER[papel].includes(modulo));
}

export function podeEditar(papel: Papel | null | undefined, modulo: Modulo) {
  return Boolean(papel && EDITAR[papel].includes(modulo));
}

/** Permissões do usuário logado num módulo. */
export function usePermissao(modulo: Modulo) {
  const { perfil } = usePerfil();
  const papel = perfil?.ativo ? perfil.papel : null;
  return { ver: podeVer(papel, modulo), editar: podeEditar(papel, modulo), papel, perfil };
}

/** Módulo a que pertence uma rota administrativa (null = rota sem restrição). */
export function moduloDaRota(pathname: string): Modulo | null {
  const seg = pathname.split("/").filter(Boolean)[0] ?? "";
  const mapa: Record<string, Modulo> = {
    dashboard: "dashboard",
    operacao: "operacao",
    painel: "painel",
    passagens: "passagens",
    "controle-embarque": "controle-embarque",
    conciliacao: "conciliacao",
    empresas: "empresas",
    financeiro: "financeiro",
    relatorios: "relatorios",
    integracoes: "integracoes",
    configuracoes: "configuracoes",
  };
  return mapa[seg] ?? null;
}

/** Primeira tela depois do login: usuário de empresa vai para a página da própria empresa. */
export function rotaInicial(perfil: Pick<Perfil, "papel" | "empresa_id"> | null) {
  if (perfil?.papel === "empresa" && perfil.empresa_id)
    return { caminho: `/empresas/${perfil.empresa_id}`, empresaId: perfil.empresa_id };
  return { caminho: "/dashboard", empresaId: null };
}

export const iniciais = (nome: string, email = "") => {
  const partes = (nome || email.split("@")[0] || "?")
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean);
  return (
    (partes[0]?.[0] ?? "?") + (partes.length > 1 ? partes[partes.length - 1][0] : "")
  ).toUpperCase();
};

/** Registra uma ação do usuário na auditoria. Falha na auditoria não desfaz a ação. */
export async function registrarAuditoria(acao: string, modulo: string, descricao: string) {
  const { error } = await getSupabase().rpc("registrar_auditoria", {
    p_acao: acao,
    p_modulo: modulo,
    p_descricao: descricao,
  });
  if (error) console.warn("Auditoria não registrada:", error.message);
}

// ---------------------------------------------------------------------------
// Usuários (somente administrador — RLS)
// ---------------------------------------------------------------------------

export function usePerfis(habilitado = true) {
  return useQuery({
    queryKey: ["perfis"],
    enabled: habilitado,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("perfis")
        .select("*")
        .order("ativo")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data as Perfil[];
    },
  });
}

export type AlteracaoPerfil = Partial<Pick<Perfil, "papel" | "ativo" | "empresa_id" | "nome">>;

export function useAtualizarPerfil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      perfil,
      mudancas,
      descricao,
    }: {
      perfil: Perfil;
      mudancas: AlteracaoPerfil;
      descricao: string;
    }) => {
      const dados = { ...mudancas };
      if (dados.papel && dados.papel !== "empresa") dados.empresa_id = null;
      const { error } = await getSupabase()
        .from("perfis")
        .update(dados)
        .eq("user_id", perfil.user_id);
      if (error) throw new Error(traduzirErroBanco(error.message));
      await registrarAuditoria("Alterar usuário", "Configurações", descricao);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["perfis"] });
      queryClient.invalidateQueries({ queryKey: ["perfil"] });
      queryClient.invalidateQueries({ queryKey: ["auditoria"] });
    },
  });
}

function traduzirErroBanco(msg: string) {
  if (msg.includes("perfis_empresa_vinculada"))
    return "Usuário do tipo empresa precisa estar vinculado a uma empresa.";
  if (msg.includes("row-level security") || msg.includes("permission denied"))
    return "Você não tem permissão para esta alteração.";
  return msg;
}

// ---------------------------------------------------------------------------
// Parâmetros (public.configuracoes)
// ---------------------------------------------------------------------------

export function useConfiguracoes() {
  return useQuery({
    queryKey: ["configuracoes"],
    // O formulário de parâmetros é preenchido a partir destes dados; não recarregar no foco.
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await getSupabase().from("configuracoes").select("*").order("chave");
      if (error) throw error;
      return data as Configuracao[];
    },
  });
}

export function useSalvarConfiguracoes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (valores: { chave: string; valor: unknown; anterior: unknown }[]) => {
      const db = getSupabase();
      for (const v of valores) {
        const { data, error } = await db
          .from("configuracoes")
          .update({ valor: v.valor, atualizado_em: new Date().toISOString() })
          .eq("chave", v.chave)
          .select("chave");
        if (error) throw new Error(traduzirErroBanco(error.message));
        if (!data?.length) throw new Error("Você não tem permissão para alterar os parâmetros.");
        await registrarAuditoria(
          "Alterar parâmetro",
          "Configurações",
          `${v.chave}: ${JSON.stringify(v.anterior)} → ${JSON.stringify(v.valor)}`,
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configuracoes"] });
      queryClient.invalidateQueries({ queryKey: ["auditoria"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Auditoria
// ---------------------------------------------------------------------------

export const AUDITORIA_POR_PAGINA = 50;

export function useAuditoria(modulo: string | null, pagina: number, habilitado = true) {
  return useQuery({
    queryKey: ["auditoria", modulo, pagina],
    enabled: habilitado,
    placeholderData: (anterior) => anterior,
    queryFn: async () => {
      const inicio = pagina * AUDITORIA_POR_PAGINA;
      let q = getSupabase()
        .from("auditoria")
        .select("*", { count: "exact" })
        .order("ocorrido_em", { ascending: false })
        .range(inicio, inicio + AUDITORIA_POR_PAGINA - 1);
      if (modulo) q = q.eq("modulo", modulo);
      const { data, error, count } = await q;
      if (error) throw error;
      return { registros: data as RegistroAuditoria[], total: count ?? 0 };
    },
  });
}

export function useModulosAuditoria(habilitado = true) {
  return useQuery({
    queryKey: ["auditoria", "modulos"],
    enabled: habilitado,
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc("modulos_auditoria");
      if (error) throw error;
      return (data as unknown[]).map((m) =>
        typeof m === "string" ? m : String((m as Record<string, unknown>).modulos_auditoria),
      );
    },
  });
}

// ---------------------------------------------------------------------------
// Cadastro de empresas
// ---------------------------------------------------------------------------

/** Empresa com os campos de cadastro do terminal (useEmpresas já traz todas as colunas). */
export interface EmpresaCadastro extends Empresa {
  nome_fantasia: string | null;
  codigo_antt: string | null;
  contato: string | null;
  email: string | null;
  telefone: string | null;
  cor: string | null;
  opera_no_terminal: boolean;
}

export type DadosCadastroEmpresa = Pick<
  EmpresaCadastro,
  "nome_fantasia" | "codigo_antt" | "contato" | "email" | "telefone" | "cor" | "opera_no_terminal"
>;

export const nomeExibicao = (e: Pick<EmpresaCadastro, "nome_fantasia" | "razao_social">) =>
  e.nome_fantasia?.trim() || e.razao_social;

export function useAtualizarEmpresa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ empresa, dados }: { empresa: Empresa; dados: DadosCadastroEmpresa }) => {
      const { data, error } = await getSupabase()
        .from("empresas")
        .update(dados)
        .eq("id", empresa.id)
        .select("id");
      if (error) throw new Error(traduzirErroBanco(error.message));
      if (!data?.length) throw new Error("Você não tem permissão para editar esta empresa.");
      await registrarAuditoria(
        "Editar cadastro",
        "Empresas",
        `Cadastro de ${empresa.razao_social} atualizado.`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["empresas"] });
      queryClient.invalidateQueries({ queryKey: ["linhas"] });
      queryClient.invalidateQueries({ queryKey: ["auditoria"] });
    },
  });
}

/** Viagens da empresa numa data (YYYY-MM-DD, fuso do terminal). */
export function useViagensDaEmpresa(empresaId: string | undefined, data: string) {
  return useQuery({
    queryKey: ["viagens", "empresa", empresaId, data],
    enabled: Boolean(empresaId),
    queryFn: async () => {
      const { data: rows, error } = await getSupabase()
        .from("viagens")
        .select("*")
        .eq("empresa_id", empresaId!)
        .eq("data", data)
        .order("previsto_em", { nullsFirst: false });
      if (error) throw error;
      return rows as Viagem[];
    },
  });
}

/** Leituras de catraca e bilhetes ligados a um conjunto de viagens. */
export function useEmbarquesDasViagens(viagemIds: string[]) {
  const chave = [...viagemIds].sort().join(",");
  return useQuery({
    queryKey: ["embarques", "viagens", chave],
    enabled: viagemIds.length > 0,
    queryFn: async () => {
      const db = getSupabase();
      const [eventos, bilhetes] = await Promise.all([
        db.from("eventos_embarque").select("*").in("viagem_id", viagemIds),
        db.from("bilhetes").select("*").in("viagem_id", viagemIds),
      ]);
      if (eventos.error) throw eventos.error;
      if (bilhetes.error) throw bilhetes.error;
      return {
        eventos: eventos.data as EventoEmbarque[],
        bilhetes: bilhetes.data as Bilhete[],
      };
    },
  });
}

/** Taxas de embarque cobradas da empresa (mais recentes primeiro). */
export function useTaxasDaEmpresa(empresaId: string | undefined) {
  return useQuery({
    queryKey: ["taxas", "empresa", empresaId],
    enabled: Boolean(empresaId),
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("taxas")
        .select("*")
        .eq("empresa_id", empresaId!)
        .order("competencia", { ascending: false });
      if (error) throw error;
      return data as Taxa[];
    },
  });
}

/** Taxas de todas as empresas (lista de empresas): só leitura, por competência. */
export function useTaxasTodas(habilitado = true) {
  return useQuery({
    queryKey: ["taxas", "todas"],
    enabled: habilitado,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("taxas")
        .select("id, empresa_id, competencia, valor, status");
      if (error) throw error;
      return data as Pick<Taxa, "id" | "empresa_id" | "competencia" | "valor" | "status">[];
    },
  });
}

/** Contagem de viagens de hoje por empresa. */
export function useViagensDoDia(data: string) {
  return useQuery({
    queryKey: ["viagens", "dia", data, "por-empresa"],
    queryFn: async () => {
      const { data: rows, error } = await getSupabase()
        .from("viagens")
        .select("id, empresa_id, status")
        .eq("data", data);
      if (error) throw error;
      return rows as Pick<Viagem, "id" | "empresa_id" | "status">[];
    },
  });
}
