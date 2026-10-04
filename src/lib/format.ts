// Formatação pt-BR usada nas telas.
export const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const num = (value: number) => value.toLocaleString("pt-BR");

// Datas e horas sempre no fuso do terminal.
export const TZ = "America/Sao_Paulo";

export const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

export const dataCurta = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { timeZone: TZ });

export const dataHora = (iso: string) => `${dataCurta(iso)} ${hora(iso)}`;

// "YYYY-MM-DD" de hoje no fuso do terminal.
export const hojeISO = () => new Date().toLocaleDateString("sv-SE", { timeZone: TZ });

/* --------------------------- Exibição de nomes --------------------------- */

/** Texto padrão para valor ausente em células/campos (exibir em `text-muted-foreground`). */
export const VAZIO = "—";

// Siglas que ficam em caixa alta.
const SIGLAS = new Set([
  "ME",
  "EPP",
  "EIRELI",
  "MEI",
  "SS",
  "ANTT",
  "DER",
  "DER-MG",
  "DNIT",
  "MG",
  "SP",
  "RJ",
  "ES",
  "BA",
  "GO",
  "DF",
  "PR",
  "SC",
  "RS",
  "BR",
  "CNPJ",
  "CPF",
  "UF",
  "ONG",
  "II",
  "III",
  "IV",
  "VI",
  "VII",
  "VIII",
  "IX",
  "XI",
  "XII",
  "TV",
  "GPS",
  "MONITRIIP",
]);

// Preposições/conjunções em minúsculas (exceto no início).
const MINUSCULAS = new Set(["de", "da", "do", "dos", "das", "e", "em", "na", "no", "nas", "nos"]);

// Palavras frequentes nos cadastros públicos que chegam sem acento.
const ACENTOS: Record<string, string> = {
  viacao: "Viação",
  aguia: "Águia",
  sao: "São",
  uniao: "União",
  manhuacu: "Manhuaçu",
  onibus: "Ônibus",
  rodoviario: "Rodoviário",
  rodoviaria: "Rodoviária",
  comercio: "Comércio",
  servicos: "Serviços",
  servico: "Serviço",
  logistica: "Logística",
  joao: "João",
  conceicao: "Conceição",
  espirito: "Espírito",
  vitoria: "Vitória",
  brasilia: "Brasília",
  goiania: "Goiânia",
  paraiso: "Paraíso",
  caparao: "Caparaó",
  vicosa: "Viçosa",
  associacao: "Associação",
  transportacao: "Transportação",
  locacao: "Locação",
  locacoes: "Locações",
  turistico: "Turístico",
  ribeirao: "Ribeirão",
  jose: "José",
  antonio: "Antônio",
  sebastiao: "Sebastião",
  simao: "Simão",
  inacio: "Inácio",
  alianca: "Aliança",
  cia: "Cia.",
  muriae: "Muriaé",
  unica: "Única",
  rapido: "Rápido",
  nacao: "Nação",
  agua: "Água",
  aguas: "Águas",
  belem: "Belém",
  ceu: "Céu",
};

const capitalizar = (p: string) => (p ? p[0].toLocaleUpperCase("pt-BR") + p.slice(1) : p);

function palavra(token: string, inicio: boolean): string {
  const upper = token.toLocaleUpperCase("pt-BR");
  const lower = token.toLocaleLowerCase("pt-BR");
  const semPonto = upper.replace(/\.$/, "");
  if (SIGLAS.has(semPonto)) return upper;
  if (/\d/.test(token)) return upper; // BR-116, KM 12
  if (semPonto === "LTDA") return "Ltda" + (upper.endsWith(".") ? "." : "");
  if (semPonto === "S/A" || semPonto === "S.A" || semPonto === "S/C") return upper;
  if (!inicio && MINUSCULAS.has(lower)) return lower;
  if (token.includes("-")) {
    return token
      .split("-")
      .map((parte, i) => palavra(parte, inicio && i === 0))
      .join("-");
  }
  return ACENTOS[lower] ?? capitalizar(lower);
}

/**
 * Nome próprio em caixa mista pt-BR para exibição de cadastros em CAIXA ALTA
 * (razão social, cidades, linhas). Preserva siglas (ANTT, DER-MG, ME, EPP),
 * "LTDA" → "Ltda", "S A"/"SA" no fim → "S.A.", preposições minúsculas e
 * corrige acentos de palavras comuns. Textos que já vêm em caixa mista são
 * devolvidos como estão.
 *
 * tituloNome("VIACAO AGUIA BRANCA S A") // "Viação Águia Branca S.A."
 * tituloNome("EXPRESSO SAO JOSE LTDA")  // "Expresso São José Ltda"
 */
export function tituloNome(texto: string | null | undefined): string {
  const limpo = (texto ?? "").replace(/\s+/g, " ").trim();
  if (!limpo) return "";
  const letras = limpo.replace(/[^\p{L}]/gu, "");
  const temMinuscula = letras !== letras.toLocaleUpperCase("pt-BR");
  const temMaiuscula = letras !== letras.toLocaleLowerCase("pt-BR");
  if (temMinuscula && temMaiuscula) return limpo; // já formatado por alguém

  const tokens = limpo.split(" ");
  // "S A" / "SA" / "S.A." / "S.A" no fim → "S.A."
  const n = tokens.length;
  if (n >= 3 && /^s$/i.test(tokens[n - 2]) && /^a\.?$/i.test(tokens[n - 1])) {
    tokens.splice(n - 2, 2, "S.A.");
  } else if (n >= 2 && /^(sa|s\.a\.?)$/i.test(tokens[n - 1])) {
    tokens[n - 1] = "S.A.";
  }
  return tokens.map((t, i) => (t === "S.A." ? t : palavra(t, i === 0))).join(" ");
}

/**
 * Como `tituloNome`, mas para "cidade + UF": a UF volta em maiúsculas.
 * "CARATINGA/MG" → "Caratinga/MG" · "SÃO PAULO - SP" → "São Paulo - SP" ·
 * "MANHUACU (MG)" → "Manhuaçu (MG)". Sem UF, igual a `tituloNome`.
 */
export function cidadeNome(texto: string | null | undefined): string {
  const limpo = (texto ?? "").replace(/\s+/g, " ").trim();
  const m =
    limpo.match(/^(.*?\S)(\s*[/\-–]\s*)(\p{L}{2})$/u) ??
    limpo.match(/^(.*?\S)(\s*\()(\p{L}{2})\)$/u);
  if (!m) return tituloNome(limpo);
  const [, cidade, sep, uf] = m;
  const fecha = sep.trim() === "(" ? ")" : "";
  return `${tituloNome(cidade)}${sep}${uf.toLocaleUpperCase("pt-BR")}${fecha}`;
}
