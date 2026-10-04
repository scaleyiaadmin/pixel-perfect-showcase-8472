-- SisRodov Manhuaçu — financeiro, conciliação e jobs automáticos.
-- Depende de 20261004120000_gestao_base.sql.
--
-- Regras:
--   * Conciliação: por viagem que já partiu/realizou, compara bilhetes válidos, acessos
--     confirmados na catraca e passageiros relatados pela empresa.
--   * Taxa da competência (AAAA-MM): acessos confirmados na catraca das viagens da empresa
--     no mês (data da viagem, fuso America/Sao_Paulo) × configuracoes.taxa_embarque.
--   * Pagamentos confirmados que cobrem o valor marcam a taxa como paga (trigger).
--   * Taxas pendentes vencidas viram inadimplentes (job diário).

-- ---------------------------------------------------------------------------
-- Conciliação por viagem
-- ---------------------------------------------------------------------------
create or replace view public.conciliacao_viagens
with (security_invoker = true) as
with tol as (
  select coalesce(
    (select (valor #>> '{}')::integer from public.configuracoes where chave = 'tolerancia_conciliacao'),
    0
  ) as tolerancia
),
base as (
  select
    v.id as viagem_id,
    v.data,
    v.numero,
    v.tipo,
    v.origem,
    v.destino,
    v.previsto_em,
    v.partiu_em,
    v.status as status_viagem,
    v.empresa_id,
    (select count(*) from public.bilhetes b
      where b.viagem_id = v.id and b.status in ('emitida', 'utilizada'))::integer as bilhetes,
    (select count(*) from public.bilhetes b
      where b.viagem_id = v.id and b.status = 'cancelada')::integer as bilhetes_cancelados,
    (select count(*) from public.eventos_embarque e
      where e.viagem_id = v.id and e.evento = 'acesso' and e.status = 'confirmado')::integer as acessos,
    r.passageiros as relato,
    c.situacao,
    c.observacao,
    c.conferido_por,
    c.conferido_em
  from public.viagens v
  left join public.relatos_empresa r on r.viagem_id = v.id
  left join public.conciliacoes c on c.viagem_id = v.id
  where v.status in ('partiu', 'realizada')
)
select
  base.*,
  -- Maior diferença entre as fontes disponíveis (relato ausente não entra na conta).
  (greatest(bilhetes, acessos, relato) - least(bilhetes, acessos, relato))::integer as diferenca,
  case
    when greatest(bilhetes, acessos, relato) - least(bilhetes, acessos, relato) > tol.tolerancia
      then 'divergencia'
    -- Sem relato da empresa ou sem nenhum dado ainda: aguardando as fontes.
    when relato is null or (bilhetes = 0 and acessos = 0 and relato = 0) then 'analise'
    else 'conciliado'
  end as status,
  coalesce(situacao, 'em-analise') as situacao_conferencia
from base cross join tol;

comment on view public.conciliacao_viagens is
  'Bilhetes x catraca x relato da empresa por viagem já partida/realizada (respeita RLS).';

-- ---------------------------------------------------------------------------
-- Pagamentos: quem registrou
-- ---------------------------------------------------------------------------
alter table public.pagamentos alter column registrado_por set default auth.uid();

create index if not exists pagamentos_taxa_idx on public.pagamentos (taxa_id);
create index if not exists taxas_competencia_idx on public.taxas (competencia);

-- ---------------------------------------------------------------------------
-- Fechamento da competência → gera as taxas
-- ---------------------------------------------------------------------------
create or replace function public.fechar_competencia(p_competencia text)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_taxa numeric(12, 2);
  v_dia integer;
  v_inicio date;
  v_fim date;
  v_ultimo_dia integer;
  v_vencimento date;
  v_seq integer;
  v_geradas integer := 0;
  r record;
begin
  -- Sem usuário = chamada interna (pg_cron). Com usuário, só administrador/financeiro.
  if auth.uid() is not null and not tem_papel('administrador', 'financeiro') then
    raise exception 'Somente administrador ou financeiro podem fechar a competência.';
  end if;

  if p_competencia is null or p_competencia !~ '^\d{4}-(0[1-9]|1[0-2])$' then
    raise exception 'Competência inválida: informe no formato AAAA-MM (ex.: 2026-09).';
  end if;

  select (valor #>> '{}')::numeric into v_taxa from configuracoes where chave = 'taxa_embarque';
  if v_taxa is null or v_taxa <= 0 then
    raise exception 'Taxa por embarque não configurada. Defina o valor em Configurações antes de fechar a competência.';
  end if;

  select (valor #>> '{}')::integer into v_dia from configuracoes where chave = 'dia_vencimento_taxa';
  if v_dia is null or v_dia < 1 or v_dia > 31 then
    raise exception 'Dia de vencimento da taxa não configurado. Defina o dia (1 a 31) em Configurações antes de fechar a competência.';
  end if;

  v_inicio := to_date(p_competencia || '-01', 'YYYY-MM-DD');
  v_fim := (v_inicio + interval '1 month')::date;

  if v_fim > (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'A competência % ainda não terminou; o fechamento só pode ser feito a partir do primeiro dia do mês seguinte.', p_competencia;
  end if;

  -- Vencimento no mês seguinte; dia ajustado ao último dia do mês quando necessário.
  v_ultimo_dia := extract(day from (v_fim + interval '1 month' - interval '1 day'))::integer;
  v_vencimento := make_date(extract(year from v_fim)::integer, extract(month from v_fim)::integer,
                            least(v_dia, v_ultimo_dia));

  -- Evita dois fechamentos simultâneos gerando números repetidos.
  perform pg_advisory_xact_lock(hashtext('fechar_competencia'));

  select coalesce(max(substring(numero from '(\d+)$')::integer), 0) into v_seq
  from taxas where competencia = p_competencia;

  for r in
    select e.id as empresa_id,
           (select count(*)
              from eventos_embarque ev
              join viagens v on v.id = ev.viagem_id
             where v.empresa_id = e.id
               and v.data >= v_inicio and v.data < v_fim
               and ev.evento = 'acesso' and ev.status = 'confirmado')::integer as embarques
    from empresas e
    where e.opera_no_terminal
      and not exists (select 1 from taxas t where t.empresa_id = e.id and t.competencia = p_competencia)
    order by e.razao_social
  loop
    continue when r.embarques = 0;
    v_seq := v_seq + 1;
    insert into taxas (numero, empresa_id, competencia, embarques, valor_unitario, valor, vencimento, status)
    values (
      'TX-' || p_competencia || '-' || lpad(v_seq::text, 4, '0'),
      r.empresa_id, p_competencia, r.embarques, v_taxa, round(r.embarques * v_taxa, 2), v_vencimento,
      case when v_vencimento < (now() at time zone 'America/Sao_Paulo')::date then 'inadimplente' else 'pendente' end
    );
    v_geradas := v_geradas + 1;
  end loop;

  return v_geradas;
end;
$$;

revoke all on function public.fechar_competencia(text) from public, anon;
grant execute on function public.fechar_competencia(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Pagamento confirmado quita a taxa; estorno reabre
-- ---------------------------------------------------------------------------
create or replace function public.atualizar_situacao_taxa(p_taxa_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_valor numeric(12, 2);
  v_status text;
  v_vencimento date;
  v_pago numeric(12, 2);
begin
  if p_taxa_id is null then return; end if;
  select valor, status, vencimento into v_valor, v_status, v_vencimento from taxas where id = p_taxa_id;
  if not found or v_status = 'cancelada' then return; end if;

  select coalesce(sum(valor), 0) into v_pago
  from pagamentos where taxa_id = p_taxa_id and status = 'confirmado';

  if v_pago >= v_valor and v_status <> 'pago' then
    update taxas set status = 'pago' where id = p_taxa_id;
  elsif v_pago < v_valor and v_status = 'pago' then
    update taxas
       set status = case when v_vencimento < (now() at time zone 'America/Sao_Paulo')::date
                         then 'inadimplente' else 'pendente' end
     where id = p_taxa_id;
  end if;
end;
$$;

revoke all on function public.atualizar_situacao_taxa(uuid) from public, anon, authenticated;

create or replace function public.pagamentos_atualizar_taxa()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform atualizar_situacao_taxa(new.taxa_id);
  if tg_op = 'UPDATE' and old.taxa_id is distinct from new.taxa_id then
    perform atualizar_situacao_taxa(old.taxa_id);
  end if;
  return new;
end;
$$;

drop trigger if exists pagamentos_atualizar_taxa on public.pagamentos;
create trigger pagamentos_atualizar_taxa
after insert or update of status, valor, taxa_id on public.pagamentos
for each row execute function public.pagamentos_atualizar_taxa();

-- ---------------------------------------------------------------------------
-- Inadimplência
-- ---------------------------------------------------------------------------
create or replace function public.atualizar_inadimplencia()
returns integer
language plpgsql security definer set search_path = public as $$
declare v_qtd integer;
begin
  -- auth.uid() nulo = pg_cron / service_role.
  if auth.uid() is not null and not tem_papel('administrador', 'financeiro') then
    raise exception 'Sem permissão para atualizar a inadimplência.' using errcode = '42501';
  end if;
  update taxas set status = 'inadimplente'
   where status = 'pendente'
     and vencimento < (now() at time zone 'America/Sao_Paulo')::date;
  get diagnostics v_qtd = row_count;
  return v_qtd;
end;
$$;

revoke all on function public.atualizar_inadimplencia() from public, anon;
grant execute on function public.atualizar_inadimplencia() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Jobs (pg_cron roda em UTC; Brasília = UTC-3)
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron;

select cron.unschedule(jobid) from cron.job
 where jobname in ('financeiro-atualizar-inadimplencia', 'financeiro-fechar-competencia');

-- Todo dia às 06:00 de Brasília.
select cron.schedule(
  'financeiro-atualizar-inadimplencia',
  '0 9 * * *',
  $$select public.atualizar_inadimplencia()$$
);

-- Dia 1 às 06:30 de Brasília: fecha o mês anterior. Sem taxa/vencimento configurados,
-- a função levanta exceção e o job só registra a falha em cron.job_run_details.
select cron.schedule(
  'financeiro-fechar-competencia',
  '30 9 1 * *',
  $$select public.fechar_competencia(to_char((now() at time zone 'America/Sao_Paulo') - interval '1 month', 'YYYY-MM'))$$
);
