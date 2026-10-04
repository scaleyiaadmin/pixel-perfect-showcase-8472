# Auditoria visual — SisRodov (2026-10-04)

Direção aprovada: **institucional moderno** — limpo, sóbrio, azul da prefeitura, muito respiro, tipografia forte, identidade de rodoviária municipal. Nada de gradientes roxos, ornamentos ou animações chamativas. Mobile-first (390px), tablet (1024px) e desktop (1440px). Painel de TV legível à distância.

## A) Problemas globais

- **A1 Fontes não carregam.** styles.css declara Barlow / Archivo / Barlow Condensed / JetBrains Mono, mas `src/routes/__root.tsx` só linka o appCss. Tudo cai em system-ui; o painel (feito para Barlow Condensed) encavala colunas. Metadados ainda dizem "Lovable App".
- **A2 Abas quebram fora da pílula no celular** (/integracoes, /configuracoes, /empresas/$id): `ui/tabs.tsx` TabsList `inline-flex h-9` + `flex-wrap` nas páginas (configuracoes.tsx:81, empresas.$companyId.tsx:231, integracoes.tsx:149). Correção: rolagem horizontal (`w-full justify-start overflow-x-auto`, triggers `shrink-0`), sem flex-wrap.
- **A3 Overflow horizontal no celular por filtros de data** (/passagens, /conciliacao; /relatorios "até" sozinho): grupo `flex items-center gap-2` sem wrap e inputs `w-[10rem]`. Criar `DateRangeFilter` em common.
- **A4 Selects com larguras fixas diferentes** (w-[10rem]…w-60): "Todas as competênci…" (taxas.tsx:599), placeholder de busca cortado (viagens, embarques), "escadinha" no celular. Padronizar via FilterBar: `w-full sm:w-auto sm:min-w-[12rem]`; placeholders curtos.
- **A5 EmptyState encosta nas bordas**: sem padding horizontal nem max-w; com `bodyClassName="p-0"` o texto cola. `px-6`, `max-w-md` no texto, prop `action` opcional.
- **A6 Tabelas no celular/tablet escondem Status e Ações**: DataTable `min-w-[42rem]` + overflow sem indicação. Modo cards abaixo de md (destaque + badge de status + resto em 2 linhas + ações visíveis); `hideOnMobile` por coluna; thead sticky.
- **A7 KPIs 1 por linha no celular**: grids `sm:grid-cols-2 xl:grid-cols-4`. Usar `grid-cols-2` e StatCard compacto no celular.
- **A8 Três estilos de KPI / filtro / título**: StatCard com ícone, sem ícone, mini-cards coloridos (`grid-cols-3` fixo corta "Atrasadas/canceladas", "Divergências"). Um só StatCard (com variante tom). Todos os filtros via FilterBar. Títulos simples (sem "Financeiro · Taxas"; breadcrumb pequeno acima se preciso). Traço vazio padronizado `text-muted-foreground`.
- **A9 Logos repetidos**: banner do dashboard (dashboard.tsx:288–289) + Prefeitura no header + SisRodov na sidebar; painel com logo + título + selo da prefeitura em quadro branco; /minha-viagem com 3 marcas.
- **A10 Header do celular sem identidade**: só ☰, sino, avatar; GlobalSearch `hidden md:block`. Mostrar logo compacto/título + ícone de busca que abre sheet.
- **A11 Sidebar**: scrollbar claro no fundo escuro; "Integrações/Configurações" somem atrás do bloco do usuário em 745px; bloco do usuário pesado (botão Sair grande + "PERFIL: ADMINISTRADOR" — sair já existe no dropdown). Drawer do celular: X colado ao avatar; pôr X dentro do drawer.
- **A12 PageHeader**: `md:items-end` desalinha botões quando o subtítulo quebra; em 1024 botões empilham. `md:items-start`, ações `shrink-0`, subtítulo `max-w-2xl`, `lg:flex-row` com 2+ ações.
- **A13 Células quebrando**: CNPJ (empresas.index.tsx:126) → nowrap; cabeçalhos longos ("VIAGENS REGISTRADAS HOJE") → curtos; destino quebrando → min-w; "Passa por Manhuaçu" → badge curto. Empresas em CAIXA ALTA crua → title-case na exibição.

## B) Por tela

- **/dashboard**: remover banner de logos; mini-cards "Situação das viagens" (`grid grid-cols-3` dashboard.tsx:422) cortam; gráfico "Principais destinos" com eixo X encavalado (`interval={0} angle={-12}` dashboard.tsx:591) → barras horizontais; card de embarques vazio enorme; coluna Empresa mostra "Intermunicipal" (tipo, não empresa) → "—"/"Não informada" cinza; Plataforma centralizada vs resto à esquerda; 8 KPIs empilhados no celular.
- **/operacao/viagens**: placeholder truncado; alturas de linha irregulares; mistura partidas com hora e passagens sem hora (separar/ordenar); empresas em caixa alta; sem thead sticky; filtros escadinha; tabela esconde status/ações no celular e em 1024; botões do header empilham em 1024.
- **/operacao/viagens/$id**: cards lado a lado com alturas diferentes (vazio branco); 4 StatCards repetem dados e estão na ordem errada; linha do tempo com 1 item em card alto.
- **/operacao/embarques**: vazio encosta (celular); placeholder truncado.
- **/operacao/horarios**: badge de linha esticado como barra (usar w-fit); hora `text-xl` vs negrito normal em Viagens (padronizar); "Não informada pelo DER-MG" repetido → "—" com tooltip; tabela corta empresa no celular.
- **/operacao/linhas**: "Em Manhuaçu" quebra; caixa alta; tabela espremida no celular.
- **/operacao/destinos**: card de barras muito mais baixo que o de ~100 chips (items-start / limitar chips com "ver todos" / max-h); selo "MANHUAÇU" decorativo sem função; chips longos no celular.
- **/operacao/plataformas**: vazio repete o botão → CTA dentro do vazio.
- **/controle-embarque**: seletor de data sem rótulo; frase do vazio longa demais.
- **/passagens**: overflow no celular; "Emissão de" quebra.
- **/conciliacao**: caixinhas do "Fluxo" parecem botões (tirar borda/sombra ou stepper); barra de progresso vazia; FilterBar com 3 controles à esquerda; setas penduradas no celular; mini-cards `grid-cols-3` (conciliacao.tsx:212) cortam; vazio encosta.
- **/empresas**: CNPJ quebrado; cabeçalhos em 3 linhas; razão social caixa alta ocupa 3–4 linhas no celular.
- **/empresas/$id**: dois títulos principais (card com nome + H1 "Painel da empresa") → nome da empresa é o H1; abas quebram no celular.
- **/financeiro/taxas**: "competênci…" truncado; filtros ocupam metade; vazio encosta.
- **/financeiro/pagamentos**: 2 KPIs largos e vazios.
- **/financeiro/pendencias, /inadimplencia**: KPIs sem ícone e menores (padronizar); "Atualizar situação" outline vs primário nas outras (revisar hierarquia).
- **/relatorios**: 5 cards em grade de 3 deixam buraco; "Visualizar" fraco → card inteiro clicável; "até" pendurado no celular.
- **/integracoes**: botão do header desalinhado; aba Dados públicos com competência em 3 formatos ("2026-10", "2026-08-01", "Out2026") e recurso sem acento ("horarios") → formatar; "Como integrar" input do endpoint corta a URL; abas quebram no celular.
- **/configuracoes**: Parâmetros com inputs desalinhados (sufixos R$/dia/min mudam largura) → coluna fixa com adorno dentro do input; "Salvar" desabilitado com pouco contraste; Perfis: cards vazios, grade de 7 com um sozinho; abas quebram e tabela de usuários corta e-mail no celular.

## C) Painel de TV e telas públicas

- **C1 Colunas encavaladas** ("HORÁRIODESTINO", "13:00CAPUTIRA"): `grid-cols-[7rem_1fr_1fr_8rem_14rem]` + hora `md:text-5xl` + `tracking-[0.25em]` sem fonte condensada. Fonte + `grid-cols-[minmax(9rem,auto)_2fr_1.3fr_minmax(9rem,auto)_minmax(15rem,auto)]`, `gap-8`, tracking 0.12em, truncate.
- **C2 Hierarquia**: hora e destino maiores; empresa menor (opacidade 60%); sem empresa real → vazio (não "INTERMUNICIPAL").
- **C3 Status**: tudo "PREVISTO" azul igual; destacar próxima partida (fundo board-row), zebra; esconder partidas que já passaram do horário (o backend não marca atraso automaticamente por ora).
- **C4 Plataforma vazia**: "—" text-5xl vira barra → text-3xl opacidade 40% ou "A DEFINIR" pequeno.
- **C5 Layout**: header quebra (relógio cai) → grid 3 colunas fixas (logo | PARTIDAS/CHEGADAS | relógio); selo da prefeitura em quadro branco destoa → versão clara/monocromática ou remover; `min-h-screen` sem flex deixa vazio e em 745px rola → `flex h-screen flex-col`, tabela `flex-1 overflow-hidden`, linhas pela altura ou rotação de páginas; rodapé com links/botões aparece na TV → esconder após inatividade do mouse/fullscreen; rótulos 60% → 75%; rodapé text-sm ilegível.
- **C6 Celular no painel**: overflow; layout de lista (hora + destino + status).
- **C7 Chegadas**: mesmos problemas; vazio pequeno no meio da tela.
- **C8 /minha-viagem**: 3 marcas; "Ver painel de partidas" link pequeno → botão secundário full no celular; nota text-xs cinza com baixo contraste.
