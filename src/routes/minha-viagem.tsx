import { createFileRoute, Link } from "@tanstack/react-router";
import { QrCode } from "lucide-react";
import { PrefeituraLogo, RodoviariaLogo, SisRodovLogo } from "@/components/brand/Logos";
import { StatusBadge } from "@/components/common";

export const Route = createFileRoute("/minha-viagem")({
  head: () => ({
    meta: [
      { title: "Sua viagem — Terminal Rodoviário de Manhuaçu" },
      {
        name: "description",
        content:
          "Consulta pública da viagem: horário, plataforma, empresa e situação do embarque no Terminal Rodoviário de Manhuaçu.",
      },
      { property: "og:title", content: "Sua viagem — Terminal Rodoviário de Manhuaçu" },
      {
        property: "og:description",
        content: "Horário, plataforma e situação de embarque da sua viagem.",
      },
    ],
  }),
  component: PassengerTrip,
});

function PassengerTrip() {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <RodoviariaLogo />
          <PrefeituraLogo />
        </div>

        <div className="surface-card overflow-hidden">
          <div className="gradient-institutional px-6 py-7 text-primary-foreground">
            <p className="text-xs font-bold tracking-[0.25em] uppercase text-primary-foreground/70">Sua viagem</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold">Manhuaçu → Vitória</h1>
            <p className="mt-1 text-primary-foreground/80">26 de setembro de 2026</p>
          </div>

          <div className="grid grid-cols-2 gap-px bg-border">
            <Info label="Horário" value="16:10" />
            <Info label="Plataforma" value="05" />
            <Info label="Empresa" value="Viação Manhuaçu" />
            <Info label="Situação" value={<StatusBadge tone="success">Embarque</StatusBadge>} />
          </div>

          <div className="flex flex-col items-center gap-3 border-t border-border px-6 py-8">
            <div className="grid h-40 w-40 place-items-center rounded-xl border-2 border-dashed border-border bg-muted">
              <QrCode className="h-20 w-20 text-muted-foreground" />
            </div>
            <p className="text-center text-sm font-semibold">
              Apresente sua passagem à empresa para embarque.
            </p>
            <p className="text-xs text-muted-foreground">QR Code demonstrativo — sem leitura funcional.</p>
          </div>
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

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-card px-6 py-5">
      <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground">{label}</p>
      <div className="mt-1.5 font-display text-xl font-bold">{value}</div>
    </div>
  );
}
