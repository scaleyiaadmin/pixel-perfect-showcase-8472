-- SisRodov Manhuaçu — integrações automáticas (empresas, catracas, pagamento).
-- A chave de cada integração é gerada aqui e mostrada uma única vez; o banco guarda só o
-- SHA-256. A Edge Function supabase/functions/ingestao valida a chave pelo hash.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Criar integração: devolve a chave em texto (única vez em que ela aparece).
-- ---------------------------------------------------------------------------
create or replace function public.criar_integracao(
  p_nome text,
  p_tipo text,
  p_empresa_id uuid default null,
  p_descricao text default ''
) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  chave text;
begin
  if not tem_papel('administrador', 'gestor') then
    raise exception 'Somente administrador ou gestor pode criar integrações.' using errcode = '42501';
  end if;
  if coalesce(trim(p_nome), '') = '' then
    raise exception 'Informe o nome da integração.';
  end if;
  if p_tipo not in ('empresa', 'catraca', 'pagamento', 'outro') then
    raise exception 'Tipo de integração inválido: %.', p_tipo;
  end if;
  if p_tipo = 'empresa' and p_empresa_id is null then
    raise exception 'Integração do tipo empresa precisa da empresa vinculada.';
  end if;
  if p_empresa_id is not null and not exists (select 1 from empresas where id = p_empresa_id) then
    raise exception 'Empresa não encontrada.';
  end if;

  -- 'srv_' + 40 caracteres hexadecimais (160 bits aleatórios).
  chave := 'srv_' || encode(extensions.gen_random_bytes(20), 'hex');

  insert into integracoes (nome, descricao, tipo, empresa_id, chave_hash, chave_prefixo)
  values (
    trim(p_nome),
    coalesce(p_descricao, ''),
    p_tipo,
    case when p_tipo in ('empresa', 'outro') then p_empresa_id end,
    encode(extensions.digest(chave, 'sha256'), 'hex'),
    left(chave, 12)
  );

  return chave;
end;
$$;

-- ---------------------------------------------------------------------------
-- Revogar: a chave deixa de ser aceita imediatamente.
-- ---------------------------------------------------------------------------
create or replace function public.revogar_integracao(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not tem_papel('administrador', 'gestor') then
    raise exception 'Somente administrador ou gestor pode revogar integrações.' using errcode = '42501';
  end if;
  update integracoes set ativa = false where id = p_id;
  if not found then
    raise exception 'Integração não encontrada.';
  end if;
end;
$$;

revoke all on function public.criar_integracao(text, text, uuid, text) from public, anon;
revoke all on function public.revogar_integracao(uuid) from public, anon;
grant execute on function public.criar_integracao(text, text, uuid, text) to authenticated;
grant execute on function public.revogar_integracao(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Índices usados pela função de ingestão
-- ---------------------------------------------------------------------------
-- Localizar a linha pelo prefixo ANTT / código DER-MG.
create index if not exists linhas_codigo_idx on public.linhas (codigo);
-- Vincular evento à viagem: empresa + data + linha.
create index if not exists viagens_linha_data_idx on public.viagens (linha_id, data);
-- Catraca sem CNPJ: localizar o bilhete só pelo código.
create index if not exists bilhetes_codigo_idx on public.bilhetes (codigo);
-- Log de eventos por integração / filtros da tela.
create index if not exists eventos_integracao_integracao_idx
  on public.eventos_integracao (integracao_id, recebido_em desc);
create index if not exists eventos_integracao_status_idx
  on public.eventos_integracao (status, recebido_em desc);

-- Reenvio do mesmo evento de catraca/embarque não duplica a leitura.
-- (Lançamentos manuais têm integracao_id nulo e nunca colidem.)
create unique index if not exists eventos_embarque_integracao_unq
  on public.eventos_embarque (integracao_id, bilhete_codigo, evento, ocorrido_em);

-- Reenvio do mesmo pagamento (mesma referência externa) atualiza em vez de duplicar.
create unique index if not exists pagamentos_integracao_ref_unq
  on public.pagamentos (integracao_id, referencia_externa);
