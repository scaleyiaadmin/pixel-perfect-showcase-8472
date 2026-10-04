# Função `ingestao` — recebimento automático de dados

Endpoint que recebe dados de sistemas externos e grava nas tabelas de gestão do terminal
(`bilhetes`, `eventos_embarque`, `viagens`, `relatos_empresa`, `pagamentos`). Cada evento
recebido fica registrado em `eventos_integracao`, visível na tela **Integrações → Eventos
recebidos**.

```
POST https://mxlqwbpetfyejggeetmm.supabase.co/functions/v1/ingestao
x-api-key: srv_…            (ou Authorization: Bearer srv_…)
Content-Type: application/json
```

## Deploy (feito centralmente)

1. Aplicar a migration `supabase/migrations/20261004120400_integracoes.sql`
   (cria `criar_integracao`, `revogar_integracao` e os índices usados aqui).
2. Publicar a função **sem verificação de JWT** — a autenticação é pela chave da integração:

   ```bash
   supabase functions deploy ingestao --no-verify-jwt --project-ref mxlqwbpetfyejggeetmm
   ```

   ou, em `supabase/config.toml`:

   ```toml
   [functions.ingestao]
   verify_jwt = false
   ```

3. `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já existem no ambiente das Edge Functions;
   não é preciso configurar segredo extra.

## Chaves

- Criadas na tela **Integrações → Nova integração** (rpc `criar_integracao`, só
  administrador/gestor). A chave (`srv_` + 40 hex) aparece **uma vez**; o banco guarda só o
  SHA-256 e os 12 primeiros caracteres para identificação.
- Revogar desativa na hora (rpc `revogar_integracao`). A função nunca grava a chave em log.

| Tipo de integração | Pode enviar |
|---|---|
| `empresa` | venda-passagem, cancelamento-passagem, embarque, inicio-fim-viagem, relato-viagem — **só da própria empresa** (CNPJ diferente é rejeitado) |
| `outro` | os mesmos, para qualquer empresa cadastrada (identificada pelo CNPJ) |
| `catraca` | embarque |
| `pagamento` | pagamento |

## Formato do corpo

- Um evento: `{ "tipo": "...", "dados": { ... } }`
- Lote: `{ "eventos": [ { "tipo": "...", "dados": { ... } }, ... ] }` ou uma lista JSON.
  Máximo **500 eventos** e 5 MB por requisição. Os itens são processados na ordem enviada.
- **Log MONITRIIP sem alteração**: o mesmo JSON enviado à ANTT. O tipo é reconhecido pelo
  `idLog` (0 venda, 11 cancelamento, 9 bilhete de embarque, 10 leitor RFID, 7 início/fim de
  viagem regular) ou pelo caminho, trocando só a URL base:
  - `…/ingestao/bilhetes/venda`
  - `…/ingestao/bilhetes/cancelamento`
  - `…/ingestao/bilhetes/embarque`
  - `…/ingestao/cartoes/leitura-rfid`
  - `…/ingestao/viagens/regular/inicio-fim`

  Os demais logs MONITRIIP (velocidade, jornada, ocorrências…) são aceitos e marcados como
  `ignorado`.

Datas/horas: `AAAA-MM-DDThh:mm:ss-03:00` (sem fuso, assume America/Sao_Paulo). A **hora da
viagem** é a hora programada no ponto inicial da linha — a mesma do MONITRIIP e do quadro de
horários ANTT/DER-MG. A **linha** é o prefixo ANTT (11 caracteres, `linhas.codigo`) ou o
código DER-MG.

### Resposta

```json
{
  "integracao": "Vendas Viação X",
  "recebidos": 2, "processados": 1, "ignorados": 1, "erros": 0,
  "resultados": [
    { "indice": 0, "tipo": "venda-passagem", "status": "processado", "mensagem": "Bilhete 123456 registrado." },
    { "indice": 1, "tipo": "venda-passagem", "status": "ignorado", "mensagem": "Bilhete não embarca nem desembarca em Manhuaçu." }
  ]
}
```

HTTP 200 sempre que a chave e o JSON são válidos (o resultado de cada item vem na lista);
401 chave inválida/revogada; 400 JSON inválido; 413 lote grande demais.

## Tipos de evento

Nomes de campo aceitos: formato do terminal (português) **ou** MONITRIIP.

### `venda-passagem`

| Terminal | MONITRIIP | Observação |
|---|---|---|
| `bilhete` | `numeroBilhete` | obrigatório; chave do bilhete junto com a empresa |
| `empresa_cnpj` | `cnpjEmpresaTransporte` | opcional na integração `empresa` |
| `linha`, `data`, `hora`, `sentido` | `identificacaoLinha`, `dataViagemPassageiro`, `horaViagemPassageiro`, `idViagem` | vínculo com a viagem |
| `origem`, `destino` | `codigoMunicipioEmbarquePassageiro`, `codigoMunicipioDesembarquePassageiro` (IBGE) | nome obtido na API do IBGE |
| `valor` | `valorTotal` | |
| `gratuidade` | `codigoIdentificadorBilhete` (1 gratuidade, 2 desconto) | |
| `emitido_em` | `dataHoraEmissaoBilhete` | |

Bilhete sem embarque nem desembarque em Manhuaçu (IBGE 3139409) é `ignorado`. Reenvio
atualiza o bilhete sem desfazer um cancelamento ou embarque já registrado.

### `cancelamento-passagem`

`bilhete`/`numeroBilhete`, `empresa_cnpj`, `cancelado_em`/`dataHoraCancelamento`
(`numeroNovoBilhete` opcional). Se a venda ainda não chegou e a linha passa por Manhuaçu, o
bilhete é guardado já cancelado.

### `embarque`

- Catraca (formato do terminal): `bilhete`, `evento` (`acesso` | `reentrada` | `negado`),
  `dispositivo`, `ocorrido_em`, opcionais `empresa_cnpj`, `linha`, `data`, `hora`, `sentido`.
- MONITRIIP `InserirLogBilheteEmbarque`: `codigoEmbarque` 1 = check-in (registra acesso e marca
  o bilhete como utilizado), 0 = no-show (bilhete não utilizado). Só conta se
  `codigoMunicipioEmbarquePassageiro` for Manhuaçu.
- MONITRIIP `InserirLogLeitorCartaoRFID`: registra acesso com o cartão `RFID <numeroCartao>`.

A viagem vem do bilhete; sem bilhete conhecido, da linha/data/hora. Sem nenhum vínculo, a
leitura fica `pendente` para conferência. Mesmo evento reenviado não duplica.

### `inicio-fim-viagem`

- Terminal: `evento` (`chegada` | `partida` | `cancelada`), `ocorrido_em`, `empresa_cnpj`,
  `linha`, `data`, `hora`, `sentido`, opcionais `veiculo`, `plataforma` (número cadastrado).
- MONITRIIP `InserirLogInicioFimViagemRegular`: `tipoRegistroViagem` 1/3 = início, 0/2 = fim.
  Conta como **partida** quando a linha começa em Manhuaçu no sentido informado, como
  **chegada** quando termina aqui, ou quando `latitude`/`longitude` estão a até 5 km do
  terminal. Fora disso, `ignorado`.

Atualiza `chegou_em` / `partiu_em` / `status` / `veiculo` da viagem.

### `relato-viagem`

`empresa_cnpj`, `linha`, `data`, `hora`, `sentido`, `passageiros` (inteiro ≥ 0). Substitui o
relato anterior da mesma viagem.

### `pagamento` (só integração `pagamento`)

`referencia` (id do pagamento no sistema de origem, obrigatório), `valor`, `pago_em`, `meio`,
`status` (`confirmado` | `processando` | `estornado`), e `taxa_numero` e/ou `empresa_cnpj`.
Reenviar a mesma referência atualiza o pagamento. Com taxa informada, a taxa vira `pago`
quando a soma dos pagamentos confirmados cobre o valor (e volta a `pendente` se um estorno
deixar de cobrir) — regra do trigger `pagamentos_atualizar_taxa` da migration do financeiro.

## Vínculo com a viagem

1. Linha pelo código; horário publicado da linha com a hora mais próxima (até 30 min, no
   mesmo sentido) → viagem desse horário na data.
2. Senão, viagem da mesma linha/empresa na data com hora mais próxima (até 2 h).
3. Senão, a viagem é criada (`status = prevista`, vinculada ao horário publicado quando ele
   foi encontrado — assim não duplica com a viagem gerada a partir do quadro de horários).

A data é a data programada da viagem (no fuso America/Sao_Paulo). Eventos sem data usam a data
local do `ocorrido_em`.

## Dados pessoais

Nome, CPF, documento, data de nascimento e celular do passageiro e CPF do motorista são
descartados antes de gravar o payload em `eventos_integracao` — o terminal não precisa deles.

## Homologação

```bash
INGESTAO_URL=https://<projeto-de-homologacao>.supabase.co/functions/v1/ingestao \
INGESTAO_CHAVE=srv_... SIM_CNPJ=<cnpj da empresa> SIM_LINHA=<prefixo> SIM_HORA=08:30:00 \
bun scripts/simular-integracao.ts            # um evento por requisição
bun scripts/simular-integracao.ts --lote     # tudo num lote
```

Contra o projeto de produção o script recusa rodar sem `--confirmar-producao`.

Teste local da função: `supabase functions serve ingestao --no-verify-jwt`.
