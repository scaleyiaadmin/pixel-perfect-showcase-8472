// SisRodov Manhuaçu — recepção de dados de sistemas externos.
//
// Empresas de ônibus (os mesmos logs que já enviam à ANTT/MONITRIIP), catracas e o sistema
// de pagamento enviam eventos para cá. Autenticação por chave própria da integração
// (header x-api-key ou Authorization: Bearer), criada na tela Integrações.
// Documentação dos formatos: supabase/functions/ingestao/README.md.
//
// Deploy: supabase functions deploy ingestao --no-verify-jwt
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const TZ = "America/Sao_Paulo";
/** Fuso fixo do terminal (o Brasil não tem horário de verão desde 2019). */
const OFFSET = "-03:00";
/** Código IBGE do município de Manhuaçu-MG. */
const IBGE_MANHUACU = "3139409";
/** Coordenadas aproximadas do terminal e raio para considerar "no terminal" (km). */
const TERMINAL = { lat: -20.2577, lon: -42.0283, raioKm: 5 };
const MAX_EVENTOS = 500;
const MAX_BYTES = 5 * 1024 * 1024;
/** Diferença máxima para casar a hora informada com um horário publicado (min). */
const TOLERANCIA_HORARIO_MIN = 30;
/** Diferença máxima para casar com uma viagem já existente no dia (min). */
const TOLERANCIA_VIAGEM_MIN = 120;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type, x-client-info, apikey",
};

type TipoEvento =
  | "venda-passagem"
  | "cancelamento-passagem"
  | "embarque"
  | "inicio-fim-viagem"
  | "relato-viagem"
  | "pagamento";

type TipoIntegracao = "empresa" | "catraca" | "pagamento" | "outro";

const PERMITIDOS: Record<TipoIntegracao, TipoEvento[]> = {
  empresa: ["venda-passagem", "cancelamento-passagem", "embarque", "inicio-fim-viagem", "relato-viagem"],
  outro: ["venda-passagem", "cancelamento-passagem", "embarque", "inicio-fim-viagem", "relato-viagem"],
  catraca: ["embarque"],
  pagamento: ["pagamento"],
};

/** Nomes aceitos no campo "tipo" (inclui os nomes dos serviços MONITRIIP). */
const ALIAS_TIPO: Record<string, TipoEvento> = {
  "venda-passagem": "venda-passagem",
  venda: "venda-passagem",
  inserirlogvendapassagem: "venda-passagem",
  "cancelamento-passagem": "cancelamento-passagem",
  cancelamento: "cancelamento-passagem",
  inserirlogcancelarpassagem: "cancelamento-passagem",
  embarque: "embarque",
  catraca: "embarque",
  inserirlogbilheteembarque: "embarque",
  inserirlogleitorcartaorfid: "embarque",
  "inicio-fim-viagem": "inicio-fim-viagem",
  "inicio-fim": "inicio-fim-viagem",
  inserirloginiciofimviagemregular: "inicio-fim-viagem",
  "relato-viagem": "relato-viagem",
  relato: "relato-viagem",
  pagamento: "pagamento",
};

/** Caminhos MONITRIIP: a empresa pode trocar só a URL base. */
const ALIAS_CAMINHO: [RegExp, TipoEvento][] = [
  [/bilhetes\/venda\/?$/, "venda-passagem"],
  [/bilhetes\/cancelamento\/?$/, "cancelamento-passagem"],
  [/bilhetes\/embarque\/?$/, "embarque"],
  [/cartoes\/leitura-rfid\/?$/, "embarque"],
  [/viagens\/regular\/inicio-fim\/?$/, "inicio-fim-viagem"],
];

/** idLog do MONITRIIP → tipo. Logs fora desta lista são ignorados (não interessam ao terminal). */
const ID_LOG: Record<string, TipoEvento> = {
  "0": "venda-passagem",
  "11": "cancelamento-passagem",
  "9": "embarque",
  "10": "embarque",
  "7": "inicio-fim-viagem",
};

/** Dados pessoais que a rodoviária não precisa: descartados antes de gravar o payload. */
const CAMPOS_PESSOAIS = [
  "nomePassageiro",
  "cpfPassageiro",
  "documentoIdentificacaoPassageiro",
  "tipoDocumentoIdentificacaoPassageiro",
  "dataNascimentoPassageiro",
  "celularPassageiro",
  "cpfMotorista",
  "nome_passageiro",
  "cpf_passageiro",
  "documento_passageiro",
];

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

type Dados = Record<string, unknown>;

class ErroItem extends Error {}
class Ignorado extends Error {}

const erro = (msg: string): never => {
  throw new ErroItem(msg);
};
const ignorar = (msg: string): never => {
  throw new Ignorado(msg);
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });
}

function campo(d: Dados, ...nomes: string[]): unknown {
  for (const n of nomes) {
    const v = d[n];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

function texto(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

function numero(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

const digitos = (v: unknown) => texto(v)?.replace(/\D/g, "") || undefined;

const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const ehManhuacu = (s?: string) => !!s && normalizar(s).includes("manhuacu");

/** Aceita "2026-10-04T10:00:00-03:00"; sem fuso, assume o do terminal. */
function instante(v: unknown, nomeCampo: string): string | undefined {
  const s = texto(v);
  if (!s) return undefined;
  const comFuso = /([zZ]|[+-]\d{2}:?\d{2})$/.test(s) ? s : `${s.replace(" ", "T")}${OFFSET}`;
  const d = new Date(comFuso);
  if (Number.isNaN(d.getTime())) erro(`Campo ${nomeCampo} com data/hora inválida: "${s}".`);
  return d.toISOString();
}

const dataLocal = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: TZ });
const horaLocal = (iso: string) =>
  new Date(iso).toLocaleTimeString("sv-SE", { timeZone: TZ, hour12: false }).slice(0, 8);

function dataISO(v: unknown, nomeCampo: string): string | undefined {
  const s = texto(v);
  if (!s) return undefined;
  const m = /^(\d{4})-?(\d{2})-?(\d{2})$/.exec(s);
  if (!m) erro(`Campo ${nomeCampo} deve estar no formato AAAA-MM-DD: "${s}".`);
  return `${m![1]}-${m![2]}-${m![3]}`;
}

function horaISO(v: unknown, nomeCampo: string): string | undefined {
  const s = texto(v);
  if (!s) return undefined;
  const m = /^(\d{1,2}):?(\d{2})(?::?(\d{2}))?$/.exec(s);
  if (!m) erro(`Campo ${nomeCampo} deve estar no formato HH:MM:SS: "${s}".`);
  return `${m![1].padStart(2, "0")}:${m![2]}:${m![3] ?? "00"}`;
}

const minutos = (hora: string) => {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
};

function distanciaKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

function pertoDoTerminal(d: Dados) {
  const lat = numero(d.latitude);
  const lon = numero(d.longitude);
  if (lat === undefined || lon === undefined) return false;
  return distanciaKm(lat, lon, TERMINAL.lat, TERMINAL.lon) <= TERMINAL.raioKm;
}

/**
 * idViagem do MONITRIIP.
 * Regular: AAAAMMDD-HHMMSS-NN-N-PPPPPPPPPPP (data/hora no ponto inicial, tipo, sentido, prefixo).
 * Semiurbano: AAAAMMDD-HHMMSS-N-NNNN.
 */
function lerIdViagem(v: unknown) {
  const s = texto(v)?.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
  if (!s) return undefined;
  const dt = (x: string) => `${x.slice(0, 4)}-${x.slice(4, 6)}-${x.slice(6, 8)}`;
  const hr = (x: string) => `${x.slice(0, 2)}:${x.slice(2, 4)}:${x.slice(4, 6)}`;
  let m = /^(\d{8})(\d{6})(\d{2})([01])([A-Z0-9]{11})$/.exec(s);
  if (m) {
    return { data: dt(m[1]), hora: hr(m[2]), sentido: m[4] === "1" ? "ida" : "volta", linha: m[5] };
  }
  m = /^(\d{8})(\d{6})([01])([A-Z0-9]{4})$/.exec(s);
  if (m) {
    return { data: dt(m[1]), hora: hr(m[2]), sentido: m[3] === "1" ? "ida" : "volta", linha: m[4] };
  }
  return undefined;
}

function lerSentido(v: unknown): "ida" | "volta" | undefined {
  const s = texto(v);
  if (!s) return undefined;
  if (s === "1" || normalizar(s) === "ida") return "ida";
  if (s === "0" || normalizar(s) === "volta") return "volta";
  return erro(`Sentido inválido: "${s}" (use ida/volta ou 1/0).`);
}

function semDadosPessoais(d: Dados): Dados {
  const copia: Dados = { ...d };
  for (const c of CAMPOS_PESSOAIS) if (c in copia) copia[c] = "[descartado]";
  return copia;
}

async function sha256(s: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------------
// Contexto da requisição (integração autenticada + caches)
// ---------------------------------------------------------------------------

interface IntegracaoAut {
  id: string;
  nome: string;
  tipo: TipoIntegracao;
  empresa_id: string | null;
  empresa: { id: string; cnpj: string } | null;
}

interface LinhaDb {
  id: string;
  codigo: string;
  numero: string | null;
  fonte: string;
  empresa_id: string | null;
  origem: string;
  destino: string;
  relacao_manhuacu: "origem" | "destino" | "passagem";
}

interface HorarioDb {
  id: string;
  sentido: "ida" | "volta";
  hora: string;
  parte_de_manhuacu: boolean;
}

interface ViagemDb {
  id: string;
  data: string;
  horario_id: string | null;
  linha_id: string | null;
  empresa_id: string | null;
  tipo: "partida" | "chegada" | "passagem";
  previsto_em: string | null;
  chegou_em: string | null;
  partiu_em: string | null;
  status: string;
  horario?: { hora: string } | null;
}

const VIAGEM_COLS =
  "id, data, horario_id, linha_id, empresa_id, tipo, previsto_em, chegou_em, partiu_em, status, horario:horarios(hora)";

class Contexto {
  private linhas = new Map<string, LinhaDb[]>();
  private horarios = new Map<string, HorarioDb[]>();
  private empresas = new Map<string, string | null>();
  private municipios = new Map<string, string>();

  constructor(
    readonly db: SupabaseClient,
    readonly integ: IntegracaoAut,
  ) {}

  /** Empresa dona do evento, respeitando o vínculo da integração. */
  async empresa(cnpjInformado: unknown): Promise<string | null> {
    const cnpj = digitos(cnpjInformado);
    // Integração vinculada a uma empresa (tipo "empresa" ou "outro") só fala por ela.
    if (this.integ.empresa_id) {
      if (cnpj && this.integ.empresa && cnpj !== this.integ.empresa.cnpj) {
        erro(`CNPJ ${cnpj} não pertence à empresa desta integração; evento rejeitado.`);
      }
      return this.integ.empresa_id;
    }
    if (cnpj) {
      if (!this.empresas.has(cnpj)) {
        const { data, error } = await this.db.from("empresas").select("id").eq("cnpj", cnpj).maybeSingle();
        if (error) erro(error.message);
        this.empresas.set(cnpj, data?.id ?? null);
      }
      const id = this.empresas.get(cnpj);
      if (!id) erro(`Empresa com CNPJ ${cnpj} não está cadastrada no terminal.`);
      return id!;
    }
    return this.integ.empresa_id;
  }

  /** Nome do município pelo código IBGE (API pública do IBGE; se falhar, mostra o código). */
  async municipio(ibge: string | undefined, nome: string | undefined): Promise<string> {
    if (nome) return nome;
    if (!ibge) return "";
    if (ibge === IBGE_MANHUACU) return "Manhuaçu";
    if (ibge === "9999999") return "Exterior";
    if (!this.municipios.has(ibge)) {
      let encontrado = `IBGE ${ibge}`;
      try {
        const r = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${ibge}`, {
          signal: AbortSignal.timeout(3000),
        });
        if (r.ok) {
          const m = (await r.json()) as { nome?: string } | unknown[];
          if (!Array.isArray(m) && m?.nome) encontrado = m.nome;
        }
      } catch {
        // Sem rede/IBGE fora do ar: segue com o código.
      }
      this.municipios.set(ibge, encontrado);
    }
    return this.municipios.get(ibge)!;
  }

  async linha(codigo: string | undefined, empresaId: string | null): Promise<LinhaDb | null> {
    if (!codigo) return null;
    const cod = codigo.trim().toUpperCase();
    if (!this.linhas.has(cod)) {
      const { data, error } = await this.db
        .from("linhas")
        .select("id, codigo, numero, fonte, empresa_id, origem, destino, relacao_manhuacu")
        .eq("codigo", cod);
      if (error) erro(error.message);
      this.linhas.set(cod, (data ?? []) as LinhaDb[]);
    }
    const opcoes = this.linhas.get(cod)!;
    return (
      opcoes.find((l) => empresaId && l.empresa_id === empresaId) ??
      opcoes.find((l) => l.fonte === (cod.length === 11 ? "ANTT" : "DER-MG")) ??
      opcoes[0] ??
      null
    );
  }

  async horariosDa(linhaId: string): Promise<HorarioDb[]> {
    if (!this.horarios.has(linhaId)) {
      const { data, error } = await this.db
        .from("horarios")
        .select("id, sentido, hora, parte_de_manhuacu")
        .eq("linha_id", linhaId);
      if (error) erro(error.message);
      this.horarios.set(linhaId, (data ?? []) as HorarioDb[]);
    }
    return this.horarios.get(linhaId)!;
  }

  /**
   * Integração vinculada a uma empresa só mexe em viagem dela. Viagem sem dono
   * (linha pública sem empresa) é assumida pela primeira empresa que a reportar.
   */
  private async daEmpresa(v: ViagemDb): Promise<ViagemDb> {
    const dona = this.integ.empresa_id;
    if (!dona || v.empresa_id === dona) return v;
    if (!v.empresa_id) {
      const { data, error } = await this.db
        .from("viagens")
        .update({ empresa_id: dona })
        .eq("id", v.id)
        .is("empresa_id", null)
        .select(VIAGEM_COLS)
        .maybeSingle();
      if (error) erro(error.message);
      if (data) return data as unknown as ViagemDb;
    }
    return erro("A viagem pertence a outra empresa; evento rejeitado.");
  }

  /**
   * Viagem do evento: empresa + data + linha + horário mais próximo.
   * Se não existir, cria (quando `criar`).
   */
  async viagem(p: {
    empresaId: string | null;
    linhaCodigo?: string;
    data?: string;
    hora?: string;
    sentido?: "ida" | "volta";
    origem?: string;
    destino?: string;
    veiculo?: string;
    criar: boolean;
  }): Promise<{ viagem: ViagemDb; criada: boolean; linha: LinhaDb | null; sentido?: "ida" | "volta" } | null> {
    if (!p.data || (!p.linhaCodigo && !p.empresaId)) return null;
    const linha = await this.linha(p.linhaCodigo, p.empresaId);
    if (
      linha?.empresa_id &&
      p.empresaId &&
      linha.empresa_id !== p.empresaId &&
      this.integ.empresa_id
    ) {
      erro(`A linha ${linha.codigo} está registrada para outra empresa nos dados públicos.`);
    }
    const empresaId = p.empresaId ?? linha?.empresa_id ?? null;

    // 1) Horário publicado da linha (a hora do MONITRIIP e do quadro é a do ponto inicial).
    let horario: HorarioDb | undefined;
    if (linha && p.hora) {
      const alvo = minutos(p.hora);
      const candidatos = (await this.horariosDa(linha.id)).filter(
        (h) => !p.sentido || h.sentido === p.sentido,
      );
      let melhor = Infinity;
      for (const h of candidatos) {
        const dif = Math.abs(minutos(h.hora) - alvo);
        if (dif < melhor && dif <= TOLERANCIA_HORARIO_MIN) {
          melhor = dif;
          horario = h;
        }
      }
    }
    const sentido = p.sentido ?? horario?.sentido;

    if (horario) {
      const { data, error } = await this.db
        .from("viagens")
        .select(VIAGEM_COLS)
        .eq("horario_id", horario.id)
        .eq("data", p.data)
        .maybeSingle();
      if (error) erro(error.message);
      if (data) return { viagem: await this.daEmpresa(data as unknown as ViagemDb), criada: false, linha, sentido };
    }

    // 2) Viagem do dia da mesma linha (ou da empresa, sem linha) com hora mais próxima.
    let q = this.db.from("viagens").select(VIAGEM_COLS).eq("data", p.data);
    if (linha) q = q.eq("linha_id", linha.id);
    else q = q.is("linha_id", null);
    if (empresaId) q = q.eq("empresa_id", empresaId);
    const { data: doDia, error: errDia } = await q;
    if (errDia) erro(errDia.message);
    const lista = (doDia ?? []) as unknown as ViagemDb[];
    let escolhida: ViagemDb | undefined;
    if (p.hora) {
      const alvo = minutos(p.hora);
      let melhor = Infinity;
      for (const v of lista) {
        const ref = v.horario?.hora ?? (v.previsto_em ? horaLocal(v.previsto_em) : undefined);
        if (!ref) continue;
        const dif = Math.abs(minutos(ref) - alvo);
        if (dif < melhor && dif <= TOLERANCIA_VIAGEM_MIN) {
          melhor = dif;
          escolhida = v;
        }
      }
    } else if (lista.length === 1) {
      escolhida = lista[0];
    } else if (lista.length > 1) {
      erro("Mais de uma viagem da linha no dia: informe a hora da viagem para vincular.");
    }
    if (escolhida) return { viagem: await this.daEmpresa(escolhida), criada: false, linha, sentido };
    if (!p.criar) return null;

    // 3) Cria a viagem.
    let origem: string | undefined;
    let destino: string | undefined;
    let tipo: ViagemDb["tipo"];
    if (linha) {
      const ida = sentido !== "volta";
      origem = ida ? linha.origem : linha.destino;
      destino = ida ? linha.destino : linha.origem;
      tipo =
        linha.relacao_manhuacu === "passagem"
          ? "passagem"
          : (linha.relacao_manhuacu === "origem") === ida
            ? "partida"
            : "chegada";
    } else {
      origem = p.origem;
      destino = p.destino;
      if (!origem || !destino) {
        erro(
          p.linhaCodigo
            ? `Linha ${p.linhaCodigo} não encontrada nos dados públicos; informe origem e destino para registrar a viagem.`
            : "Informe a linha (ou origem e destino) para registrar a viagem.",
        );
      }
      tipo = ehManhuacu(origem) ? "partida" : ehManhuacu(destino) ? "chegada" : "passagem";
    }
    // previsto_em é o horário no terminal: só é conhecido quando a viagem parte de Manhuaçu.
    const parteDaqui = horario ? horario.parte_de_manhuacu : tipo === "partida";
    const novo = {
      data: p.data,
      horario_id: horario?.id ?? null,
      linha_id: linha?.id ?? null,
      empresa_id: empresaId,
      numero: linha ? linha.numero || linha.codigo : "",
      tipo,
      origem: origem!,
      destino: destino!,
      previsto_em: parteDaqui && p.hora ? new Date(`${p.data}T${p.hora}${OFFSET}`).toISOString() : null,
      veiculo: p.veiculo ?? "",
      status: "prevista",
      observacao: `Registrada pela integração "${this.integ.nome}".`,
    };
    if (horario) {
      const { error } = await this.db
        .from("viagens")
        .upsert(novo, { onConflict: "horario_id,data", ignoreDuplicates: true });
      if (error) erro(error.message);
      const { data, error: e2 } = await this.db
        .from("viagens")
        .select(VIAGEM_COLS)
        .eq("horario_id", horario.id)
        .eq("data", p.data)
        .single();
      if (e2) erro(e2.message);
      return { viagem: await this.daEmpresa(data as unknown as ViagemDb), criada: true, linha, sentido };
    }
    const { data, error } = await this.db.from("viagens").insert(novo).select(VIAGEM_COLS).single();
    if (error) erro(error.message);
    return { viagem: data as unknown as ViagemDb, criada: true, linha, sentido };
  }
}

/** Linha, data, hora e sentido do evento, nos nomes MONITRIIP ou no formato simples. */
function dadosDaViagem(d: Dados, instanteEvento?: string) {
  const id = lerIdViagem(d.idViagem);
  const linha =
    texto(campo(d, "identificacaoLinha", "idLinha", "prefixoLinha", "linha", "linha_codigo")) ?? id?.linha;
  const data =
    dataISO(
      campo(d, "dataViagemPassageiro", "dataPrevistaViagemPassageiro", "dataProgramadaViagem", "data", "data_viagem"),
      "data",
    ) ??
    id?.data ??
    (instanteEvento ? dataLocal(instanteEvento) : undefined);
  const hora =
    horaISO(
      campo(d, "horaViagemPassageiro", "horaPrevistaViagemPassageiro", "horaProgramadaViagem", "hora", "hora_viagem"),
      "hora",
    ) ?? id?.hora;
  const sentido = lerSentido(campo(d, "codigoSentidoLinha", "sentido")) ?? (id?.sentido as "ida" | "volta" | undefined);
  const veiculo = texto(campo(d, "placaVeiculo", "veiculo", "placa"))?.toUpperCase();
  return { linha: linha?.toUpperCase(), data, hora, sentido, veiculo };
}

const cnpjDe = (d: Dados) => campo(d, "cnpjEmpresaTransporte", "cnpjEmpresa", "empresa_cnpj", "cnpj", "idTransportador");
const codigoBilheteDe = (d: Dados) =>
  texto(campo(d, "numeroBilhete", "numeroBilheteEmbarque", "bilhete", "codigo_bilhete", "codigoBilhete"));

function obs(r: { criada: boolean } | null) {
  if (!r) return " Sem viagem vinculada (linha/data não informadas).";
  return r.criada ? " Viagem criada (não havia viagem no dia)." : "";
}

// ---------------------------------------------------------------------------
// Tipos de evento
// ---------------------------------------------------------------------------

type Resultado = { mensagem: string };

async function vendaPassagem(ctx: Contexto, d: Dados): Promise<Resultado> {
  const codigo = codigoBilheteDe(d) ?? erro("Informe o número do bilhete (numeroBilhete ou bilhete).");
  const ibgeEmb = digitos(d.codigoMunicipioEmbarquePassageiro);
  const ibgeDes = digitos(d.codigoMunicipioDesembarquePassageiro);
  const nomeOrig = texto(d.origem);
  const nomeDest = texto(d.destino);
  if (ibgeEmb && ibgeDes && ibgeEmb !== IBGE_MANHUACU && ibgeDes !== IBGE_MANHUACU) {
    ignorar("Bilhete não embarca nem desembarca em Manhuaçu.");
  }
  if (!ibgeEmb && nomeOrig && nomeDest && !ehManhuacu(nomeOrig) && !ehManhuacu(nomeDest)) {
    ignorar("Bilhete não embarca nem desembarca em Manhuaçu.");
  }
  const empresaId =
    (await ctx.empresa(cnpjDe(d))) ?? erro("Informe o CNPJ da empresa (cnpjEmpresaTransporte).");
  const emitidoEm = instante(campo(d, "dataHoraEmissaoBilhete", "emitido_em"), "emitido_em") ?? new Date().toISOString();
  const v = dadosDaViagem(d);
  const origem = await ctx.municipio(ibgeEmb, nomeOrig);
  const destino = await ctx.municipio(ibgeDes, nomeDest);
  const r = await ctx.viagem({
    empresaId,
    linhaCodigo: v.linha,
    data: v.data,
    hora: v.hora,
    sentido: v.sentido,
    // Usados só se a linha não estiver nos dados públicos.
    origem: origem || undefined,
    destino: destino || undefined,
    criar: true,
  });

  const tipoBilhete = texto(d.codigoIdentificadorBilhete);
  const gratuidade =
    texto(d.gratuidade) ??
    (tipoBilhete === "1"
      ? "Gratuidade prevista em lei"
      : tipoBilhete === "2"
        ? `Desconto previsto em lei${texto(d.percentualDesconto) ? ` (${texto(d.percentualDesconto)}%)` : ""}`
        : "");
  const valor = numero(campo(d, "valorTotal", "valor", "valorTarifa")) ?? null;

  const { data: existente, error: e1 } = await ctx.db
    .from("bilhetes")
    .select("id, status")
    .eq("empresa_id", empresaId)
    .eq("codigo", codigo)
    .maybeSingle();
  if (e1) erro(e1.message);
  const campos = {
    viagem_id: r?.viagem.id ?? null,
    origem,
    destino,
    valor,
    gratuidade,
    emitido_em: emitidoEm,
    integracao_id: ctx.integ.id,
  };
  if (existente) {
    // Não volta o status: um bilhete já cancelado/utilizado continua assim.
    const { error } = await ctx.db.from("bilhetes").update(campos).eq("id", existente.id);
    if (error) erro(error.message);
    return { mensagem: `Bilhete ${codigo} atualizado (situação: ${existente.status}).${obs(r)}` };
  }
  const { error } = await ctx.db
    .from("bilhetes")
    .insert({ ...campos, codigo, empresa_id: empresaId, status: "emitida" });
  if (error) erro(error.message);
  return { mensagem: `Bilhete ${codigo} registrado.${obs(r)}` };
}

async function cancelamentoPassagem(ctx: Contexto, d: Dados): Promise<Resultado> {
  const codigo = codigoBilheteDe(d) ?? erro("Informe o número do bilhete (numeroBilhete ou bilhete).");
  const empresaId =
    (await ctx.empresa(cnpjDe(d))) ?? erro("Informe o CNPJ da empresa (cnpjEmpresaTransporte).");
  const canceladoEm =
    instante(campo(d, "dataHoraCancelamento", "cancelado_em"), "cancelado_em") ?? new Date().toISOString();
  const novo = texto(campo(d, "numeroNovoBilhete", "novo_bilhete"));
  const sufixo = novo ? ` Novo bilhete: ${novo}.` : "";

  const { data: existente, error: e1 } = await ctx.db
    .from("bilhetes")
    .select("id")
    .eq("empresa_id", empresaId)
    .eq("codigo", codigo)
    .maybeSingle();
  if (e1) erro(e1.message);
  if (existente) {
    const { error } = await ctx.db
      .from("bilhetes")
      .update({ status: "cancelada", cancelado_em: canceladoEm, integracao_id: ctx.integ.id })
      .eq("id", existente.id);
    if (error) erro(error.message);
    return { mensagem: `Bilhete ${codigo} cancelado.${sufixo}` };
  }

  // Cancelamento antes da venda: só guarda se a linha passa por Manhuaçu (está nos dados públicos).
  const v = dadosDaViagem(d);
  const linha = await ctx.linha(v.linha, empresaId);
  if (!linha) ignorar(`Bilhete ${codigo} não recebido e a linha não passa por Manhuaçu.`);
  const r = await ctx.viagem({ empresaId, linhaCodigo: v.linha, data: v.data, hora: v.hora, sentido: v.sentido, criar: false });
  const { error } = await ctx.db.from("bilhetes").insert({
    codigo,
    empresa_id: empresaId,
    viagem_id: r?.viagem.id ?? null,
    status: "cancelada",
    // A venda ainda não chegou; usa o cancelamento como referência até ela chegar.
    emitido_em: canceladoEm,
    cancelado_em: canceladoEm,
    integracao_id: ctx.integ.id,
  });
  if (error) erro(error.message);
  return { mensagem: `Bilhete ${codigo} registrado como cancelado (venda ainda não recebida).${sufixo}` };
}

async function embarque(ctx: Contexto, d: Dados): Promise<Resultado> {
  const ocorridoEm =
    instante(campo(d, "dataHoraEvento", "ocorrido_em"), "ocorrido_em") ?? new Date().toISOString();
  const rfid = texto(d.numeroCartao);
  const monitriip = d.codigoEmbarque !== undefined || rfid !== undefined;

  // MONITRIIP: só interessa quem embarca em Manhuaçu.
  const ibgeEmb = digitos(d.codigoMunicipioEmbarquePassageiro);
  if (ibgeEmb && ibgeEmb !== IBGE_MANHUACU) ignorar("Embarque registrado fora de Manhuaçu.");

  let evento: "acesso" | "reentrada" | "negado" | "no-show";
  if (d.codigoEmbarque !== undefined) {
    evento = texto(d.codigoEmbarque) === "0" ? "no-show" : "acesso";
  } else if (rfid) {
    evento = "acesso";
  } else {
    const e = normalizar(texto(d.evento) ?? "acesso");
    if (e === "acesso" || e === "entrada" || e === "embarque") evento = "acesso";
    else if (e === "reentrada") evento = "reentrada";
    else if (e === "negado" || e === "bloqueado") evento = "negado";
    else return erro(`Evento de embarque inválido: "${e}" (use acesso, reentrada ou negado).`);
  }

  const codigo = rfid ? `RFID ${rfid}` : (codigoBilheteDe(d) ?? "");
  if (!codigo && evento !== "negado") erro("Informe o código do bilhete (numeroBilhete ou bilhete).");
  const placa = texto(d.placaVeiculo)?.toUpperCase();
  const dispositivo =
    texto(campo(d, "dispositivo", "catraca")) ??
    (monitriip ? `Validador embarcado${placa ? ` ${placa}` : ""}` : ctx.integ.nome);

  const cnpj = cnpjDe(d);
  const empresaId = cnpj || ctx.integ.tipo === "empresa" ? await ctx.empresa(cnpj) : null;

  // Bilhete: pela empresa quando conhecida; senão só pelo código (se não for ambíguo).
  let bilhete: { id: string; status: string; viagem_id: string | null; empresa_id: string | null } | null = null;
  if (codigo && !rfid) {
    let q = ctx.db.from("bilhetes").select("id, status, viagem_id, empresa_id").eq("codigo", codigo);
    if (empresaId) q = q.eq("empresa_id", empresaId);
    const { data, error } = await q.limit(2);
    if (error) erro(error.message);
    if (data && data.length === 1) bilhete = data[0];
  }

  let viagemId = bilhete?.viagem_id ?? null;
  let r: Awaited<ReturnType<Contexto["viagem"]>> = null;
  if (!viagemId) {
    const v = dadosDaViagem(d, ocorridoEm);
    if (v.linha) {
      r = await ctx.viagem({
        empresaId: empresaId ?? bilhete?.empresa_id ?? null,
        linhaCodigo: v.linha,
        data: v.data,
        hora: v.hora,
        sentido: v.sentido,
        criar: ctx.integ.tipo !== "catraca",
      });
      viagemId = r?.viagem.id ?? null;
    }
  }

  if (evento === "no-show") {
    if (!bilhete) ignorar(`Não embarque do bilhete ${codigo}: bilhete não recebido pelo terminal.`);
    if (bilhete!.status === "emitida") {
      const { error } = await ctx.db.from("bilhetes").update({ status: "nao-utilizada" }).eq("id", bilhete!.id);
      if (error) erro(error.message);
    }
    return { mensagem: `Bilhete ${codigo} marcado como não utilizado (no-show).` };
  }

  const status = evento === "negado" ? "rejeitado" : viagemId ? "confirmado" : "pendente";
  const { error } = await ctx.db.from("eventos_embarque").upsert(
    {
      ocorrido_em: ocorridoEm,
      dispositivo,
      viagem_id: viagemId,
      bilhete_codigo: codigo,
      evento,
      status,
      integracao_id: ctx.integ.id,
    },
    { onConflict: "integracao_id,bilhete_codigo,evento,ocorrido_em", ignoreDuplicates: true },
  );
  if (error) erro(error.message);

  if (evento === "acesso") {
    if (bilhete && ["emitida", "nao-utilizada"].includes(bilhete.status)) {
      const { error: e2 } = await ctx.db
        .from("bilhetes")
        .update({ status: "utilizada", viagem_id: bilhete.viagem_id ?? viagemId })
        .eq("id", bilhete.id);
      if (e2) erro(e2.message);
    } else if (!bilhete && !rfid && monitriip && empresaId) {
      // Check-in MONITRIIP de bilhete cuja venda não foi enviada: registra como utilizado.
      const { error: e3 } = await ctx.db.from("bilhetes").upsert(
        {
          codigo,
          empresa_id: empresaId,
          viagem_id: viagemId,
          origem: "Manhuaçu",
          destino: await ctx.municipio(digitos(d.codigoMunicipioDesembarquePassageiro), undefined),
          valor: numero(d.valorTarifa) ?? null,
          status: "utilizada",
          emitido_em: ocorridoEm,
          integracao_id: ctx.integ.id,
        },
        { onConflict: "empresa_id,codigo", ignoreDuplicates: true },
      );
      if (e3) erro(e3.message);
    }
  }

  const rotulo = { acesso: "Embarque", reentrada: "Reentrada", negado: "Acesso negado" }[evento];
  const aviso = status === "pendente" ? " Sem viagem vinculada: fica pendente de conferência." : r?.criada ? obs(r) : "";
  return { mensagem: `${rotulo} registrado${codigo ? ` (bilhete ${codigo})` : ""}.${aviso}` };
}

async function inicioFimViagem(ctx: Contexto, d: Dados): Promise<Resultado> {
  const ocorridoEm =
    instante(campo(d, "dataHoraEvento", "ocorrido_em"), "ocorrido_em") ?? new Date().toISOString();
  const empresaId =
    (await ctx.empresa(cnpjDe(d))) ?? erro("Informe o CNPJ da empresa (cnpjEmpresaTransporte).");
  const v = dadosDaViagem(d);
  if (!v.linha) erro("Informe a linha (identificacaoLinha ou linha).");
  if (!v.data) erro("Informe a data programada da viagem (dataProgramadaViagem ou data).");

  let evento: "chegada" | "partida" | "cancelada";
  const registro = texto(d.tipoRegistroViagem);
  if (registro !== undefined) {
    // MONITRIIP: 1/3 = iniciar, 0/2 = finalizar. Só conta se acontece no terminal.
    const inicio = registro === "1" || registro === "3";
    const linha = await ctx.linha(v.linha, empresaId);
    const sentido = v.sentido ?? "ida";
    const pontaInicial = linha
      ? (linha.relacao_manhuacu === "origem" && sentido === "ida") ||
        (linha.relacao_manhuacu === "destino" && sentido === "volta")
      : false;
    const pontaFinal = linha
      ? (linha.relacao_manhuacu === "destino" && sentido === "ida") ||
        (linha.relacao_manhuacu === "origem" && sentido === "volta")
      : false;
    const perto = pertoDoTerminal(d);
    if (inicio && (pontaInicial || perto)) evento = "partida";
    else if (!inicio && (pontaFinal || perto)) evento = "chegada";
    else return ignorar(`${inicio ? "Início" : "Fim"} de viagem fora do terminal de Manhuaçu.`);
  } else {
    const e = normalizar(texto(d.evento) ?? "");
    if (e === "chegada" || e === "chegou") evento = "chegada";
    else if (e === "partida" || e === "partiu" || e === "saida") evento = "partida";
    else if (e === "cancelada" || e === "cancelamento") evento = "cancelada";
    else return erro('Informe evento: "chegada", "partida" ou "cancelada" (ou tipoRegistroViagem do MONITRIIP).');
  }

  const r = (await ctx.viagem({
    empresaId,
    linhaCodigo: v.linha,
    data: v.data,
    hora: v.hora,
    sentido: v.sentido,
    origem: texto(d.origem),
    destino: texto(d.destino),
    veiculo: v.veiculo,
    criar: true,
  }))!;

  const via = r.viagem;
  const mudanca: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
  if (v.veiculo) mudanca.veiculo = v.veiculo;
  if (evento === "chegada") {
    mudanca.chegou_em = ocorridoEm;
    if (!via.partiu_em && !["partiu", "realizada"].includes(via.status)) {
      mudanca.status = via.tipo === "chegada" ? "realizada" : "embarque";
    }
  } else if (evento === "partida") {
    mudanca.partiu_em = ocorridoEm;
    mudanca.status = "partiu";
  } else {
    mudanca.status = "cancelada";
  }

  const plataforma = texto(campo(d, "plataforma", "plataformaEmbarque"));
  if (plataforma) {
    const numeroPlat = plataforma.replace(/^plataforma\s*/i, "").trim();
    const { data: plat } = await ctx.db.from("plataformas").select("id").eq("numero", numeroPlat).maybeSingle();
    if (plat) mudanca.plataforma_id = plat.id;
  }

  const { error } = await ctx.db.from("viagens").update(mudanca).eq("id", via.id);
  if (error) erro(error.message);
  const rotulo = { chegada: "Chegada", partida: "Partida", cancelada: "Cancelamento" }[evento];
  return { mensagem: `${rotulo} registrada na viagem de ${via.data}.${obs(r)}` };
}

async function relatoViagem(ctx: Contexto, d: Dados): Promise<Resultado> {
  const passageiros = numero(campo(d, "passageiros", "quantidadePassageiros", "totalPassageiros"));
  if (passageiros === undefined || passageiros < 0 || !Number.isInteger(passageiros)) {
    erro("Informe passageiros (número inteiro maior ou igual a zero).");
  }
  const empresaId =
    (await ctx.empresa(cnpjDe(d))) ?? erro("Informe o CNPJ da empresa (empresa_cnpj).");
  const v = dadosDaViagem(d);
  if (!v.linha || !v.data) erro("Informe linha e data da viagem.");
  const r = (await ctx.viagem({
    empresaId,
    linhaCodigo: v.linha,
    data: v.data,
    hora: v.hora,
    sentido: v.sentido,
    origem: texto(d.origem),
    destino: texto(d.destino),
    criar: true,
  }))!;
  const { error } = await ctx.db.from("relatos_empresa").upsert(
    {
      viagem_id: r.viagem.id,
      empresa_id: empresaId,
      passageiros,
      enviado_em: new Date().toISOString(),
      integracao_id: ctx.integ.id,
    },
    { onConflict: "viagem_id" },
  );
  if (error) erro(error.message);
  return { mensagem: `Relato de ${passageiros} passageiro(s) registrado na viagem de ${r.viagem.data}.${obs(r)}` };
}

async function pagamento(ctx: Contexto, d: Dados): Promise<Resultado> {
  const referencia =
    texto(campo(d, "referencia", "referencia_externa", "id", "txid")) ??
    erro("Informe a referência do pagamento no sistema de origem (referencia).");
  const valor = numero(d.valor);
  if (valor === undefined || valor <= 0) erro("Informe valor maior que zero.");
  const statusIn = normalizar(texto(d.status) ?? "confirmado");
  if (!["confirmado", "processando", "estornado"].includes(statusIn)) {
    erro(`Status inválido: "${statusIn}" (use confirmado, processando ou estornado).`);
  }

  let taxa: { id: string; empresa_id: string; valor: number; status: string; numero: string } | null = null;
  const taxaNumero = texto(campo(d, "taxa_numero", "taxa"));
  const taxaId = texto(d.taxa_id);
  if (taxaNumero || taxaId) {
    let q = ctx.db.from("taxas").select("id, empresa_id, valor, status, numero");
    q = taxaId ? q.eq("id", taxaId) : q.eq("numero", taxaNumero!);
    const { data, error } = await q.maybeSingle();
    if (error) erro(error.message);
    if (!data) erro(`Taxa ${taxaNumero ?? taxaId} não encontrada.`);
    taxa = data;
  }
  const cnpj = cnpjDe(d);
  let empresaId: string | null = null;
  if (cnpj) empresaId = await ctx.empresa(cnpj);
  if (taxa && empresaId && taxa.empresa_id !== empresaId) erro("A taxa informada é de outra empresa.");
  empresaId ??= taxa?.empresa_id ?? null;
  if (!empresaId) erro("Informe a empresa (empresa_cnpj) ou a taxa (taxa_numero).");

  // Estorno é definitivo: reenvio ou webhook fora de ordem não reabre o pagamento.
  const { data: existente, error: errEx } = await ctx.db
    .from("pagamentos")
    .select("status")
    .eq("integracao_id", ctx.integ.id)
    .eq("referencia_externa", referencia)
    .maybeSingle();
  if (errEx) erro(errEx.message);
  if (existente?.status === "estornado" && statusIn !== "estornado") {
    ignorar(`Pagamento ${referencia} já foi estornado; status "${statusIn}" ignorado.`);
  }

  const { error } = await ctx.db.from("pagamentos").upsert(
    {
      taxa_id: taxa?.id ?? null,
      empresa_id: empresaId,
      valor,
      pago_em: instante(campo(d, "pago_em", "dataHoraPagamento"), "pago_em") ?? new Date().toISOString(),
      meio: texto(d.meio) ?? "",
      referencia_externa: referencia,
      status: statusIn,
      integracao_id: ctx.integ.id,
    },
    { onConflict: "integracao_id,referencia_externa" },
  );
  if (error) erro(error.message);

  // A taxa é quitada/reaberta pelo trigger pagamentos_atualizar_taxa (migration do financeiro).
  if (taxa) {
    const { data: atual } = await ctx.db.from("taxas").select("status").eq("id", taxa.id).maybeSingle();
    return {
      mensagem: `Pagamento ${referencia} registrado (${statusIn}); taxa ${taxa.numero}: ${atual?.status ?? taxa.status}.`,
    };
  }
  return { mensagem: `Pagamento ${referencia} registrado (${statusIn}).` };
}

const PROCESSADORES: Record<TipoEvento, (ctx: Contexto, d: Dados) => Promise<Resultado>> = {
  "venda-passagem": vendaPassagem,
  "cancelamento-passagem": cancelamentoPassagem,
  embarque,
  "inicio-fim-viagem": inicioFimViagem,
  "relato-viagem": relatoViagem,
  pagamento,
};

// ---------------------------------------------------------------------------
// Requisição
// ---------------------------------------------------------------------------

interface Item {
  tipo?: string;
  dados: Dados;
}

function extrairItens(corpo: unknown): Item[] {
  const comoItem = (x: unknown): Item => {
    if (!x || typeof x !== "object" || Array.isArray(x)) return { dados: { valor_recebido: x } };
    const o = x as Dados;
    if (o.dados && typeof o.dados === "object" && !Array.isArray(o.dados)) {
      return { tipo: texto(o.tipo), dados: o.dados as Dados };
    }
    const { tipo, ...resto } = o;
    return { tipo: texto(tipo), dados: resto };
  };
  if (Array.isArray(corpo)) return corpo.map(comoItem);
  if (corpo && typeof corpo === "object" && Array.isArray((corpo as Dados).eventos)) {
    return ((corpo as Dados).eventos as unknown[]).map(comoItem);
  }
  return [comoItem(corpo)];
}

function resolverTipo(item: Item, tipoDoCaminho?: TipoEvento): TipoEvento | null | "monitriip-nao-usado" {
  if (item.tipo) return ALIAS_TIPO[normalizar(item.tipo)] ?? null;
  if (tipoDoCaminho) return tipoDoCaminho;
  const idLog = texto(item.dados.idLog);
  if (idLog !== undefined) return ID_LOG[idLog] ?? "monitriip-nao-usado";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erro: "Use POST." }, 405);

  // Chave: x-api-key ou Authorization: Bearer. Nunca é registrada em log.
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const chave = req.headers.get("x-api-key")?.trim() || (bearer?.startsWith("srv_") ? bearer : undefined);
  if (!chave) return json({ erro: "Informe a chave da integração no header x-api-key." }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ erro: "Função sem configuração do banco." }, 500);
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: integ, error: errInteg } = await db
    .from("integracoes")
    .select("id, nome, tipo, empresa_id, ativa, empresa:empresas(id, cnpj)")
    .eq("chave_hash", await sha256(chave))
    .maybeSingle();
  if (errInteg) {
    console.error("ingestao: falha ao validar integração", errInteg.message);
    return json({ erro: "Falha ao validar a chave." }, 500);
  }
  if (!integ || !integ.ativa) return json({ erro: "Chave inválida ou integração revogada." }, 401);

  const tamanho = Number(req.headers.get("content-length") ?? 0);
  if (tamanho > MAX_BYTES) return json({ erro: `Corpo maior que ${MAX_BYTES / 1024 / 1024} MB.` }, 413);
  let corpo: unknown;
  try {
    const bruto = await req.text();
    if (bruto.length > MAX_BYTES) return json({ erro: "Corpo muito grande." }, 413);
    corpo = JSON.parse(bruto);
  } catch {
    return json({ erro: "Corpo inválido: envie JSON (UTF-8)." }, 400);
  }

  const itens = extrairItens(corpo);
  if (itens.length === 0) return json({ erro: "Nenhum evento enviado." }, 400);
  if (itens.length > MAX_EVENTOS) {
    return json({ erro: `Máximo de ${MAX_EVENTOS} eventos por requisição; divida em lotes.` }, 413);
  }

  const caminho = new URL(req.url).pathname;
  const tipoDoCaminho = ALIAS_CAMINHO.find(([re]) => re.test(caminho))?.[1];

  const empresaRel = integ.empresa as unknown;
  const ctx = new Contexto(db, {
    id: integ.id,
    nome: integ.nome,
    tipo: integ.tipo as TipoIntegracao,
    empresa_id: integ.empresa_id,
    empresa: (Array.isArray(empresaRel) ? empresaRel[0] : empresaRel) as IntegracaoAut["empresa"],
  });

  const resultados: { indice: number; tipo: string; status: "processado" | "erro" | "ignorado"; mensagem: string }[] = [];
  const registros: Dados[] = [];

  for (const [indice, item] of itens.entries()) {
    const tipo = resolverTipo(item, tipoDoCaminho);
    let status: "processado" | "erro" | "ignorado";
    let mensagem: string;
    try {
      if (tipo === null) {
        erro(
          item.tipo
            ? `Tipo "${item.tipo}" desconhecido. Use: ${Object.keys(PROCESSADORES).join(", ")}.`
            : "Informe o tipo do evento (campo tipo) ou envie o log MONITRIIP com idLog.",
        );
      }
      if (tipo === "monitriip-nao-usado") ignorar(`Log MONITRIIP idLog ${texto(item.dados.idLog)} não é usado pelo terminal.`);
      const t = tipo as TipoEvento;
      if (!PERMITIDOS[ctx.integ.tipo].includes(t)) {
        erro(`Integração do tipo "${ctx.integ.tipo}" não pode enviar eventos "${t}".`);
      }
      ({ mensagem } = await PROCESSADORES[t](ctx, item.dados));
      status = "processado";
    } catch (e) {
      if (e instanceof Ignorado) {
        status = "ignorado";
        mensagem = e.message;
      } else if (e instanceof ErroItem) {
        status = "erro";
        mensagem = e.message;
      } else {
        status = "erro";
        mensagem = "Falha interna ao processar o evento.";
        console.error("ingestao: erro inesperado", integ.id, e instanceof Error ? e.message : e);
      }
    }
    const tipoRegistro = typeof tipo === "string" && tipo !== "monitriip-nao-usado" ? tipo : (item.tipo ?? "desconhecido");
    resultados.push({ indice, tipo: tipoRegistro, status, mensagem });
    registros.push({
      integracao_id: integ.id,
      tipo: tipoRegistro,
      payload: semDadosPessoais(item.dados),
      status,
      erro: status === "processado" ? null : mensagem,
    });
  }

  const agora = new Date().toISOString();
  const [{ error: errLog }, { error: errUlt }] = await Promise.all([
    db.from("eventos_integracao").insert(registros),
    db.from("integracoes").update({ ultimo_evento_em: agora }).eq("id", integ.id),
  ]);
  if (errLog) console.error("ingestao: falha ao gravar log de eventos", integ.id, errLog.message);
  if (errUlt) console.error("ingestao: falha ao atualizar último evento", integ.id, errUlt.message);

  const conta = (s: string) => resultados.filter((r) => r.status === s).length;
  return json({
    integracao: integ.nome,
    recebidos: resultados.length,
    processados: conta("processado"),
    ignorados: conta("ignorado"),
    erros: conta("erro"),
    resultados,
  });
});
