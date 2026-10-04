-- SisRodov Manhuaçu — base da gestão do terminal.
-- Os dados operacionais chegam por integração (supabase/functions/ingestao) ou são
-- lançados pela equipe. Funções, views e jobs de cada módulo ficam em migrations próprias.

-- ---------------------------------------------------------------------------
-- Empresas: a tabela vem dos dados públicos; aqui ganha os campos de cadastro.
-- ---------------------------------------------------------------------------
alter table public.empresas
  add column nome_fantasia text,
  add column codigo_antt text,
  add column contato text,
  add column email text,
  add column telefone text,
  add column cor text,
  -- true quando a empresa usa o terminal e entra no faturamento das taxas.
  add column opera_no_terminal boolean not null default true;

-- ---------------------------------------------------------------------------
-- Acesso
-- ---------------------------------------------------------------------------
create table public.perfis (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  email text not null,
  papel text not null default 'consulta'
    check (papel in ('administrador', 'gestor', 'operacional', 'financeiro', 'auditor', 'consulta', 'empresa')),
  -- Só para papel = 'empresa': o usuário enxerga apenas os dados dessa empresa.
  empresa_id uuid references public.empresas (id),
  ativo boolean not null default false,
  ultimo_acesso timestamptz,
  criado_em timestamptz not null default now()
);

-- Papel do usuário logado (null se não tem perfil ativo).
create function public.papel_atual() returns text
language sql stable security definer set search_path = public as $$
  select papel from perfis where user_id = auth.uid() and ativo
$$;

create function public.empresa_atual() returns uuid
language sql stable security definer set search_path = public as $$
  select empresa_id from perfis where user_id = auth.uid() and ativo and papel = 'empresa'
$$;

-- Equipe do terminal (todos os papéis menos 'empresa').
create function public.e_equipe() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(papel_atual() in ('administrador', 'gestor', 'operacional', 'financeiro', 'auditor', 'consulta'), false)
$$;

create function public.tem_papel(variadic papeis text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(papel_atual() = any (papeis), false)
$$;

-- Novo usuário ganha perfil inativo; o primeiro de todos vira administrador ativo.
create function public.criar_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
declare primeiro boolean;
begin
  select not exists (select 1 from perfis) into primeiro;
  insert into perfis (user_id, email, nome, papel, ativo)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    case when primeiro then 'administrador' else 'consulta' end,
    primeiro
  );
  return new;
end;
$$;

create trigger criar_perfil after insert on auth.users
for each row execute function public.criar_perfil();

-- ---------------------------------------------------------------------------
-- Configurações do terminal (chave → valor)
-- ---------------------------------------------------------------------------
create table public.configuracoes (
  chave text primary key,
  valor jsonb not null,
  descricao text not null default '',
  atualizado_em timestamptz not null default now()
);

-- Valores nulos = ainda não configurado pela administração; as telas pedem para preencher.
insert into public.configuracoes (chave, valor, descricao) values
  ('taxa_embarque', 'null', 'Valor cobrado da empresa por passageiro embarcado (R$).'),
  ('dia_vencimento_taxa', 'null', 'Dia do mês seguinte em que vence a taxa da competência.'),
  ('tolerancia_atraso_min', '10', 'Minutos após o previsto para a viagem ser marcada como atrasada.'),
  ('tolerancia_conciliacao', '0', 'Diferença máxima de passageiros entre fontes para considerar conciliado.'),
  ('nome_terminal', '"Terminal Rodoviário de Manhuaçu"', 'Nome exibido em relatórios e painéis.');

-- ---------------------------------------------------------------------------
-- Operação
-- ---------------------------------------------------------------------------
create table public.plataformas (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  em_manutencao boolean not null default false,
  observacao text not null default '',
  ativa boolean not null default true
);

-- Uma viagem = um ônibus passando pelo terminal num dia.
create table public.viagens (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  -- Horário publicado que originou a viagem (null quando lançada manualmente/integração sem horário).
  horario_id uuid references public.horarios (id),
  linha_id uuid references public.linhas (id),
  empresa_id uuid references public.empresas (id),
  numero text not null default '',
  -- partida: sai de Manhuaçu · chegada: termina em Manhuaçu · passagem: para e segue.
  tipo text not null check (tipo in ('partida', 'chegada', 'passagem')),
  origem text not null,
  destino text not null,
  -- Previsto no terminal. Nulo quando a fonte pública só informa o horário na origem.
  previsto_em timestamptz,
  chegou_em timestamptz,
  partiu_em timestamptz,
  plataforma_id uuid references public.plataformas (id),
  veiculo text not null default '',
  status text not null default 'prevista'
    check (status in ('prevista', 'embarque', 'ultima-chamada', 'partiu', 'realizada', 'atrasada', 'cancelada')),
  observacao text not null default '',
  atualizado_em timestamptz not null default now(),
  unique (horario_id, data)
);

create index viagens_data_idx on public.viagens (data);
create index viagens_empresa_data_idx on public.viagens (empresa_id, data);

create table public.bilhetes (
  id uuid primary key default gen_random_uuid(),
  -- Código do bilhete/BP-e na empresa emissora.
  codigo text not null,
  empresa_id uuid references public.empresas (id),
  viagem_id uuid references public.viagens (id),
  origem text not null default '',
  destino text not null default '',
  valor numeric(12, 2),
  gratuidade text not null default '',
  status text not null default 'emitida'
    check (status in ('emitida', 'utilizada', 'cancelada', 'nao-utilizada')),
  emitido_em timestamptz not null default now(),
  cancelado_em timestamptz,
  integracao_id uuid,
  unique (empresa_id, codigo)
);

create index bilhetes_viagem_idx on public.bilhetes (viagem_id);

-- Leituras de catraca / validador no acesso às plataformas.
create table public.eventos_embarque (
  id uuid primary key default gen_random_uuid(),
  ocorrido_em timestamptz not null default now(),
  dispositivo text not null default '',
  viagem_id uuid references public.viagens (id),
  bilhete_codigo text not null default '',
  evento text not null check (evento in ('acesso', 'reentrada', 'negado')),
  status text not null default 'confirmado' check (status in ('confirmado', 'pendente', 'rejeitado')),
  integracao_id uuid
);

create index eventos_embarque_viagem_idx on public.eventos_embarque (viagem_id);
create index eventos_embarque_ocorrido_idx on public.eventos_embarque (ocorrido_em);

-- Quantidade de passageiros declarada pela empresa para a viagem.
create table public.relatos_empresa (
  viagem_id uuid primary key references public.viagens (id) on delete cascade,
  empresa_id uuid references public.empresas (id),
  passageiros integer not null check (passageiros >= 0),
  enviado_em timestamptz not null default now(),
  integracao_id uuid
);

-- Conferência de uma viagem: bilhetes x catraca x relato da empresa.
create table public.conciliacoes (
  viagem_id uuid primary key references public.viagens (id) on delete cascade,
  situacao text not null default 'em-analise'
    check (situacao in ('em-analise', 'conferido', 'necessita-conferencia')),
  observacao text not null default '',
  conferido_por uuid references auth.users (id),
  conferido_em timestamptz
);

-- ---------------------------------------------------------------------------
-- Financeiro
-- ---------------------------------------------------------------------------
create table public.taxas (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  empresa_id uuid not null references public.empresas (id),
  competencia text not null check (competencia ~ '^\d{4}-\d{2}$'),
  embarques integer not null default 0,
  valor_unitario numeric(12, 2) not null,
  valor numeric(12, 2) not null,
  vencimento date not null,
  status text not null default 'pendente' check (status in ('pago', 'pendente', 'inadimplente', 'cancelada')),
  criado_em timestamptz not null default now(),
  unique (empresa_id, competencia)
);

create table public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  taxa_id uuid references public.taxas (id),
  empresa_id uuid not null references public.empresas (id),
  valor numeric(12, 2) not null check (valor > 0),
  pago_em timestamptz not null default now(),
  meio text not null default '',
  referencia_externa text not null default '',
  status text not null default 'confirmado' check (status in ('confirmado', 'processando', 'estornado')),
  integracao_id uuid,
  registrado_por uuid references auth.users (id),
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Integrações e auditoria
-- ---------------------------------------------------------------------------
create table public.integracoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text not null default '',
  -- empresa: sistema de venda/MONITRIIP da empresa · catraca · pagamento · outro
  tipo text not null check (tipo in ('empresa', 'catraca', 'pagamento', 'outro')),
  empresa_id uuid references public.empresas (id),
  -- Só o hash SHA-256 da chave fica guardado; a chave aparece uma vez ao ser criada.
  chave_hash text not null unique,
  chave_prefixo text not null,
  ativa boolean not null default true,
  ultimo_evento_em timestamptz,
  criado_em timestamptz not null default now()
);

create table public.eventos_integracao (
  id uuid primary key default gen_random_uuid(),
  integracao_id uuid references public.integracoes (id) on delete set null,
  recebido_em timestamptz not null default now(),
  tipo text not null,
  payload jsonb not null,
  status text not null check (status in ('processado', 'erro', 'ignorado')),
  erro text
);

create index eventos_integracao_recebido_idx on public.eventos_integracao (recebido_em desc);

alter table public.bilhetes add foreign key (integracao_id) references public.integracoes (id) on delete set null;
alter table public.eventos_embarque add foreign key (integracao_id) references public.integracoes (id) on delete set null;
alter table public.relatos_empresa add foreign key (integracao_id) references public.integracoes (id) on delete set null;
alter table public.pagamentos add foreign key (integracao_id) references public.integracoes (id) on delete set null;

create table public.auditoria (
  id uuid primary key default gen_random_uuid(),
  ocorrido_em timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  usuario text not null default '',
  acao text not null,
  modulo text not null,
  descricao text not null default ''
);

create index auditoria_ocorrido_idx on public.auditoria (ocorrido_em desc);

-- Registra uma ação do usuário logado (chamado pelo app via rpc).
create function public.registrar_auditoria(p_acao text, p_modulo text, p_descricao text default '')
returns void language sql security definer set search_path = public as $$
  insert into auditoria (user_id, usuario, acao, modulo, descricao)
  select auth.uid(), coalesce((select nullif(nome, '') from perfis where user_id = auth.uid()),
                              (select email from perfis where user_id = auth.uid()), ''),
         p_acao, p_modulo, p_descricao
  where e_equipe() or empresa_atual() is not null
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.perfis enable row level security;
alter table public.configuracoes enable row level security;
alter table public.plataformas enable row level security;
alter table public.viagens enable row level security;
alter table public.bilhetes enable row level security;
alter table public.eventos_embarque enable row level security;
alter table public.relatos_empresa enable row level security;
alter table public.conciliacoes enable row level security;
alter table public.taxas enable row level security;
alter table public.pagamentos enable row level security;
alter table public.integracoes enable row level security;
alter table public.eventos_integracao enable row level security;
alter table public.auditoria enable row level security;

-- Empresas: leitura pública continua; cadastro só administração.
create policy "cadastro pela administracao" on public.empresas for update
  using (tem_papel('administrador', 'gestor')) with check (tem_papel('administrador', 'gestor'));

-- Perfis: cada um vê o seu; administração vê e edita todos.
create policy "ver o proprio perfil" on public.perfis for select using (user_id = auth.uid() or tem_papel('administrador'));
create policy "administrar perfis" on public.perfis for update
  using (tem_papel('administrador')) with check (tem_papel('administrador'));

create policy "equipe le configuracoes" on public.configuracoes for select using (e_equipe());
create policy "administracao altera configuracoes" on public.configuracoes for update
  using (tem_papel('administrador', 'gestor')) with check (tem_papel('administrador', 'gestor'));

-- Painel público e "Minha viagem" leem plataformas e viagens sem login.
create policy "leitura publica" on public.plataformas for select using (true);
create policy "operacao gerencia plataformas" on public.plataformas for all
  using (tem_papel('administrador', 'gestor', 'operacional'))
  with check (tem_papel('administrador', 'gestor', 'operacional'));

create policy "leitura publica" on public.viagens for select using (true);
create policy "operacao gerencia viagens" on public.viagens for all
  using (tem_papel('administrador', 'gestor', 'operacional'))
  with check (tem_papel('administrador', 'gestor', 'operacional'));

create policy "equipe ou propria empresa" on public.bilhetes for select
  using (e_equipe() or empresa_id = empresa_atual());
create policy "equipe ou propria empresa" on public.eventos_embarque for select
  using (e_equipe() or viagem_id in (select id from viagens where empresa_id = empresa_atual()));
create policy "equipe ou propria empresa" on public.relatos_empresa for select
  using (e_equipe() or empresa_id = empresa_atual());

create policy "equipe le conciliacoes" on public.conciliacoes for select using (e_equipe());
create policy "conferencia" on public.conciliacoes for all
  using (tem_papel('administrador', 'gestor', 'auditor', 'financeiro'))
  with check (tem_papel('administrador', 'gestor', 'auditor', 'financeiro'));

create policy "equipe ou propria empresa" on public.taxas for select
  using (e_equipe() or empresa_id = empresa_atual());
create policy "financeiro gerencia taxas" on public.taxas for all
  using (tem_papel('administrador', 'financeiro')) with check (tem_papel('administrador', 'financeiro'));

create policy "equipe ou propria empresa" on public.pagamentos for select
  using (e_equipe() or empresa_id = empresa_atual());
create policy "financeiro registra pagamentos" on public.pagamentos for all
  using (tem_papel('administrador', 'financeiro')) with check (tem_papel('administrador', 'financeiro'));

create policy "administracao gerencia integracoes" on public.integracoes for all
  using (tem_papel('administrador', 'gestor')) with check (tem_papel('administrador', 'gestor'));
create policy "administracao le eventos" on public.eventos_integracao for select
  using (tem_papel('administrador', 'gestor', 'auditor'));

create policy "auditoria para administracao" on public.auditoria for select
  using (tem_papel('administrador', 'gestor', 'auditor'));
