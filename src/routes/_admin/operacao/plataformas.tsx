import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bus, CircleCheck, CircleOff, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import {
  EmptyState,
  PageHeader,
  QueryState,
  SectionCard,
  StatusBadge,
  type Tone,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePermissao } from "@/services/acesso";
import type { Plataforma } from "@/services/gestao-tipos";
import {
  emAberto,
  horaPrevista,
  mensagemErro,
  ocupaPlataforma,
  useExcluirPlataforma,
  useHoje,
  usePlataformas,
  useSalvarPlataforma,
  useViagensDoDia,
  type ViagemDetalhada,
} from "@/services/operacao";

export const Route = createFileRoute("/_admin/operacao/plataformas")({
  head: () => ({
    meta: [
      { title: "Plataformas — SisRodov Manhuaçu" },
      {
        name: "description",
        content:
          "Situação das plataformas de embarque da Nova Rodoviária de Manhuaçu em tempo real.",
      },
      { property: "og:title", content: "Plataformas — SisRodov Manhuaçu" },
      {
        property: "og:description",
        content: "Ocupação e disponibilidade das plataformas do terminal.",
      },
    ],
  }),
  component: PlatformsPage,
});

type Situacao = "disponivel" | "ocupada" | "manutencao" | "inativa";

const config: Record<Situacao, { tone: Tone; label: string; icon: typeof Bus; ring: string }> = {
  disponivel: {
    tone: "success",
    label: "Disponível",
    icon: CircleCheck,
    ring: "border-success/35 bg-success-soft",
  },
  ocupada: { tone: "info", label: "Ocupada", icon: Bus, ring: "border-info/35 bg-info-soft" },
  manutencao: {
    tone: "warning",
    label: "Manutenção",
    icon: Wrench,
    ring: "border-warning/40 bg-warning-soft",
  },
  inativa: {
    tone: "neutral",
    label: "Inativa",
    icon: CircleOff,
    ring: "border-border bg-muted/50",
  },
};

const rotuloViagem = (v: ViagemDetalhada) =>
  `${horaPrevista(v)} · ${v.tipo === "chegada" ? v.origem : v.destino}`;

function PlatformsPage() {
  const hoje = useHoje();
  const plataformas = usePlataformas({ aoVivo: true });
  const viagens = useViagensDoDia(hoje);
  const [editando, setEditando] = useState<Plataforma | "nova" | null>(null);
  const { editar } = usePermissao("operacao");

  const situacao = (p: Plataforma) => {
    const doDia = (viagens.data ?? []).filter((v) => v.plataforma_id === p.id);
    const ocupante = doDia.find(ocupaPlataforma);
    const proxima = doDia.find((v) => emAberto(v) && !ocupaPlataforma(v));
    const s: Situacao = !p.ativa
      ? "inativa"
      : p.em_manutencao
        ? "manutencao"
        : ocupante
          ? "ocupada"
          : "disponivel";
    return { s, ocupante, proxima };
  };

  const lista = plataformas.data ?? [];

  return (
    <>
      <PageHeader
        title="Plataformas"
        subtitle="Ocupação das plataformas da Nova Rodoviária de Manhuaçu"
        actions={
          editar ? (
            <Button onClick={() => setEditando("nova")}>
              <Plus className="h-4 w-4" /> Nova plataforma
            </Button>
          ) : undefined
        }
      />

      <QueryState isLoading={plataformas.isLoading} error={plataformas.error} />
      {plataformas.data && lista.length === 0 && (
        <SectionCard>
          <EmptyState message="Nenhuma plataforma cadastrada. Cadastre as plataformas do terminal em “Nova plataforma” para alocar as viagens e acompanhar a ocupação." />
        </SectionCard>
      )}

      {lista.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {lista.map((p) => {
            const { s, ocupante, proxima } = situacao(p);
            const c = config[s];
            const Icon = c.icon;
            return (
              <div
                key={p.id}
                className={cn(
                  "group rounded-xl border p-5 shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5",
                  c.ring,
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
                      Plataforma
                    </p>
                    <p className="tabular font-display text-4xl font-extrabold">{p.numero}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {editar && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={`Editar plataforma ${p.numero}`}
                        onClick={() => setEditando(p)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                <div className="mt-4">
                  <StatusBadge tone={c.tone}>{c.label}</StatusBadge>
                </div>
                <p className="mt-3 min-h-[1.25rem] text-sm font-medium">
                  {ocupante ? (
                    <Link
                      to="/operacao/viagens/$tripId"
                      params={{ tripId: ocupante.id }}
                      className="hover:underline"
                    >
                      {rotuloViagem(ocupante)}
                    </Link>
                  ) : (
                    "Sem viagem no momento"
                  )}
                </p>
                {proxima && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Próxima: {rotuloViagem(proxima)}
                  </p>
                )}
                {p.observacao && (
                  <p className="mt-1 text-xs text-muted-foreground italic">{p.observacao}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {lista.length > 0 && (
        <div className="mt-6">
          <SectionCard
            title="Visão do saguão"
            description="Situação atual das plataformas · atualização automática a cada 30 s"
          >
            <div className="rounded-xl border border-border bg-muted/40 p-6">
              <div className="flex flex-wrap gap-3">
                {lista.map((p) => {
                  const { s, ocupante } = situacao(p);
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        "flex h-24 w-32 flex-col items-center justify-center rounded-lg border-2 text-center",
                        s === "ocupada"
                          ? "border-info bg-info-soft"
                          : s === "manutencao"
                            ? "border-warning bg-warning-soft"
                            : s === "inativa"
                              ? "border-border bg-muted opacity-60"
                              : "border-dashed border-border bg-card",
                      )}
                    >
                      <p className="tabular font-display text-2xl font-bold">{p.numero}</p>
                      <p className="px-2 text-[11px] leading-tight text-muted-foreground">
                        {ocupante ? rotuloViagem(ocupante) : config[s].label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {editando && (
        <PlataformaForm
          plataforma={editando === "nova" ? null : editando}
          onClose={() => setEditando(null)}
        />
      )}
    </>
  );
}

function PlataformaForm({
  plataforma,
  onClose,
}: {
  plataforma: Plataforma | null;
  onClose: () => void;
}) {
  const salvar = useSalvarPlataforma();
  const excluir = useExcluirPlataforma();
  const [numero, setNumero] = useState(plataforma?.numero ?? "");
  const [manutencao, setManutencao] = useState(plataforma?.em_manutencao ?? false);
  const [ativa, setAtiva] = useState(plataforma?.ativa ?? true);
  const [observacao, setObservacao] = useState(plataforma?.observacao ?? "");

  const gravar = () =>
    salvar.mutate(
      {
        id: plataforma?.id,
        numero: numero.trim(),
        em_manutencao: manutencao,
        ativa,
        observacao: observacao.trim(),
      },
      {
        onSuccess: () => {
          toast.success(plataforma ? "Plataforma atualizada" : "Plataforma cadastrada");
          onClose();
        },
        onError: (e) =>
          toast.error("Não foi possível salvar a plataforma", {
            description:
              (e as { code?: string }).code === "23505"
                ? "Já existe uma plataforma com esse número."
                : mensagemErro(e),
          }),
      },
    );

  const remover = () =>
    plataforma &&
    excluir.mutate(plataforma, {
      onSuccess: () => {
        toast.success("Plataforma excluída");
        onClose();
      },
      onError: (e) => toast.error("Não foi possível excluir", { description: mensagemErro(e) }),
    });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {plataforma ? `Plataforma ${plataforma.numero}` : "Nova plataforma"}
          </DialogTitle>
          <DialogDescription>
            Cadastro das plataformas de embarque e desembarque do terminal.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Número / identificação</Label>
            <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="01" />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Em manutenção</p>
              <p className="text-xs text-muted-foreground">Não recebe viagens enquanto marcada.</p>
            </div>
            <Switch checked={manutencao} onCheckedChange={setManutencao} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Ativa</p>
              <p className="text-xs text-muted-foreground">
                Desative em vez de excluir se já foi usada.
              </p>
            </div>
            <Switch checked={ativa} onCheckedChange={setAtiva} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Observação</Label>
            <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {plataforma ? (
            <Button
              variant="ghost"
              className="text-danger"
              disabled={excluir.isPending}
              onClick={remover}
            >
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            <Button disabled={!numero.trim() || salvar.isPending} onClick={gravar}>
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
