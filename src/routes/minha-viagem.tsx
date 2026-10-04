import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PrefeituraLogo, RodoviariaLogo, SisRodovLogo } from "@/components/brand/Logos";
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
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <RodoviariaLogo />
          <PrefeituraLogo />
        </div>

        <div className="surface-card overflow-hidden">
          <div className="gradient-institutional px-6 py-7 text-primary-foreground">
            <p className="text-xs font-bold tracking-[0.25em] uppercase text-primary-foreground/70">
              Sua viagem
            </p>
            <h1 className="mt-2 font-display text-3xl font-extrabold">Saindo de Manhuaçu</h1>
            <p className="mt-1 text-primary-foreground/80">
              {today?.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>

          <div className="border-b border-border px-6 py-5">
            <p className="mb-2 text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground">
              Para onde você vai?
            </p>
            <Select
              value={destino}
              onValueChange={(d) => {
                setDestino(d);
                setEmpresa("todas");
              }}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Escolha o destino" />
              </SelectTrigger>
              <SelectContent>
                {destinos.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {destino && empresas.length > 1 && (
            <div className="border-b border-border px-6 py-4">
              <p className="mb-2 text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground">
                Empresa
              </p>
              <Select value={empresa} onValueChange={setEmpresa}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as empresas</SelectItem>
                  {empresas.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
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
            <EmptyState message={`Sem partidas para ${destino} hoje.`} />
          )}

          {opcoes.length > 0 && (
            <ul className="divide-y divide-border">
              {opcoes.map((v) => {
                const st = tripStatusTone[v.status];
                return (
                  <li key={v.id} className="flex items-center gap-4 px-6 py-4">
                    <span className="tabular w-16 font-display text-2xl font-bold">
                      {horaPrevista(v)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{nomeEmpresaViagem(v)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {v.origem} → {v.destino}
                        {v.plataforma ? ` · Plataforma ${v.plataforma.numero}` : ""}
                        {!v.previsto_em ? " · horário no terminal a confirmar" : ""}
                      </p>
                    </div>
                    <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="border-t border-border px-6 py-4 text-xs text-muted-foreground">
            Viagens do dia geradas da grade oficial (ANTT e DER-MG) e atualizadas pela equipe do
            terminal. Confirme a plataforma no painel do terminal.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <SisRodovLogo />
          <Link to="/painel" className="text-sm font-semibold text-primary hover:underline">
            Ver painel de partidas
          </Link>
        </div>
      </div>
    </div>
  );
}
