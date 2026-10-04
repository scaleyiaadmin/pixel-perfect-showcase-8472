/**
 * Importa os dados públicos de Manhuaçu para o Supabase.
 *
 * Fontes:
 *  - ANTT, Portal de Dados Abertos (API CKAN): empresas, linhas e seções, horários (SIGMA)
 *    e passagens vendidas (MONITRIIP, agregadas por mês e rota). Só linhas interestaduais.
 *  - DER-MG, quadro de horários e itinerários do transporte intermunicipal (linhas dentro de MG).
 *
 * Uso:
 *   bun scripts/importar-dados-publicos.ts --dry-run   # só grava JSON em scripts/saida/
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... bun scripts/importar-dados-publicos.ts
 *
 * Rodar uma vez por mês: a ANTT publica horários no dia 1º e passagens no dia 15.
 */
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";

const CIDADE = "Manhuaçu";
const UF = "MG";
const MESES_PASSAGENS = 12;

const ANTT_CKAN = "https://dados.antt.gov.br/api/3/action";
const DER_MG = "http://www.consultas.der.mg.gov.br/grgx/sgti/acesso_informacao.xhtml";
const IBGE_MG = "https://servicodados.ibge.gov.br/api/v1/localidades/estados/MG/municipios";

const dryRun = process.argv.includes("--dry-run");

// ---------------------------------------------------------------------------
// Tipos (espelham supabase/migrations)
// ---------------------------------------------------------------------------

type Fonte = "ANTT" | "DER-MG";
type Relacao = "origem" | "destino" | "passagem";

interface EmpresaRow {
  cnpj: string;
  razao_social: string;
  fonte: Fonte;
}

interface LinhaRow {
  fonte: Fonte;
  codigo: string;
  numero: string | null;
  descricao: string;
  empresa_cnpj: string | null;
  origem: string;
  uf_origem: string;
  destino: string;
  uf_destino: string;
  ambito: "interestadual" | "intermunicipal";
  relacao_manhuacu: Relacao;
  cidades_atendidas: string[];
}

interface HorarioRow {
  fonte: Fonte;
  linha_codigo: string;
  sentido: "ida" | "volta";
  hora: string;
  tipo_servico: string;
  parte_de_manhuacu: boolean;
  dias_semana: number[];
  feriado: boolean | null;
  meses: number[];
  competencia: string;
}

interface PassagemRow {
  mes_emissao: string;
  mes_viagem: string;
  origem: string;
  uf_origem: string;
  destino: string;
  uf_destino: string;
  tipo_servico: string;
  tipo_gratuidade: string;
  valor_medio: number;
  valor_desvio: number;
  quantidade: number;
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const semAcento = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();

const isManhuacu = (cidade: string) => semAcento(cidade) === semAcento(CIDADE);

/** "08/2026" → "2026-08-01" */
const mesParaData = (mmYYYY: string) => {
  const [m, y] = mmYYYY.split("/");
  return `${y}-${m.padStart(2, "0")}-01`;
};

/** Relação da linha com Manhuaçu e se a hora publicada é a partida do terminal. */
function relacao(origem: string, destino: string): Relacao {
  if (isManhuacu(origem)) return "origem";
  if (isManhuacu(destino)) return "destino";
  return "passagem";
}

const parteDeManhuacu = (rel: Relacao, sentido: "ida" | "volta") =>
  (rel === "origem" && sentido === "ida") || (rel === "destino" && sentido === "volta");

const TIMEOUT_MS = 180_000;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${res.status} ao baixar ${url}`);
  const text = await res.text();
  return JSON.parse(text.replace(/^\uFEFF/, "")) as T;
}

async function getText(url: string, encoding = "utf-8"): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${res.status} ao baixar ${url}`);
  return new TextDecoder(encoding).decode(await res.arrayBuffer());
}

interface CkanResource {
  name: string;
  format: string;
  url: string;
  created: string;
}

async function ckanResources(dataset: string): Promise<CkanResource[]> {
  const res = await getJson<{ result: { resources: CkanResource[] } }>(
    `${ANTT_CKAN}/package_show?id=${dataset}`,
  );
  return res.result.resources;
}

/** Recurso mais recente cujo nome contém `trecho` (ex.: "Horários - SIGMA"). */
function maisRecente(resources: CkanResource[], trecho: string, format: string) {
  const found = resources
    .filter((r) => r.name.includes(trecho) && r.format.toUpperCase() === format)
    .sort((a, b) => b.created.localeCompare(a.created))[0];
  if (!found) throw new Error(`Recurso "${trecho}" (${format}) não encontrado na ANTT`);
  return found;
}

// ---------------------------------------------------------------------------
// IBGE — devolve os acentos aos nomes do DER-MG, que vêm em maiúsculas sem acento
// ---------------------------------------------------------------------------

async function nomesMunicipiosMG(): Promise<Map<string, string>> {
  const lista = await getJson<{ nome: string }[]>(IBGE_MG);
  return new Map(lista.map((m) => [semAcento(m.nome), m.nome]));
}

/** Limpa abreviações e marcações do DER-MG: "STA.MARGARIDA", "SIMONESIA E/S", "(EMANCIPADO)". */
function limparNomeDer(bruto: string) {
  return semAcento(bruto)
    .replace(/\(.*?\)/g, " ")
    .replace(/\bE\/S\b/g, " ")
    .replace(/\bSTA\.?\s*/g, "SANTA ")
    .replace(/\bSTO\.?\s*/g, "SANTO ")
    .replace(/\bS\.\s*/g, "SAO ")
    .replace(/'/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const semPreposicoes = (s: string) =>
  s
    .replace(/\b(DO|DA|DE|DOS|DAS)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

function nomeProprio(bruto: string, ibge: Map<string, string>): string {
  const chave = limparNomeDer(bruto);
  if (ibge.has(chave)) return ibge.get(chave)!;
  // "SANTANA MANHUACU" → "Santana do Manhuaçu"
  for (const [k, nome] of ibge) if (semPreposicoes(k) === semPreposicoes(chave)) return nome;
  return chave
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase())
    .replace(/\b(Da|De|Do|Das|Dos|E)\b/g, (w) => w.toLowerCase());
}

// ---------------------------------------------------------------------------
// ANTT — linhas interestaduais que atendem Manhuaçu
// ---------------------------------------------------------------------------

interface AnttSecao {
  cnpj: string;
  razao_social: string;
  prefixo: string;
  descricao_linha: string;
  municipio_origem: string;
  uf_origem: string;
  municipio_destino: string;
  uf_destino: string;
}

interface AnttHorario {
  prefixo: string;
  tipo_veiculo: string;
  sentido: string;
  horario: string;
  segunda_feira: string;
  terca_feira: string;
  quarta_feira: string;
  quinta_feira: string;
  sexta_feira: string;
  sabado: string;
  domingo: string;
  [mes: string]: string;
}

const MESES_ANTT = [
  "janeiro",
  "fevereiro",
  "marco",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
const DIAS_ANTT = [
  "domingo",
  "segunda_feira",
  "terca_feira",
  "quarta_feira",
  "quinta_feira",
  "sexta_feira",
  "sabado",
];

/** "ES/Guarapari - MG/Belo Horizonte - Via João Monlevade (MG)" → pontas da linha. */
function pontasAntt(descricao: string) {
  const [a, b] = descricao.split(" - ");
  const [ufO, ...o] = a.split("/");
  const [ufD, ...d] = (b ?? "").split("/");
  return {
    uf_origem: ufO.trim(),
    origem: o.join("/").trim(),
    uf_destino: ufD.trim(),
    destino: d.join("/").trim(),
  };
}

async function importarAntt() {
  const recursos = await ckanResources("gerenciamento-de-autorizacoes");
  const secoesRes = maisRecente(recursos, "Empresas, Linhas e Seções - SIGMA", "JSON");
  const horariosRes = maisRecente(recursos, "Horários - SIGMA", "JSON");
  const competencia = secoesRes.name.split(" - ")[0]; // ex.: "Set2026"
  console.log(`ANTT: ${secoesRes.name} · ${horariosRes.name}`);

  const secoesRaw = await getJson<Record<string, AnttSecao[]>>(secoesRes.url);
  const secoes = Object.values(secoesRaw)[0].filter(
    (s) =>
      (isManhuacu(s.municipio_origem) && s.uf_origem === UF) ||
      (isManhuacu(s.municipio_destino) && s.uf_destino === UF),
  );

  const empresas = new Map<string, EmpresaRow>();
  const linhas = new Map<string, LinhaRow>();

  for (const s of secoes) {
    const cnpj = s.cnpj.replace(/\D/g, "");
    empresas.set(cnpj, { cnpj, razao_social: s.razao_social.trim(), fonte: "ANTT" });

    const outra = isManhuacu(s.municipio_origem)
      ? `${s.municipio_destino}/${s.uf_destino}`
      : `${s.municipio_origem}/${s.uf_origem}`;

    let linha = linhas.get(s.prefixo);
    if (!linha) {
      const p = pontasAntt(s.descricao_linha);
      linha = {
        fonte: "ANTT",
        codigo: s.prefixo,
        numero: null,
        descricao: s.descricao_linha.trim(),
        empresa_cnpj: cnpj,
        ...p,
        ambito: "interestadual",
        relacao_manhuacu: relacao(p.origem, p.destino),
        cidades_atendidas: [],
      };
      linhas.set(s.prefixo, linha);
    }
    if (!linha.cidades_atendidas.includes(outra)) linha.cidades_atendidas.push(outra);
  }

  const horariosRaw = await getJson<Record<string, AnttHorario[]>>(horariosRes.url);
  const horarios: HorarioRow[] = [];
  for (const h of Object.values(horariosRaw)[0]) {
    const linha = linhas.get(h.prefixo);
    if (!linha) continue;
    const sentido = h.sentido.trim().toLowerCase() === "volta" ? "volta" : "ida";
    const meses = MESES_ANTT.flatMap((m, i) => (h[m]?.trim() ? [i + 1] : []));
    horarios.push({
      fonte: "ANTT",
      linha_codigo: linha.codigo,
      sentido,
      hora: `${h.horario.trim()}:00`.slice(0, 8),
      tipo_servico: h.tipo_veiculo.trim(),
      parte_de_manhuacu: parteDeManhuacu(linha.relacao_manhuacu, sentido),
      dias_semana: DIAS_ANTT.flatMap((d, i) => (h[d]?.trim() ? [i] : [])),
      feriado: null,
      meses: meses.length === 12 ? [] : meses,
      competencia,
    });
  }

  return { empresas: [...empresas.values()], linhas: [...linhas.values()], horarios, competencia };
}

// ---------------------------------------------------------------------------
// ANTT — passagens vendidas (MONITRIIP), últimos meses
// ---------------------------------------------------------------------------

async function importarPassagens() {
  // Os nomes seguem "Ago26 - Bilhete de Passagem"; a data de upload não segue a ordem dos meses.
  const MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const chaveMes = (nome: string) => {
    const m = nome.match(/^([A-Za-z]{3})(\d{2})/);
    return m ? Number(m[2]) * 100 + MES.indexOf(m[1]) : -1;
  };
  const recursos = (await ckanResources("monitriip-bilhetes-de-passagem"))
    .filter((r) => r.format.toUpperCase() === "CSV" && r.name.includes("Bilhete de Passagem"))
    .sort((a, b) => chaveMes(b.name) - chaveMes(a.name))
    .slice(0, MESES_PASSAGENS);

  const linhas: PassagemRow[] = [];
  for (const r of recursos) {
    console.log(`ANTT: ${r.name}`);
    const csv = await getText(r.url, "windows-1252");
    for (const line of csv.split(/\r?\n/).slice(1)) {
      if (!line.includes(CIDADE)) continue;
      const [mesEmissao, mesViagem, origemUf, destinoUf, servico, gratuidade, media, dp, qtd] =
        line.split(";");
      const [origem, ufO] = origemUf.split("/");
      const [destino, ufD] = destinoUf.split("/");
      if (!isManhuacu(origem) && !isManhuacu(destino)) continue;
      linhas.push({
        mes_emissao: mesParaData(mesEmissao),
        mes_viagem: mesParaData(mesViagem),
        origem: origem.trim(),
        uf_origem: ufO.trim(),
        destino: destino.trim(),
        uf_destino: ufD.trim(),
        tipo_servico: servico.trim(),
        tipo_gratuidade: gratuidade.trim(),
        valor_medio: Number(media),
        valor_desvio: Number(dp),
        quantidade: Number(qtd),
      });
    }
  }
  return linhas;
}

// ---------------------------------------------------------------------------
// DER-MG — linhas intermunicipais com parada em Manhuaçu
// ---------------------------------------------------------------------------

/** O portal do DER-MG é JSF: o download exige sessão + ViewState da própria página. */
async function baixarArquivoDer(nomeArquivo: "quadro_horario_inter.txt" | "itinerario_inter.txt") {
  const page = await fetch(DER_MG, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  const cookie = (page.headers.get("set-cookie") ?? "").split(";")[0];
  const html = await page.text();
  const viewState = html.match(/name="javax\.faces\.ViewState"[^>]*value="([^"]+)"/)?.[1];
  const action = html.match(/<form id="tabview:j_idt16"[^>]*action="([^"]+)"/)?.[1];
  const botao = html.match(
    new RegExp(`'(tabview:j_idt16:j_idt\\d+)'[^}]*'nomeArquivo':'${nomeArquivo}'`),
  )?.[1];
  if (!viewState || !action || !botao)
    throw new Error(`DER-MG: não achei o formulário de ${nomeArquivo}`);

  const body = new URLSearchParams({
    "tabview:j_idt16": "tabview:j_idt16",
    [botao]: botao,
    nomeArquivo,
    "javax.faces.ViewState": viewState,
  });
  const res = await fetch(new URL(action, DER_MG), {
    method: "POST",
    headers: { cookie, "content-type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`DER-MG: ${res.status} ao baixar ${nomeArquivo}`);
  return res.text();
}

const linhasTxt = (txt: string) =>
  txt
    .split(/\r?\n/)
    .slice(1)
    .filter((l) => l.includes(";"))
    .map((l) => l.split(";").map((c) => c.trim()));

/** Pontos do DER-MG vêm como "LOCALIDADE = MUNICÍPIO"; devolve o município. */
const municipioDoPonto = (ponto: string) => (ponto.split("=").pop() ?? ponto).trim();
const pontoEhTerminalManhuacu = (ponto: string) => /^MANHUACU(\s+E\/S)?$/.test(semAcento(ponto));

async function importarDerMg(ibge: Map<string, string>) {
  const [itinerarioTxt, horarioTxt] = [
    await baixarArquivoDer("itinerario_inter.txt"),
    await baixarArquivoDer("quadro_horario_inter.txt"),
  ];
  const competencia = new Date().toISOString().slice(0, 7);
  console.log(`DER-MG: itinerários e quadro de horários (${competencia})`);

  // COD_LINHA;NUM_LINHA;NOME_LINHA;NUM_SEQU;COD_ORI;NOME_ORI;COD_DEST;NOME_DEST
  const porLinha = new Map<string, { numero: string; nome: string; pontos: string[] }>();
  for (const [cod, num, nome, , , nomeOri, , nomeDest] of linhasTxt(itinerarioTxt)) {
    const l = porLinha.get(cod) ?? { numero: num, nome, pontos: [] };
    l.pontos.push(nomeOri, nomeDest);
    porLinha.set(cod, l);
  }

  const linhas: LinhaRow[] = [];
  for (const [codigo, l] of porLinha) {
    if (!l.pontos.some(pontoEhTerminalManhuacu)) continue;
    const [o, d = ""] = l.nome.split(" - ");
    const origem = nomeProprio(o.split(",")[0], ibge);
    const destino = nomeProprio(d.split(",")[0], ibge);
    const cidades = [
      ...new Set(
        l.pontos
          .map((p) => nomeProprio(municipioDoPonto(p), ibge))
          // pontos como "BR474/MG108" são entroncamentos de rodovia, não cidades
          .filter((c) => !isManhuacu(c) && !/\d/.test(c))
          .map((c) => `${c}/MG`),
      ),
    ];
    linhas.push({
      fonte: "DER-MG",
      codigo,
      numero: l.numero,
      descricao: `${origem} - ${destino}${l.nome.includes(",") ? `, ${nomeProprio(l.nome.split(",").slice(1).join(",").trim(), ibge)}` : ""}`,
      empresa_cnpj: null, // o DER-MG não publica a empresa operadora nesses arquivos
      origem,
      uf_origem: "MG",
      destino,
      uf_destino: "MG",
      ambito: "intermunicipal",
      relacao_manhuacu: relacao(origem, destino),
      cidades_atendidas: cidades,
    });
  }

  const porCodigo = new Map(linhas.map((l) => [l.codigo, l]));
  const horarios: HorarioRow[] = [];
  // COD_LINHA;NUM_LINHA;NOME_LINHA;HORA_PARTIDA;TRAJETO;SEGUNDA;…;DOMINGO;FERIADO
  for (const [cod, , , hora, trajeto, seg, ter, qua, qui, sex, sab, dom, fer] of linhasTxt(
    horarioTxt,
  )) {
    const linha = porCodigo.get(cod);
    if (!linha) continue;
    const sentido = trajeto.toUpperCase() === "VOLTA" ? "volta" : "ida";
    horarios.push({
      fonte: "DER-MG",
      linha_codigo: cod,
      sentido,
      hora,
      tipo_servico: "",
      parte_de_manhuacu: parteDeManhuacu(linha.relacao_manhuacu, sentido),
      dias_semana: [dom, seg, ter, qua, qui, sex, sab].flatMap((v, i) => (v === "S" ? [i] : [])),
      feriado: fer === "S",
      meses: [],
      competencia,
    });
  }

  return { linhas, horarios, competencia };
}

// ---------------------------------------------------------------------------
// Gravação
// ---------------------------------------------------------------------------

async function gravarJson(dados: Record<string, unknown>) {
  const dir = new URL("./saida/", import.meta.url);
  await mkdir(dir, { recursive: true });
  for (const [nome, valor] of Object.entries(dados)) {
    await writeFile(new URL(`${nome}.json`, dir), JSON.stringify(valor, null, 2));
  }
  console.log(`JSON gravado em scripts/saida/`);
}

// A ANTT publica a mesma partida (linha, sentido, hora, serviço) em mais de uma linha,
// cada uma com parte dos dias da semana. O banco guarda uma só: os dias são unidos.
function unirHorariosRepetidos(horarios: HorarioRow[]) {
  const porChave = new Map<string, HorarioRow>();
  for (const h of horarios) {
    const chave = [h.fonte, h.linha_codigo, h.sentido, h.hora, h.tipo_servico].join("|");
    const atual = porChave.get(chave);
    if (!atual) {
      porChave.set(chave, { ...h });
      continue;
    }
    atual.dias_semana = [...new Set([...atual.dias_semana, ...h.dias_semana])].sort();
    // Meses vazio = o ano todo, então só une quando os dois têm meses definidos.
    atual.meses =
      atual.meses.length && h.meses.length
        ? [...new Set([...atual.meses, ...h.meses])].sort((a, b) => a - b)
        : [];
    atual.parte_de_manhuacu ||= h.parte_de_manhuacu;
    if (atual.feriado !== h.feriado) atual.feriado = atual.feriado || h.feriado;
  }
  return porChave;
}

async function gravarSupabase(
  empresas: EmpresaRow[],
  linhas: LinhaRow[],
  horarios: HorarioRow[],
  passagens: PassagemRow[],
  registros: { fonte: string; recurso: string; competencia: string; registros: number }[],
) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou use --dry-run).");
  const db = createClient(url, key, { auth: { persistSession: false } });
  const ok = <T>({ data, error }: { data: T; error: unknown }) => {
    if (error) throw error;
    return data;
  };

  const agora = new Date().toISOString();
  const empresasDb = ok(
    await db
      .from("empresas")
      .upsert(
        empresas.map((e) => ({ ...e, ativa: true, atualizado_em: agora })),
        { onConflict: "cnpj" },
      )
      .select("id, cnpj"),
  )!;
  const empresaId = new Map(empresasDb.map((e) => [e.cnpj, e.id]));

  const linhasDb = ok(
    await db
      .from("linhas")
      .upsert(
        linhas.map(({ empresa_cnpj, ...l }) => ({
          ...l,
          empresa_id: empresa_cnpj ? empresaId.get(empresa_cnpj) : null,
          ativa: true,
          atualizado_em: agora,
        })),
        { onConflict: "fonte,codigo" },
      )
      .select("id, fonte, codigo"),
  )!;
  const linhaId = new Map(linhasDb.map((l) => [`${l.fonte}:${l.codigo}`, l.id]));

  // Linhas que sumiram da publicação ficam inativas (histórico preservado).
  for (const fonte of ["ANTT", "DER-MG"] as const) {
    const vigentes = linhasDb.filter((l) => l.fonte === fonte).map((l) => l.id);
    ok(
      await db
        .from("linhas")
        .update({ ativa: false })
        .eq("fonte", fonte)
        .not("id", "in", `(${vigentes.join(",")})`),
    );
  }

  // Horários: substitui a grade inteira pela competência nova.
  ok(
    await db
      .from("horarios")
      .delete()
      .in("linha_id", [...linhaId.values()]),
  );
  const horariosDb = [...unirHorariosRepetidos(horarios).values()].map(
    ({ fonte, linha_codigo, ...h }) => ({
      ...h,
      linha_id: linhaId.get(`${fonte}:${linha_codigo}`)!,
    }),
  );
  for (let i = 0; i < horariosDb.length; i += 500) {
    ok(
      await db
        .from("horarios")
        .upsert(horariosDb.slice(i, i + 500), { onConflict: "linha_id,sentido,hora,tipo_servico" }),
    );
  }

  for (let i = 0; i < passagens.length; i += 500) {
    ok(
      await db.from("passagens_mensais").upsert(passagens.slice(i, i + 500), {
        onConflict:
          "mes_emissao,mes_viagem,origem,uf_origem,destino,uf_destino,tipo_servico,tipo_gratuidade",
      }),
    );
  }

  ok(await db.from("importacoes").insert(registros));
  console.log("Supabase atualizado.");
}

// ---------------------------------------------------------------------------

async function main() {
  const ibge = await nomesMunicipiosMG();
  const antt = await importarAntt();
  const der = await importarDerMg(ibge);
  const passagens = await importarPassagens();

  const linhas = [...antt.linhas, ...der.linhas];
  const horarios = [...antt.horarios, ...der.horarios];

  console.log(
    `\n${antt.empresas.length} empresas · ${linhas.length} linhas (${antt.linhas.length} ANTT, ${der.linhas.length} DER-MG) · ` +
      `${horarios.length} horários · ${passagens.length} registros de passagens`,
  );

  const registros = [
    {
      fonte: "ANTT",
      recurso: "linhas",
      competencia: antt.competencia,
      registros: antt.linhas.length,
    },
    {
      fonte: "ANTT",
      recurso: "horarios",
      competencia: antt.competencia,
      registros: antt.horarios.length,
    },
    {
      fonte: "ANTT",
      recurso: "passagens",
      competencia: passagens[0]?.mes_emissao ?? "",
      registros: passagens.length,
    },
    {
      fonte: "DER-MG",
      recurso: "linhas",
      competencia: der.competencia,
      registros: der.linhas.length,
    },
    {
      fonte: "DER-MG",
      recurso: "horarios",
      competencia: der.competencia,
      registros: der.horarios.length,
    },
  ];

  if (dryRun) {
    await gravarJson({ empresas: antt.empresas, linhas, horarios, passagens_mensais: passagens });
  } else {
    await gravarSupabase(antt.empresas, linhas, horarios, passagens, registros);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? `${e.name}: ${e.message}` : e);
  process.exit(1);
});
