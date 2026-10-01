-- SisRodov Manhuaçu — dados públicos de referência.
-- Origem: Portal de Dados Abertos da ANTT (linhas interestaduais) e DER-MG (linhas intermunicipais).
-- Carga feita por scripts/importar-dados-publicos.ts; o app só lê.

create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  cnpj text not null unique,
  razao_social text not null,
  fonte text not null check (fonte in ('ANTT', 'DER-MG')),
  ativa boolean not null default true,
  atualizado_em timestamptz not null default now()
);

create table public.linhas (
  id uuid primary key default gen_random_uuid(),
  fonte text not null check (fonte in ('ANTT', 'DER-MG')),
  -- ANTT: prefixo SIGMA (11 caracteres). DER-MG: COD_LINHA.
  codigo text not null,
  numero text,
  descricao text not null,
  empresa_id uuid references public.empresas (id),
  origem text not null,
  uf_origem text not null,
  destino text not null,
  uf_destino text not null,
  ambito text not null check (ambito in ('interestadual', 'intermunicipal')),
  -- Como a linha usa Manhuaçu: ponta inicial, ponta final ou só passagem.
  relacao_manhuacu text not null check (relacao_manhuacu in ('origem', 'destino', 'passagem')),
  -- Outras cidades atendidas a partir de Manhuaçu (seções ANTT / itinerário DER-MG).
  cidades_atendidas text[] not null default '{}',
  ativa boolean not null default true,
  atualizado_em timestamptz not null default now(),
  unique (fonte, codigo)
);

create index linhas_empresa_idx on public.linhas (empresa_id);

create table public.horarios (
  id uuid primary key default gen_random_uuid(),
  linha_id uuid not null references public.linhas (id) on delete cascade,
  sentido text not null check (sentido in ('ida', 'volta')),
  -- Hora de partida no ponto inicial do sentido (é o que ANTT e DER-MG publicam).
  hora time not null,
  tipo_servico text not null default '',
  -- true quando o ponto inicial do sentido é Manhuaçu: a hora é a partida do terminal.
  parte_de_manhuacu boolean not null,
  -- Dias da semana, 0 = domingo … 6 = sábado.
  dias_semana smallint[] not null,
  feriado boolean,
  -- Meses de operação (1–12); vazio = o ano todo.
  meses smallint[] not null default '{}',
  competencia text not null,
  unique (linha_id, sentido, hora, tipo_servico)
);

create index horarios_linha_idx on public.horarios (linha_id);

-- Passagens interestaduais vendidas (MONITRIIP), agregadas pela ANTT por mês e rota.
create table public.passagens_mensais (
  id uuid primary key default gen_random_uuid(),
  mes_emissao date not null,
  mes_viagem date not null,
  origem text not null,
  uf_origem text not null,
  destino text not null,
  uf_destino text not null,
  tipo_servico text not null,
  tipo_gratuidade text not null,
  valor_medio numeric(12, 2) not null,
  valor_desvio numeric(12, 2) not null,
  quantidade integer not null,
  unique (mes_emissao, mes_viagem, origem, uf_origem, destino, uf_destino, tipo_servico, tipo_gratuidade)
);

create index passagens_mensais_mes_idx on public.passagens_mensais (mes_emissao);

create table public.importacoes (
  id uuid primary key default gen_random_uuid(),
  fonte text not null,
  recurso text not null,
  competencia text not null,
  registros integer not null,
  executado_em timestamptz not null default now()
);

-- Dados públicos: leitura liberada; escrita só pela service_role (script de importação).
alter table public.empresas enable row level security;
alter table public.linhas enable row level security;
alter table public.horarios enable row level security;
alter table public.passagens_mensais enable row level security;
alter table public.importacoes enable row level security;

create policy "leitura publica" on public.empresas for select using (true);
create policy "leitura publica" on public.linhas for select using (true);
create policy "leitura publica" on public.horarios for select using (true);
create policy "leitura publica" on public.passagens_mensais for select using (true);
create policy "leitura publica" on public.importacoes for select using (true);
