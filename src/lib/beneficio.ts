/**
 * Classifica o benefício tarifário de uma passagem a partir do texto da
 * gratuidade (ANTT/MONITRIIP ou integração da empresa).
 *
 * - "isencao": passageiro não paga (criança, idoso 100%, jovem 100%, passe livre…)
 * - "desconto": paga parte da tarifa (idoso 50%, jovem 50%, tarifa promocional…)
 * - "normal": tarifa cheia
 */
export type Beneficio = "normal" | "desconto" | "isencao";

export function tipoBeneficio(gratuidade: string | null | undefined): Beneficio {
  const t = (gratuidade ?? "").trim().toLowerCase();
  if (!t || t.startsWith("tarifa normal")) return "normal";
  if (t.includes("100%")) return "isencao";
  if (/\d+\s*%|desconto|promocional/.test(t)) return "desconto";
  return "isencao";
}

export const beneficioLabel: Record<Beneficio, string> = {
  normal: "Tarifa normal",
  desconto: "Desconto",
  isencao: "Isenção",
};
