// Tipos das tabelas de gestão do terminal (supabase/migrations/20261004120000_gestao_base.sql).
// Espelham as colunas do banco; cada módulo tem seu arquivo de serviço com os hooks.

export type Papel =
  "administrador" | "gestor" | "operacional" | "financeiro" | "auditor" | "consulta" | "empresa";

export interface Perfil {
  user_id: string;
  nome: string;
  email: string;
  papel: Papel;
  empresa_id: string | null;
  ativo: boolean;
  ultimo_acesso: string | null;
  criado_em: string;
}

export interface Configuracao {
  chave: string;
  valor: unknown;
  descricao: string;
  atualizado_em: string;
}

export interface Plataforma {
  id: string;
  numero: string;
  em_manutencao: boolean;
  observacao: string;
  ativa: boolean;
}

export type TipoViagem = "partida" | "chegada" | "passagem";

export type StatusViagem =
  "prevista" | "embarque" | "ultima-chamada" | "partiu" | "realizada" | "atrasada" | "cancelada";

export interface Viagem {
  id: string;
  data: string;
  horario_id: string | null;
  linha_id: string | null;
  empresa_id: string | null;
  numero: string;
  tipo: TipoViagem;
  origem: string;
  destino: string;
  previsto_em: string | null;
  chegou_em: string | null;
  partiu_em: string | null;
  plataforma_id: string | null;
  veiculo: string;
  status: StatusViagem;
  observacao: string;
  atualizado_em: string;
}

export interface Bilhete {
  id: string;
  codigo: string;
  empresa_id: string | null;
  viagem_id: string | null;
  origem: string;
  destino: string;
  valor: number | null;
  gratuidade: string;
  status: "emitida" | "utilizada" | "cancelada" | "nao-utilizada";
  emitido_em: string;
  cancelado_em: string | null;
  integracao_id: string | null;
}

export interface EventoEmbarque {
  id: string;
  ocorrido_em: string;
  dispositivo: string;
  viagem_id: string | null;
  bilhete_codigo: string;
  evento: "acesso" | "reentrada" | "negado";
  status: "confirmado" | "pendente" | "rejeitado";
  integracao_id: string | null;
}

export interface RelatoEmpresa {
  viagem_id: string;
  empresa_id: string | null;
  passageiros: number;
  enviado_em: string;
  integracao_id: string | null;
}

export interface Conciliacao {
  viagem_id: string;
  situacao: "em-analise" | "conferido" | "necessita-conferencia";
  observacao: string;
  conferido_por: string | null;
  conferido_em: string | null;
}

export interface Taxa {
  id: string;
  numero: string;
  empresa_id: string;
  competencia: string;
  embarques: number;
  valor_unitario: number;
  valor: number;
  vencimento: string;
  status: "pago" | "pendente" | "inadimplente" | "cancelada";
  criado_em: string;
}

export interface Pagamento {
  id: string;
  taxa_id: string | null;
  empresa_id: string;
  valor: number;
  pago_em: string;
  meio: string;
  referencia_externa: string;
  status: "confirmado" | "processando" | "estornado";
  integracao_id: string | null;
  registrado_por: string | null;
  criado_em: string;
}

export interface Integracao {
  id: string;
  nome: string;
  descricao: string;
  tipo: "empresa" | "catraca" | "pagamento" | "outro";
  empresa_id: string | null;
  chave_prefixo: string;
  ativa: boolean;
  ultimo_evento_em: string | null;
  criado_em: string;
}

export interface EventoIntegracao {
  id: string;
  integracao_id: string | null;
  recebido_em: string;
  tipo: string;
  payload: unknown;
  status: "processado" | "erro" | "ignorado";
  erro: string | null;
}

export interface RegistroAuditoria {
  id: string;
  ocorrido_em: string;
  user_id: string | null;
  usuario: string;
  acao: string;
  modulo: string;
  descricao: string;
}
