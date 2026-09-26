import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import {
  DataTable,
  FilterBar,
  PageHeader,
  SectionCard,
  StatusBadge,
  reconciliationTone,
  tripStatusTone,
  type Column,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { TODAY_SHORT, allTrips, companies, companyName, destinations } from "@/data/mock";
import type { Trip } from "@/types";

export const Route = createFileRoute("/_admin/operacao/viagens/")({
  head: () => ({
    meta: [
      { title: "Viagens — SisRodov Manhuaçu" },
      {
        name: "description",
        content: "Controle das viagens previstas, em embarque, realizadas e canceladas no Terminal Rodoviário de Manhuaçu.",
      },
      { property: "og:title", content: "Viagens — SisRodov Manhuaçu" },
      { property: "og:description", content: "Controle das viagens do Terminal Rodoviário de Manhuaçu." },
    ],
  }),
  component: TripsPage,
});

function TripsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [company, setCompany] = useState("todas");
  const [status, setStatus] = useState("todos");
  const [destination, setDestination] = useState("todos");

  const rows = useMemo(
    () =>
      allTrips.filter((t) => {
        const q = search.trim().toLowerCase();
        const matchQ =
          !q || `${t.number} ${t.destination} ${companyName(t.companyId)} ${t.vehicle}`.toLowerCase().includes(q);
        return (
          matchQ &&
          (company === "todas" || t.companyId === company) &&
          (status === "todos" || t.status === status) &&
          (destination === "todos" || t.destination === destination)
        );
      }),
    [search, company, status, destination],
  );

  const columns: Column<Trip>[] = [
    { key: "date", header: "Data", render: (t) => <span className="tabular">{t.date}</span> },
    { key: "time", header: "Horário", render: (t) => <span className="tabular font-semibold">{t.scheduled}</span> },
    { key: "company", header: "Empresa", render: (t) => companyName(t.companyId) },
    { key: "origin", header: "Origem", render: (t) => <span className="text-muted-foreground">{t.origin}</span> },
    { key: "dest", header: "Destino", render: (t) => t.destination },
    { key: "vehicle", header: "Veículo", render: (t) => <span className="tabular text-muted-foreground">{t.vehicle}</span> },
    { key: "boardings", header: "Embarques", align: "right", render: (t) => <span className="tabular">{t.boardings}</span> },
    {
      key: "status",
      header: "Status",
      render: (t) => <StatusBadge tone={tripStatusTone[t.status].tone}>{tripStatusTone[t.status].label}</StatusBadge>,
    },
    {
      key: "conc",
      header: "Conciliação",
      render: (t) => (
        <StatusBadge tone={reconciliationTone[t.reconciliation].tone} dot={false}>
          {reconciliationTone[t.reconciliation].label}
        </StatusBadge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Viagens"
        subtitle="Programação e execução das viagens do terminal"
        actions={<NewTripDialog />}
      />

      <FilterBar search={search} onSearch={setSearch} placeholder="Pesquisar viagem, empresa, destino ou veículo...">
        <Input type="date" defaultValue="2026-09-26" className="h-9 w-[10.5rem]" aria-label="Data" />
        <Select value={company} onValueChange={setCompany}>
          <SelectTrigger className="h-9 w-[13rem]">
            <SelectValue placeholder="Empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as empresas</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={destination} onValueChange={setDestination}>
          <SelectTrigger className="h-9 w-[12rem]">
            <SelectValue placeholder="Destino" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os destinos</SelectItem>
            {destinations.map((d) => (
              <SelectItem key={d.name} value={d.name}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-[10rem]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="prevista">Prevista</SelectItem>
            <SelectItem value="embarque">Embarque</SelectItem>
            <SelectItem value="realizada">Realizada</SelectItem>
            <SelectItem value="atrasada">Atrasada</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      <SectionCard bodyClassName="p-0">
        <DataTable
          columns={columns}
          rows={rows}
          onRowClick={(t) => navigate({ to: "/operacao/viagens/$tripId", params: { tripId: t.id } })}
        />
      </SectionCard>
      <p className="mt-3 text-xs text-muted-foreground">
        {rows.length} viagens listadas · dados fictícios do ambiente demonstrativo.
      </p>
    </>
  );
}

function NewTripDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Nova viagem
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova viagem</DialogTitle>
          <DialogDescription>
            Cadastro visual demonstrativo — nenhum dado é gravado nesta versão.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Data">
            <Input type="date" defaultValue="2026-09-26" />
          </Field>
          <Field label="Horário">
            <Input type="time" defaultValue="18:30" />
          </Field>
          <Field label="Empresa">
            <Select defaultValue="c1">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Destino">
            <Select defaultValue="Belo Horizonte">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {destinations.map((d) => (
                  <SelectItem key={d.name} value={d.name}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Plataforma">
            <Input placeholder="03" />
          </Field>
          <Field label="Veículo">
            <Input placeholder="ABC-1234" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              setOpen(false);
              toast.success("Viagem registrada no ambiente demonstrativo", {
                description: `Programação de ${TODAY_SHORT} atualizada apenas visualmente.`,
              });
            }}
          >
            Salvar viagem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
