-- SisRodov Manhuaçu — acesso: último acesso, proteção do administrador e apoio à auditoria.

-- Marca o último acesso do usuário logado (chamado pelo app logo após o login).
-- Só conta para contas ativas: conta sem nenhum acesso = cadastro aguardando aprovação.
create function public.registrar_acesso() returns void
language sql security definer set search_path = public as $$
  update perfis set ultimo_acesso = now() where user_id = auth.uid() and ativo
$$;

revoke all on function public.registrar_acesso() from public, anon;
grant execute on function public.registrar_acesso() to authenticated;

-- Usuário de empresa precisa estar vinculado a uma empresa.
alter table public.perfis
  add constraint perfis_empresa_vinculada check (papel <> 'empresa' or empresa_id is not null);

-- O sistema nunca pode ficar sem um administrador ativo.
create function public.proteger_ultimo_administrador() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.papel = 'administrador' and old.ativo
     and (tg_op = 'DELETE' or new.papel <> 'administrador' or not new.ativo)
     and not exists (
       select 1 from perfis
       where papel = 'administrador' and ativo and user_id <> old.user_id
     ) then
    raise exception 'O sistema precisa de pelo menos um administrador ativo.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger proteger_ultimo_administrador before update or delete on public.perfis
for each row execute function public.proteger_ultimo_administrador();

-- Módulos que já aparecem na auditoria (para o filtro da tela). Respeita o RLS de quem consulta.
create function public.modulos_auditoria() returns setof text
language sql stable security invoker set search_path = public as $$
  select distinct modulo from auditoria order by 1
$$;

grant execute on function public.modulos_auditoria() to authenticated;
