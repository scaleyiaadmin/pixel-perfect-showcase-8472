import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PrefeituraLogo, RodoviariaLogo, SisRodovLogo } from "@/components/brand/Logos";
import { EmptyState, QueryState, StatusBadge } from "@/components/common";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  destinoDaPartida,
  horaCurta,
  partidasDoDia,
  useHorarios,
  type Horario,
} from "@/services/dados-publicos";

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

/** Cidades que o passageiro alcança embarcando em Manhuaçu nesse horário. */
const cidadesDaPartida = (h: Horario) => [
  destinoDaPartida(h),
  ...h.linha.cidades_atendidas.map((c) => c.split("/")[0]),
];

function PassengerTrip() {
  const horarios = useHorarios();
  const [destino, setDestino] = useState<string>("");
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => setToday(new Date()), []);

  const partidas = useMemo(
    () => (today ? partidasDoDia(horarios.data ?? [], today) : []),
    [horarios.data, today],
  );

  const destinos = useMemo(
    () =>
      [...new Set(partidas.flatMap(cidadesDaPartida))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [partidas],
  );

  const opcoes = partidas.filter((h) => destino && cidadesDaPartida(h).includes(destino));

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
            <Select value={destino} onValueChange={setDestino}>
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

          <QueryState isLoading={horarios.isLoading} error={horarios.error} />

          {destino && opcoes.length === 0 && (
            <EmptyState message={`Sem partidas para ${destino} hoje.`} />
          )}

          {opcoes.length > 0 && (
            <ul className="divide-y divide-border">
              {opcoes.map((h) => (
                <li key={h.id} className="flex items-center gap-4 px-6 py-4">
                  <span className="tabular font-display text-2xl font-bold">
                    {horaCurta(h.hora)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {h.linha.empresa?.razao_social ?? "Linha intermunicipal"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {h.linha.descricao}
                      {h.tipo_servico && ` · ${h.tipo_servico}`}
                    </p>
                  </div>
                  <StatusBadge tone="info">Previsto</StatusBadge>
                </li>
              ))}
            </ul>
          )}

          <p className="border-t border-border px-6 py-4 text-xs text-muted-foreground">
            Horários oficiais da ANTT e do DER-MG. Confirme a plataforma no painel do terminal.
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
