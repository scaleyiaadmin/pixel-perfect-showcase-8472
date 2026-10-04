-- SisRodov Manhuaçu — operação do terminal: geração das viagens do dia a partir da
-- grade pública, marcação de atrasos, agregados de embarque e agendamentos (pg_cron).
-- Fuso do terminal: America/Sao_Paulo.

-- ---------------------------------------------------------------------------
-- viagens.atualizado_em acompanha qualquer alteração
-- ---------------------------------------------------------------------------
create or replace function public.tocar_atualizado_em() returns trigger
language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists viagens_atualizado_em on public.viagens;
create trigger viagens_atualizado_em before update on public.viagens
for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------------
-- Gera as viagens de uma data a partir dos horários publicados (ANTT/DER-MG).
-- partida  : o sentido começa em Manhuaçu → previsto_em = data + hora (Brasília).
-- chegada  : o sentido termina em Manhuaçu → previsto_em nulo.
-- passagem : Manhuaçu é ponto intermediário → previsto_em nulo.
-- A fonte pública só informa a hora na ponta inicial; o horário no terminal das
-- chegadas/passagens vem pela integração ou é lançado pela equipe.
-- Idempotente: (horario_id, data) é único.
-- ---------------------------------------------------------------------------
create or replace function public.gerar_viagens(p_data date) returns integer
language plpgsql security definer set search_path = public as $$
declare
  inseridas integer;
begin
  -- Chamado pelo app (usuário logado) só por quem opera o terminal; o cron chama sem usuário.
  if auth.uid() is not null and not tem_papel('administrador', 'gestor', 'operacional') then
    raise exception 'Sem permissão para gerar viagens.' using errcode = '42501';
  end if;

  with base as (
    select
      h.id as horario_id,
      l.id as linha_id,
      l.empresa_id,
      coalesce(nullif(l.numero, ''), l.codigo) as numero,
      h.parte_de_manhuacu,
      h.hora,
      -- Pontas do sentido: ida vai de origem → destino; volta, o contrário.
      case when h.sentido = 'ida' then l.origem else l.destino end as ponta_inicial,
      case when h.sentido = 'ida' then l.destino else l.origem end as ponta_final
    from horarios h
    join linhas l on l.id = h.linha_id
    where l.ativa
      and extract(dow from p_data)::smallint = any (h.dias_semana)
      and (cardinality(h.meses) = 0 or extract(month from p_data)::smallint = any (h.meses))
  )
  insert into viagens (data, horario_id, linha_id, empresa_id, numero, tipo, origem, destino, previsto_em)
  select
    p_data,
    b.horario_id,
    b.linha_id,
    b.empresa_id,
    b.numero,
    case
      when b.parte_de_manhuacu then 'partida'
      when b.ponta_final = 'Manhuaçu' then 'chegada'
      else 'passagem'
    end,
    case when b.parte_de_manhuacu then 'Manhuaçu' else b.ponta_inicial end,
    b.ponta_final,
    case when b.parte_de_manhuacu then (p_data + b.hora) at time zone 'America/Sao_Paulo' end
  from base b
  on conflict (horario_id, data) do nothing;

  get diagnostics inseridas = row_count;
  return inseridas;
end;
$$;

revoke all on function public.gerar_viagens(date) from public, anon;
grant execute on function public.gerar_viagens(date) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Marca como atrasada a viagem prevista cujo horário + tolerância já passou.
-- ---------------------------------------------------------------------------
create or replace function public.atualizar_atrasos() returns integer
language plpgsql security definer set search_path = public as $$
declare
  tolerancia integer;
  marcadas integer;
begin
  select coalesce((valor #>> '{}')::integer, 10) into tolerancia
  from configuracoes where chave = 'tolerancia_atraso_min';
  tolerancia := coalesce(tolerancia, 10);

  update viagens
  set status = 'atrasada'
  where status = 'prevista'
    and previsto_em is not null
    and previsto_em + make_interval(mins => tolerancia) < now();

  get diagnostics marcadas = row_count;
  return marcadas;
end;
$$;

revoke all on function public.atualizar_atrasos() from public, anon, authenticated;
grant execute on function public.atualizar_atrasos() to service_role;

-- ---------------------------------------------------------------------------
-- Agregados de embarque (catraca). security_invoker: respeitam o RLS de eventos_embarque.
-- Acesso conta só quando confirmado (mesmo critério da conciliação e do fechamento da taxa):
-- evento "pendente" ainda não foi ligado a uma viagem.
-- ---------------------------------------------------------------------------
create or replace view public.embarques_por_viagem with (security_invoker = true) as
select
  v.id as viagem_id,
  v.data,
  count(e.id) filter (where e.evento = 'acesso' and e.status = 'confirmado')::integer as acessos,
  count(e.id) filter (where e.evento = 'reentrada')::integer as reentradas,
  count(e.id) filter (where e.evento = 'negado')::integer as negados,
  max(e.ocorrido_em) as ultimo_evento_em
from public.viagens v
join public.eventos_embarque e on e.viagem_id = v.id
group by v.id, v.data;

create or replace view public.embarques_por_dia with (security_invoker = true) as
select
  (e.ocorrido_em at time zone 'America/Sao_Paulo')::date as dia,
  count(*) filter (where e.evento = 'acesso' and e.status = 'confirmado')::integer as acessos,
  count(*) filter (where e.evento = 'reentrada')::integer as reentradas,
  count(*) filter (where e.evento = 'negado')::integer as negados
from public.eventos_embarque e
group by 1;

grant select on public.embarques_por_viagem, public.embarques_por_dia to authenticated;

-- ---------------------------------------------------------------------------
-- Agendamentos (pg_cron roda em UTC; Brasília = UTC-3, sem horário de verão)
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'gerar-viagens-diario') then
    perform cron.unschedule('gerar-viagens-diario');
  end if;
  if exists (select 1 from cron.job where jobname = 'atualizar-atrasos') then
    perform cron.unschedule('atualizar-atrasos');
  end if;
end;
$$;

-- 00:05 de Brasília: gera as viagens de hoje e de amanhã.
select cron.schedule(
  'gerar-viagens-diario',
  '5 3 * * *',
  $$
    select public.gerar_viagens((now() at time zone 'America/Sao_Paulo')::date);
    select public.gerar_viagens((now() at time zone 'America/Sao_Paulo')::date + 1);
  $$
);

-- A cada 5 minutos: viagens previstas que passaram da tolerância viram atrasadas.
select cron.schedule('atualizar-atrasos', '*/5 * * * *', $$select public.atualizar_atrasos()$$);

-- Primeira carga: viagens de hoje e amanhã já ficam disponíveis ao aplicar.
select public.gerar_viagens((now() at time zone 'America/Sao_Paulo')::date);
select public.gerar_viagens((now() at time zone 'America/Sao_Paulo')::date + 1);
