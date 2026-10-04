// Integrações automáticas: chaves de acesso dos sistemas externos (empresas, catracas,
// pagamento) e log dos eventos recebidos pela Edge Function supabase/functions/ingestao.
// Banco: supabase/migrations/20261004120000_gestao_base.sql e 20261004120400_integracoes.sql.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase";
import type { EventoIntegracao, Integracao } from "@/services/gestao-tipos";

/** Endereço público da função de ingestão. */
export const URL_INGESTAO = "https://mxlqwbpetfyejggeetmm.supabase.co/functions/v1/ingestao";

export type TipoIntegracao = Integracao["tipo"];
export type StatusEvento = EventoIntegracao["status"];

export const TIPOS_INTEGRACAO: { valor: TipoIntegracao; rotulo: string; descricao: string }[] = [
  {
    valor: "empresa",
    rotulo: "Empresa de ônibus",
    descricao: "Sistema de venda / MONITRIIP da empresa. Só grava dados da própria empresa.",
  },
  {
    valor: "catraca",
    rotulo: "Catracas",
    descricao: "Leituras de bilhete no acesso às plataformas (acesso, reentrada, negado).",
  },
  {
    valor: "pagamento",
    rotulo: "Sistema de pagamento",
    descricao: "Confirmação de pagamento das taxas de embarque.",
  },
  {
    valor: "outro",
    rotulo: "Outro sistema",
    descricao: "Envia dados operacionais de várias empresas, identificadas pelo CNPJ.",
  },
];

export const rotuloTipoIntegracao = (t: string) =>
  TIPOS_INTEGRACAO.find((x) => x.valor === t)?.rotulo ?? t;

export const TIPOS_EVENTO = [
  "venda-passagem",
  "cancelamento-passagem",
  "embarque",
  "inicio-fim-viagem",
  "relato-viagem",
  "pagamento",
] as const;

export const ROTULO_EVENTO: Record<string, string> = {
  "venda-passagem": "Venda de passagem",
  "cancelamento-passagem": "Cancelamento",
  embarque: "Embarque",
  "inicio-fim-viagem": "Chegada / partida",
  "relato-viagem": "Relato de passageiros",
  pagamento: "Pagamento",
};

export interface IntegracaoComEmpresa extends Integracao {
  empresa: { id: string; razao_social: string; cnpj: string } | null;
}

export interface FiltroEventos {
  status?: StatusEvento | "todos";
  tipo?: string | "todos";
  integracaoId?: string | "todas";
}

const chaves = {
  integracoes: ["integracoes"] as const,
  eventos: (f: FiltroEventos) => ["eventos_integracao", f] as const,
};

async function auditar(acao: string, descricao: string) {
  // Falha na auditoria não deve desfazer a ação já concluída.
  await getSupabase().rpc("registrar_auditoria", {
    p_acao: acao,
    p_modulo: "Integrações",
    p_descricao: descricao,
  });
}

export function useIntegracoes() {
  return useQuery({
    queryKey: chaves.integracoes,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("integracoes")
        .select(
          "id, nome, descricao, tipo, empresa_id, chave_prefixo, ativa, ultimo_evento_em, criado_em, empresa:empresas(id, razao_social, cnpj)",
        )
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data as unknown as IntegracaoComEmpresa[];
    },
  });
}

export function useEventosIntegracao(filtro: FiltroEventos) {
  return useQuery({
    queryKey: chaves.eventos(filtro),
    refetchInterval: 30_000,
    queryFn: async () => {
      let q = getSupabase()
        .from("eventos_integracao")
        .select("*")
        .order("recebido_em", { ascending: false })
        .limit(200);
      if (filtro.status && filtro.status !== "todos") q = q.eq("status", filtro.status);
      if (filtro.tipo && filtro.tipo !== "todos") q = q.eq("tipo", filtro.tipo);
      if (filtro.integracaoId && filtro.integracaoId !== "todas")
        q = q.eq("integracao_id", filtro.integracaoId);
      const { data, error } = await q;
      if (error) throw error;
      return data as EventoIntegracao[];
    },
  });
}

export interface NovaIntegracao {
  nome: string;
  tipo: TipoIntegracao;
  empresaId: string | null;
  descricao: string;
}

/** Cria a integração e devolve a chave em texto — ela não pode ser consultada depois. */
export function useCriarIntegracao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (n: NovaIntegracao) => {
      const { data, error } = await getSupabase().rpc("criar_integracao", {
        p_nome: n.nome,
        p_tipo: n.tipo,
        p_empresa_id: n.empresaId,
        p_descricao: n.descricao,
      });
      if (error) throw error;
      await auditar(
        "Criar integração",
        `Integração "${n.nome}" (${rotuloTipoIntegracao(n.tipo)}) criada.`,
      );
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.integracoes }),
  });
}

export function useRevogarIntegracao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (i: Pick<Integracao, "id" | "nome">) => {
      const { error } = await getSupabase().rpc("revogar_integracao", { p_id: i.id });
      if (error) throw error;
      await auditar("Revogar integração", `Chave da integração "${i.nome}" revogada.`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.integracoes }),
  });
}

export function useReativarIntegracao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (i: Pick<Integracao, "id" | "nome">) => {
      const { error } = await getSupabase()
        .from("integracoes")
        .update({ ativa: true })
        .eq("id", i.id);
      if (error) throw error;
      await auditar("Reativar integração", `Integração "${i.nome}" reativada.`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.integracoes }),
  });
}

// ---------------------------------------------------------------------------
// Exemplos exibidos na aba "Como integrar" (mesmos formatos do README da função).
// ---------------------------------------------------------------------------

export interface ExemploEvento {
  tipo: (typeof TIPOS_EVENTO)[number];
  titulo: string;
  quem: string;
  explicacao: string;
  simples: Record<string, unknown>;
  monitriip?: { servico: string; caminho: string; corpo: Record<string, unknown> };
}

export const EXEMPLOS: ExemploEvento[] = [
  {
    tipo: "venda-passagem",
    titulo: "Venda de passagem",
    quem: "Empresa",
    explicacao:
      "Bilhete vendido com embarque ou desembarque em Manhuaçu. Reenvio do mesmo bilhete atualiza o registro.",
    simples: {
      tipo: "venda-passagem",
      dados: {
        bilhete: "123456",
        empresa_cnpj: "00000000000000",
        linha: "MGSP0000000",
        data: "2026-10-04",
        hora: "08:30:00",
        sentido: "ida",
        origem: "Manhuaçu",
        destino: "São Paulo",
        valor: 189.9,
        emitido_em: "2026-10-01T14:10:00-03:00",
      },
    },
    monitriip: {
      servico: "InserirLogVendaPassagem",
      caminho: "/bilhetes/venda",
      corpo: {
        idLog: "0",
        codigoIdentificadorBilhete: "0",
        cnpjEmpresaTransporte: "00000000000000",
        chaveBPeEquipFiscal: "31261000000000000000000000000000000000000000",
        numeroBilhete: "123456",
        dataHoraEmissaoBilhete: "2026-10-01T14:10:00-03:00",
        identificacaoLinha: "MGSP0000000",
        codigoMunicipioEmbarquePassageiro: "3139409",
        codigoMunicipioDesembarquePassageiro: "3550308",
        dataViagemPassageiro: "2026-10-04",
        horaViagemPassageiro: "08:30:00",
        valorTotal: "189.90",
        idViagem: "20261004-083000-01-1-MGSP0000000",
      },
    },
  },
  {
    tipo: "cancelamento-passagem",
    titulo: "Cancelamento de passagem",
    quem: "Empresa",
    explicacao: "Marca o bilhete como cancelado (reembolso, remarcação ou troca de titular).",
    simples: {
      tipo: "cancelamento-passagem",
      dados: {
        bilhete: "123456",
        empresa_cnpj: "00000000000000",
        cancelado_em: "2026-10-02T09:00:00-03:00",
      },
    },
    monitriip: {
      servico: "InserirLogCancelarPassagem",
      caminho: "/bilhetes/cancelamento",
      corpo: {
        idLog: "11",
        cnpjEmpresaTransporte: "00000000000000",
        numeroBilhete: "123456",
        identificacaoLinha: "MGSP0000000",
        dataViagemPassageiro: "2026-10-04",
        horaViagemPassageiro: "08:30:00",
        codigoMotivoCancelamento: "1",
        dataHoraCancelamento: "2026-10-02T09:00:00-03:00",
        idViagem: "20261004-083000-01-1-MGSP0000000",
      },
    },
  },
  {
    tipo: "embarque",
    titulo: "Embarque / catraca",
    quem: "Empresa ou catraca",
    explicacao:
      "Leitura do bilhete na catraca (acesso, reentrada ou negado) ou check-in no validador do ônibus.",
    simples: {
      tipo: "embarque",
      dados: {
        bilhete: "123456",
        evento: "acesso",
        dispositivo: "Catraca 02",
        ocorrido_em: "2026-10-04T08:12:00-03:00",
      },
    },
    monitriip: {
      servico: "InserirLogBilheteEmbarque",
      caminho: "/bilhetes/embarque",
      corpo: {
        idLog: "9",
        cnpjEmpresaTransporte: "00000000000000",
        placaVeiculo: "ABC1D23",
        dataHoraEvento: "2026-10-04T08:12:00-03:00",
        idViagem: "20261004-083000-01-1-MGSP0000000",
        numeroBilhete: "123456",
        identificacaoLinha: "MGSP0000000",
        dataPrevistaViagemPassageiro: "2026-10-04",
        horaPrevistaViagemPassageiro: "08:30:00",
        codigoMunicipioEmbarquePassageiro: "3139409",
        codigoEmbarque: "1",
      },
    },
  },
  {
    tipo: "inicio-fim-viagem",
    titulo: "Chegada / partida no terminal",
    quem: "Empresa",
    explicacao:
      "Atualiza a viagem com o horário real de chegada ou partida (ou cancelamento). No MONITRIIP, conta o início/fim que acontece em Manhuaçu.",
    simples: {
      tipo: "inicio-fim-viagem",
      dados: {
        evento: "partida",
        ocorrido_em: "2026-10-04T08:34:00-03:00",
        empresa_cnpj: "00000000000000",
        linha: "MGSP0000000",
        data: "2026-10-04",
        hora: "08:30:00",
        sentido: "ida",
        veiculo: "ABC1D23",
        plataforma: "3",
      },
    },
    monitriip: {
      servico: "InserirLogInicioFimViagemRegular",
      caminho: "/viagens/regular/inicio-fim",
      corpo: {
        idLog: "7",
        cnpjEmpresaTransporte: "00000000000000",
        placaVeiculo: "ABC1D23",
        identificacaoLinha: "MGSP0000000",
        dataProgramadaViagem: "2026-10-04",
        horaProgramadaViagem: "08:30:00",
        tipoRegistroViagem: "1",
        codigoSentidoLinha: "1",
        latitude: "-20.2577",
        longitude: "-42.0283",
        dataHoraEvento: "2026-10-04T08:34:00-03:00",
        idViagem: "20261004-083000-01-1-MGSP0000000",
      },
    },
  },
  {
    tipo: "relato-viagem",
    titulo: "Relato de passageiros",
    quem: "Empresa",
    explicacao: "Quantidade de passageiros embarcados em Manhuaçu declarada pela empresa.",
    simples: {
      tipo: "relato-viagem",
      dados: {
        empresa_cnpj: "00000000000000",
        linha: "MGSP0000000",
        data: "2026-10-04",
        hora: "08:30:00",
        sentido: "ida",
        passageiros: 38,
      },
    },
  },
  {
    tipo: "pagamento",
    titulo: "Pagamento de taxa",
    quem: "Sistema de pagamento",
    explicacao:
      "Confirma (ou estorna) o pagamento de uma taxa. A referência identifica o pagamento: reenviar com outro status atualiza.",
    simples: {
      tipo: "pagamento",
      dados: {
        referencia: "PIX-E0000000020261004",
        taxa_numero: "TX-2026-09-0001",
        empresa_cnpj: "00000000000000",
        valor: 1520.0,
        pago_em: "2026-10-04T10:00:00-03:00",
        meio: "Pix",
        status: "confirmado",
      },
    },
  },
];

export function exemploCurl(corpo: unknown, caminho = "") {
  return [
    `curl -X POST "${URL_INGESTAO}${caminho}" \\`,
    `  -H "x-api-key: SUA_CHAVE" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '${JSON.stringify(corpo, null, 2)}'`,
  ].join("\n");
}
