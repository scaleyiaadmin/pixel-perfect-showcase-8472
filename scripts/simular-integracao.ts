/**
 * Envia eventos de exemplo para a função de ingestão — homologação com as empresas,
 * catracas e sistema de pagamento.
 *
 * Uso:
 *   INGESTAO_URL=https://<projeto>.supabase.co/functions/v1/ingestao \
 *   INGESTAO_CHAVE=srv_... \
 *   SIM_CNPJ=00000000000000 SIM_LINHA=MGSP0000000 SIM_HORA=08:30:00 \
 *   bun scripts/simular-integracao.ts [--lote] [--so-monitriip] [--so-simples]
 *
 * Variáveis opcionais:
 *   SIM_CNPJ   CNPJ da empresa da integração (precisa estar cadastrada no terminal)
 *   SIM_LINHA  prefixo ANTT / código DER-MG de uma linha que passa por Manhuaçu
 *   SIM_DATA   data da viagem (padrão: hoje, fuso America/Sao_Paulo)
 *   SIM_HORA   hora programada no ponto inicial da linha (padrão 08:30:00)
 *   SIM_SENTIDO ida | volta (padrão ida)
 *
 * ATENÇÃO: os eventos gravam bilhetes, embarques e viagens de verdade no banco do endpoint.
 * Use um ambiente de homologação. Contra o projeto de produção o script exige
 * --confirmar-producao.
 */

const PROJETO_PRODUCAO = "mxlqwbpetfyejggeetmm";

const url = process.env.INGESTAO_URL;
const chave = process.env.INGESTAO_CHAVE;
const args = new Set(process.argv.slice(2));

if (!url || !chave) {
  console.error("Defina INGESTAO_URL e INGESTAO_CHAVE (veja o cabeçalho do script).");
  process.exit(1);
}
if (url.includes(PROJETO_PRODUCAO) && !args.has("--confirmar-producao")) {
  console.error(
    "INGESTAO_URL aponta para o projeto de produção. Os dados de exemplo entrariam nos relatórios reais.\n" +
      "Use um ambiente de homologação ou, se tiver certeza, rode com --confirmar-producao.",
  );
  process.exit(1);
}

const TZ = "America/Sao_Paulo";
const cnpj = process.env.SIM_CNPJ ?? "00000000000000";
const linha = process.env.SIM_LINHA ?? "MGSP0000000";
const data = process.env.SIM_DATA ?? new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
const hora = process.env.SIM_HORA ?? "08:30:00";
const sentido = process.env.SIM_SENTIDO === "volta" ? "volta" : "ida";
const sufixo = Date.now().toString().slice(-6);
const bilhete1 = `9${sufixo}`;
const bilhete2 = `8${sufixo}`;
const agora = (minutosAntes = 0) => {
  const d = new Date(Date.now() - minutosAntes * 60_000);
  // Formato com fuso -03:00, como o MONITRIIP.
  const local = d.toLocaleString("sv-SE", { timeZone: TZ }).replace(" ", "T");
  return `${local}-03:00`;
};
const idViagem = `${data.replaceAll("-", "")}-${hora.replaceAll(":", "")}-01-${sentido === "ida" ? 1 : 0}-${linha}`;

interface Envio {
  nome: string;
  caminho?: string;
  corpo: unknown;
}

const simples: Envio[] = [
  {
    nome: "Venda de passagem (formato do terminal)",
    corpo: {
      tipo: "venda-passagem",
      dados: {
        bilhete: bilhete1,
        empresa_cnpj: cnpj,
        linha,
        data,
        hora,
        sentido,
        origem: "Manhuaçu",
        destino: "São Paulo",
        valor: 189.9,
        emitido_em: agora(60 * 24),
      },
    },
  },
  {
    nome: "Embarque na catraca (formato do terminal)",
    corpo: {
      tipo: "embarque",
      dados: {
        bilhete: bilhete1,
        empresa_cnpj: cnpj,
        evento: "acesso",
        dispositivo: "Catraca de homologação",
        ocorrido_em: agora(20),
      },
    },
  },
  {
    nome: "Partida do terminal (formato do terminal)",
    corpo: {
      tipo: "inicio-fim-viagem",
      dados: { evento: "partida", ocorrido_em: agora(5), empresa_cnpj: cnpj, linha, data, hora, sentido, veiculo: "ABC1D23" },
    },
  },
  {
    nome: "Relato de passageiros (formato do terminal)",
    corpo: { tipo: "relato-viagem", dados: { empresa_cnpj: cnpj, linha, data, hora, sentido, passageiros: 1 } },
  },
  {
    nome: "Evento com tipo inválido (deve voltar erro)",
    corpo: { tipo: "tipo-que-nao-existe", dados: {} },
  },
];

const monitriip: Envio[] = [
  {
    nome: "InserirLogVendaPassagem (MONITRIIP)",
    caminho: "/bilhetes/venda",
    corpo: {
      idLog: "0",
      codigoIdentificadorBilhete: "0",
      cnpjEmpresaTransporte: cnpj,
      chaveBPeEquipFiscal: "000013",
      numeroBilhete: bilhete2,
      dataHoraEmissaoBilhete: agora(60 * 24),
      codigoAmbitoTransporte: "1",
      identificacaoLinha: linha,
      codigoMunicipioEmbarquePassageiro: "3139409",
      codigoMunicipioDesembarquePassageiro: "3550308",
      codigoClasseConforto: "1",
      dataViagemPassageiro: data,
      horaViagemPassageiro: hora,
      codigoTipoViagem: "1",
      numeroPoltrona: "12",
      codigoMotivoDesconto: "0",
      valorTarifa: "150.00",
      percentualDesconto: "0.00",
      aliquotaICMS: "0.12",
      valorPedagio: "5.00",
      valorTaxaEmbarque: "6.00",
      valorTotal: "161.00",
      nomePassageiro: "Passageiro de Homologação",
      dataNascimentoPassageiro: "1990-01-01",
      tipoDocumentoIdentificacaoPassageiro: "1",
      documentoIdentificacaoPassageiro: "0000000",
      origemEmissao: "1",
      sequenciamento: "1",
      idViagem,
    },
  },
  {
    nome: "InserirLogBilheteEmbarque (MONITRIIP, check-in)",
    caminho: "/bilhetes/embarque",
    corpo: {
      idLog: "9",
      cnpjEmpresaTransporte: cnpj,
      placaVeiculo: "ABC1D23",
      cpfMotorista: "00000000000",
      latitude: "-20.2577",
      longitude: "-42.0283",
      pdop: "1.0",
      dataHoraEvento: agora(15),
      imei: "000000000000000",
      idViagem,
      chaveBPeEquipFiscal: "000013",
      numeroBilhete: bilhete2,
      identificacaoLinha: linha,
      dataPrevistaViagemPassageiro: data,
      horaPrevistaViagemPassageiro: hora,
      codigoMotivoDesconto: "0",
      valorTarifa: "150.00",
      percentualDesconto: "0.00",
      codigoMunicipioEmbarquePassageiro: "3139409",
      codigoLocalEmbarquePassageiro: "0000000",
      codigoMunicipioDesembarquePassageiro: "3550308",
      codigoLocalDesembarquePassageiro: "0000000",
      codigoEmbarque: "1",
      sequenciamento: "2",
    },
  },
  {
    nome: "InserirLogInicioFimViagemRegular (MONITRIIP, início no terminal)",
    caminho: "/viagens/regular/inicio-fim",
    corpo: {
      idLog: "7",
      cnpjEmpresaTransporte: cnpj,
      placaVeiculo: "ABC1D23",
      cpfMotorista: "00000000000",
      identificacaoLinha: linha,
      codigoTipoViagem: "1",
      dataProgramadaViagem: data,
      horaProgramadaViagem: hora,
      tipoRegistroViagem: "1",
      codigoSentidoLinha: sentido === "ida" ? "1" : "0",
      latitude: "-20.2577",
      longitude: "-42.0283",
      pdop: "1.0",
      dataHoraEvento: agora(5),
      imei: "000000000000000",
      sequenciamento: "3",
      idViagem,
    },
  },
  {
    nome: "InserirLogCancelarPassagem (MONITRIIP)",
    caminho: "/bilhetes/cancelamento",
    corpo: {
      idLog: "11",
      cnpjEmpresaTransporte: cnpj,
      numeroBilhete: bilhete2,
      identificacaoLinha: linha,
      dataViagemPassageiro: data,
      horaViagemPassageiro: hora,
      codigoMotivoCancelamento: "1",
      dataHoraCancelamento: agora(1),
      sequenciamento: "4",
      idViagem,
    },
  },
  {
    nome: "Log MONITRIIP que o terminal não usa (deve voltar ignorado)",
    corpo: { idLog: "4", cnpjEmpresaTransporte: cnpj, velocidadeAtual: "80" },
  },
];

let envios = [...(args.has("--so-monitriip") ? [] : simples), ...(args.has("--so-simples") ? [] : monitriip)];

async function enviar(nome: string, caminho: string, corpo: unknown) {
  const resp = await fetch(`${url!.replace(/\/$/, "")}${caminho}`, {
    method: "POST",
    headers: { "x-api-key": chave!, "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  const texto = await resp.text();
  console.log(`\n▶ ${nome}  [HTTP ${resp.status}]`);
  try {
    const r = JSON.parse(texto) as {
      erro?: string;
      resultados?: { indice: number; tipo: string; status: string; mensagem: string }[];
    };
    if (r.erro) console.log(`  erro: ${r.erro}`);
    for (const it of r.resultados ?? []) console.log(`  #${it.indice} ${it.tipo}: ${it.status} — ${it.mensagem}`);
  } catch {
    console.log(texto);
  }
}

console.log(`Endpoint: ${url}`);
console.log(`Empresa ${cnpj} · linha ${linha} · ${data} ${hora} (${sentido}) · bilhetes ${bilhete1}, ${bilhete2}`);

if (args.has("--lote")) {
  // Lote: todos os eventos numa requisição. Logs MONITRIIP vão com o idLog (sem caminho).
  envios = envios.map((e) => ({ ...e, caminho: undefined }));
  await enviar(`Lote com ${envios.length} eventos`, "", { eventos: envios.map((e) => e.corpo) });
} else {
  for (const e of envios) await enviar(e.nome, e.caminho ?? "", e.corpo);
}
