# Componentes do design institucional

Importe sempre de `@/components/common` (helpers de texto de `@/lib/format`). Direção: mesmo visual do ERP da A&M — fundo cinza-azulado, cartões brancos `rounded-2xl` sem borda com sombra leve, pílulas de status, botões `rounded-lg`, densidade de 80% no desktop (`html { font-size: 80% }` só quando o AdminShell está na tela; login, "minha viagem" e painel de TV ficam em 100%).

## PageHeader
`title` (texto/JSX), `subtitle`, `eyebrow` (pequeno acima do título — use em vez de "Financeiro · Taxas"), `actions`. Celular: ações descem e esticam; md+: à direita alinhadas ao topo.
```tsx
<PageHeader eyebrow="Financeiro" title="Taxas" subtitle="…" actions={<Button>Fechar competência</Button>} />
```

## SectionCard
`title`, `description`, `actions`, `bodyClassName` (p-4/p-5 padrão; `p-0` para tabelas). Usa overflow-clip (não quebra thead sticky).

## FilterBar / FilterSelect / filterControlClass / DateRangeFilter
FilterBar: `search`, `onSearch`, `placeholder` (curto!), `children`, `actions` (direita no desktop). Sem cartão (como o ERP). Celular: tudo em coluna, w-full, 44px.
`filterControlClass` = `h-11 w-full sm:h-10 sm:w-auto sm:min-w-[12rem] sm:max-w-[20rem]` — use no lugar de larguras fixas. Inputs avulsos de filtro (data única etc.): `h-11 sm:h-10`, nunca `h-9`.
```tsx
<FilterBar search={busca} onSearch={setBusca} placeholder="Buscar viagem ou destino" actions={<Button variant="outline">Exportar</Button>}>
  <FilterSelect value={status} onValueChange={setStatus} placeholder="Status" allLabel="Todos os status" /* allValue="todos" padrão */
    options={[{ value: "pago", label: "Pago" }]} />
  <DateRangeFilter label="Período" from={de} to={ate} onFromChange={setDe} onToChange={setAte} />
  <Select …><SelectTrigger className={filterControlClass}>…</SelectTrigger></Select>
</FilterBar>
```
DateRangeFilter: datas "YYYY-MM-DD"; props opcionais fromLabel, toLabel, min, max.

## SegmentedFilter
Pílulas para poucas opções ("Todas · Hoje · Atrasadas", como no ERP). `value`, `onValueChange`, `options` ({ value, label, count? }), `aria-label`. Rola na horizontal no celular.
```tsx
<SegmentedFilter value={aba} onValueChange={setAba} aria-label="Situação"
  options={[{ value: "todas", label: "Todas", count: 42 }, { value: "hoje", label: "Hoje" }]} />
```

## EmptyState
`message`, `title`, `icon` (Lucide), `action`, `compact`, `className`. px-6, texto max-w-md.
```tsx
<EmptyState message="Nenhuma plataforma cadastrada." action={<Button onClick={abrir}>Nova plataforma</Button>} />
```

## DataTable
API antiga intacta. Tabela: `mobile` ("cards" padrão | "scroll"), `minWidth` ("42rem"), `stickyHeader` (true), `empty`, `rowClassName(row)`, `className`.
Coluna: `mobile` ('title'|'subtitle'|'badge'|'meta'|'hidden'|'action'), `hideOnMobile`, `hideBelow` ("md"|"lg"|"xl" — esconde th e td abaixo do breakpoint; use em vez de `className: "hidden xl:table-cell"`), `mobileLabel`, `nowrap`, `cellClassName` (`className` = só cabeçalho).
Fallback: 1ª coluna título; "status" badge; header vazio ou key actions/acoes = ação; resto pares rótulo/valor. Configure `mobile` explicitamente nas tabelas importantes.
```tsx
<DataTable rows={viagens} onRowClick={abrir} columns={[
  { key: "hora", header: "Hora", nowrap: true, mobile: "meta", render: (v) => <span className="tabular font-semibold">{hora(v.previsto_em)}</span> },
  { key: "destino", header: "Destino", mobile: "title", render: (v) => tituloNome(v.destino) },
  { key: "empresa", header: "Empresa", mobile: "subtitle", render: (v) => ouVazio(v.empresa, tituloNome) },
  { key: "veiculo", header: "Veículo", hideOnMobile: true, hideBelow: "xl", render: (v) => ouVazio(v.veiculo) },
  { key: "status", header: "Status", mobile: "badge", render: (v) => <StatusBadge tone="info">Prevista</StatusBadge> },
  { key: "acoes", header: "", align: "right", mobile: "action", render: (v) => <Menu … /> },
]} />
```

## StatGrid / StatCard
StatGrid `cols` 4 (2 no celular, 4 xl) | 3 (2 celular, 3 sm+) | 2. Ímpar: último ocupa a linha no celular.
StatCard: `label`, `value`, `hint`, `icon`, `tone` (neutral|info|success|warning|danger|primary), `valueTone` (`true` = pinta o valor com o `tone`; ou passe outro tom — use em KPIs monetários: pago/pendente/vencido), `trend`, `variant` ("card" | "soft" — substitui mini-cards coloridos; valor já sai colorido), `className`. Compacto no celular. **Um único estilo de KPI em todo o sistema** — nunca `value={<span className={toneText…}>}`.
```tsx
<StatGrid><StatCard label="Partidas hoje" value={42} icon={Bus} tone="info" hint="12 já saíram" /></StatGrid>
<StatCard label="Vencidas" value={brl(1900)} icon={AlertTriangle} tone="danger" valueTone />
<StatGrid cols={3}><StatCard variant="soft" tone="success" label="Realizadas" value={0} />…</StatGrid>
```

## StatusBadge
Pílula (rounded-full), w-fit, nowrap; `size="sm"` para tabelas densas; `dot`. Exporta `toneClass` (fundo suave + texto do tom) e `toneText` (só texto). **Nunca monte classe dinâmica** (`bg-${tom}-soft` não é gerado pelo Tailwind): use os mapas estáticos — `className={cn("rounded-lg", toneClass[tom])}`.

## Barras de proporção
Como o ERP: `flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted` com segmentos `rounded-full bg-success|bg-info|bg-warning|bg-danger` (largura em `style`). Nada de bloco azul-escuro fixo nem `bg-primary/…` como fundo de seção.

## Texto e vazio
`tituloNome("VIACAO AGUIA BRANCA S A")` → "Viação Águia Branca S.A." (de `@/lib/format`; texto em caixa mista volta igual). `VAZIO` = "—".
`cidadeNome("CARATINGA/MG")` → "Caratinga/MG" (UF em maiúsculas; também "X - SP" e "X (MG)"). Use em toda origem/destino/cidade — não recrie versões locais.
`<Vazio title="Não informada pelo DER-MG" />` traço cinza com dica; `ouVazio(valor, formatar?, title?)`.

## Logos (`@/components/brand/Logos`)
- `<MarcaSisRodovPrefeitura size tone />` — lockup oficial lado a lado: [símbolo + "SisRodov"/"RODOVIÁRIA"] | [logo da Prefeitura], mesma altura, linha vertical fina com respiro igual. `size`: `sm` (header do celular: símbolo + brasão; o nome aparece a partir de 420px) · `md` (topo da sidebar, bloco `h-24`) · `lg` (login/relatórios; em < 640px use `md`). `tone`: `auto` (segue o tema) · `light` (impressão) · `dark` (fundo azul/escuro: tudo branco).
- `<SisRodovLogo />` — marca horizontal do sistema (símbolo + nome + subtítulo, padrão "Rodoviária"). `compact` = só o símbolo (menu recolhido), `inverted`, `size` sm|md|lg, `subtitle=""` remove.
- `<SisRodovSimbolo className="h-8 w-8" />` — só o ônibus (recortes transparentes; cor por `text-*`, padrão `text-primary`).
- `<PrefeituraLogo variant size inverted />` — `variant="light"` branco p/ fundo escuro; `inverted` = selo branco com a logo colorida (o mais legível no painel de TV); `size` sm|md|lg|xl.
- `<RodoviariaLogo inverted accent size />` — "Nova Rodoviária de Manhuaçu"; no painel de TV `accent="text-board-accent"`.

Onde usar: sidebar/header/login = `MarcaSisRodovPrefeitura` (uma vez por tela, sem repetir a logo da Prefeitura em outro canto). Painel de TV = `RodoviariaLogo` + `PrefeituraLogo inverted size="md"`.

## Painel de TV
Tokens próprios: `bg-board`, `bg-board-row`, `text-board-foreground`, `gradient-board`, `font-board`. Acento azul claro = `board-accent` (`text-board-accent`, `border-board-accent`, `bg-board-accent/20`) — não use `primary` no painel (some no fundo escuro).

## Fontes
`font-sans` Inter (todo o sistema; h1–h4 já usam `--font-display`, que também é Inter — **não** escreva `font-display`) · `font-board` Barlow Condensed (painel TV) · `font-mono` JetBrains Mono · utilitário `tabular` para números.

## Superfícies
`Card`/`SectionCard`/`StatCard` já são o cartão do ERP (`bg-card rounded-2xl border-0 shadow-[var(--shadow-card)]`). Não some `surface-card`, `border` ou `rounded-xl` neles. Para `div`/`button` soltos use `surface-card` (+ `card-hover` se clicável). Cabeçalho de página: sempre `PageHeader` (título `text-xl md:text-2xl`, subtítulo curto).
