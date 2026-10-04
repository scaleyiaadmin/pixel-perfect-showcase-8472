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
