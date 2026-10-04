import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MonitorPlay } from "lucide-react";
import { PrefeituraLogo, RodoviariaLogo } from "@/components/brand/Logos";
import { Button } from "@/components/ui/button";
import { cidadeNome, tituloNome } from "@/lib/format";
import { EmptyState, QueryState, StatusBadge, tripStatusTone } from "@/components/common";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  horaPrevista,
  nomeEmpresaViagem,
  useHoje,
  useViagensDoDia,
  type ViagemDetalhada,
} from "@/services/operacao";

export const Route = createFileRoute("/minha-viagem")({
  head: () => ({
    meta: [
      { title: "Sua viagem — Terminal Rodoviário de Manhuaçu" },
      {
        name: "description",
        content:
          "Consulte os horários de partida do Terminal Rodoviário de Manhuaçu para o seu destino.",
      },
      { property: "og:title", content: "Sua viagem — Terminal Rodoviário de Manhuaçu" },
      {
        property: "og:description",
        content: "Horários de partida para o seu destino a partir de Manhuaçu.",
      },
    ],
  }),
  component: PassengerTrip,
});

/** Cidades que o passageiro alcança embarcando em Manhuaçu nessa viagem. */
const cidadesDaViagem = (v: ViagemDetalhada) => [
  v.destino,
  ...(v.tipo === "partida" ? (v.linha?.cidades_atendidas ?? []).map((c) => c.split("/")[0]) : []),
];

function PassengerTrip() {
  const hoje = useHoje();
  const viagens = useViagensDoDia(hoje);
  const [destino, setDestino] = useState<string>("");
  const [empresa, setEmpresa] = useState<string>("todas");
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => setToday(new Date()), []);

  // Viagens que saem do terminal hoje (partidas e ônibus de passagem).
  const saidas = useMemo(
    () => (viagens.data ?? []).filter((v) => v.tipo !== "chegada"),
    [viagens.data],
  );

  const destinos = useMemo(
    () => [...new Set(saidas.flatMap(cidadesDaViagem))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [saidas],
  );

  const paraDestino = saidas.filter((v) => destino && cidadesDaViagem(v).includes(destino));

  const empresas = useMemo(
    () =>
      [...new Set(paraDestino.map(nomeEmpresaViagem))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [paraDestino],
  );

  const opcoes = paraDestino.filter((v) => empresa === "todas" || nomeEmpresaViagem(v) === empresa);

  return (
    <div className="min-h-dvh bg-background px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-lg">
        <header className="mb-5 flex items-center">
          <RodoviariaLogo />
        </header>

        <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
          <div className="border-b border-border px-5 py-6 sm:px-6 sm:py-7">
            <p className="text-xs font-bold tracking-[0.16em] uppercase text-primary">Sua viagem</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">
              Saindo de Manhuaçu
            </h1>
            <p className="mt-1 text-foreground/75 first-letter:uppercase">
              {today?.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>

          <div className="border-b border-border px-5 py-5 sm:px-6">
            <label
              htmlFor="destino"
              className="mb-2 block text-xs font-bold tracking-[0.12em] uppercase text-foreground/80"
            >
              Para onde você vai?
            </label>
            <Select
              value={destino}
              onValueChange={(d) => {
                setDestino(d);
                setEmpresa("todas");
              }}
            >
              <SelectTrigger id="destino" className="h-11 w-full text-base">
                <SelectValue placeholder="Escolha o destino" />
              </SelectTrigger>
              <SelectContent>
                {destinos.map((d) => (
                  <SelectItem key={d} value={d} className="min-h-11">
                    {cidadeNome(d)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {destino && empresas.length > 1 && (
            <div className="border-b border-border px-5 py-4 sm:px-6">
              <label
                htmlFor="empresa"
                className="mb-2 block text-xs font-bold tracking-[0.12em] uppercase text-foreground/80"
              >
                Empresa
              </label>
              <Select value={empresa} onValueChange={setEmpresa}>
                <SelectTrigger id="empresa" className="h-11 w-full text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas" className="min-h-11">
                    Todas as empresas
                  </SelectItem>
                  {empresas.map((e) => (
                    <SelectItem key={e} value={e} className="min-h-11">
                      {tituloNome(e)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <QueryState isLoading={!hoje || viagens.isLoading} error={viagens.error} />
          {viagens.data && saidas.length === 0 && (
            <EmptyState message="As viagens de hoje ainda não foram publicadas pelo terminal." />
          )}

          {destino && opcoes.length === 0 && (
            <EmptyState message={`Sem partidas para ${cidadeNome(destino)} hoje.`} />
          )}

          {opcoes.length > 0 && (
            <ul className="divide-y divide-border">
              {opcoes.map((v) => {
                const st = tripStatusTone[v.status];
                return (
                  <li
                    key={v.id}
                    className="flex min-h-16 items-center gap-3 px-5 py-4 sm:gap-4 sm:px-6"
                  >
                    <span className="tabular w-16 shrink-0 text-2xl font-bold">
                      {horaPrevista(v)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{tituloNome(nomeEmpresaViagem(v))}</p>
                      <p className="line-clamp-2 text-sm text-foreground/75">
                        {cidadeNome(v.origem)} → {cidadeNome(v.destino)}
                        {v.plataforma ? ` · Plataforma ${v.plataforma.numero}` : ""}
                        {!v.previsto_em ? " · horário no terminal a confirmar" : ""}
                      </p>
                    </div>
                    <StatusBadge tone={st.tone} className="shrink-0">
                      {st.label}
                    </StatusBadge>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="border-t border-border bg-muted/40 px-5 py-4 text-sm leading-relaxed text-foreground/80 sm:px-6">
            Viagens do dia geradas da grade oficial (ANTT e DER-MG) e atualizadas pela equipe do
            terminal. Confirme a plataforma no painel do terminal.
          </p>
        </div>

        <Button asChild variant="outline" size="lg" className="mt-5 h-11 w-full sm:w-auto">
          <Link to="/painel">
            <MonitorPlay className="h-4 w-4" />
            Ver painel de partidas
          </Link>
        </Button>

        <footer className="mt-8 flex items-center justify-center gap-3 border-t border-border pt-5 text-xs font-medium tracking-wide text-foreground/70 uppercase sm:justify-start">
          <span>Realização</span>
          <PrefeituraLogo size="sm" />
        </footer>
      </div>
    </div>
  );
}
