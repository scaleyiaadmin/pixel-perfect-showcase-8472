import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  Bell,
  BusFront,
  CalendarPlus,
  Clock,
  DoorOpen,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Send,
} from "lucide-react";
import {
  DataTable,
  EmptyState,
  FilterBar,
  PageHeader,
  QueryState,
  SectionCard,
  StatusBadge,
  tripStatusTone,
  type Column,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { num } from "@/lib/format";
import { usePermissao } from "@/services/acesso";
import { useEmpresas } from "@/services/dados-publicos";
import type { Plataforma, TipoViagem } from "@/services/gestao-tipos";
import {
  dataBR,
  emAberto,
  horaInput,
  horaPrevista,
  instanteNoTerminal,
  mensagemErro,
  nomeEmpresaViagem,
  tipoViagemLabel,
  useAcaoViagem,
  useEmbarquesPorViagem,
  useGerarViagens,
  useHoje,
  useNovaViagem,
  usePlataformas,
  useViagensDoDia,
  type AcaoViagem,
  type ViagemDetalhada,
} from "@/services/operacao";

export const Route = createFileRoute("/_admin/operacao/viagens/")({
  head: () => ({
    meta: [
      { title: "Viagens — SisRodov Manhuaçu" },
      {
        name: "description",
        content:
          "Controle das viagens previstas, em embarque, realizadas e canceladas no Terminal Rodoviário de Manhuaçu.",
      },
      { property: "og:title", content: "Viagens — SisRodov Manhuaçu" },
      {
        property: "og:description",
        content: "Controle das viagens do Terminal Rodoviário de Manhuaçu.",
      },
    ],
  }),
  component: TripsPage,
});

function TripsPage() {
  const navigate = useNavigate();
  const hoje = useHoje();
  const [data, setData] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [company, setCompany] = useState("todas");
  const [status, setStatus] = useState("todos");
  const [tipo, setTipo] = useState("todos");

  useEffect(() => {
    if (hoje && !data) setData(hoje);
  }, [hoje, data]);

  const viagens = useViagensDoDia(data);
  const embarques = useEmbarquesPorViagem(data);
  const plataformas = usePlataformas();
  const gerar = useGerarViagens();
  const { editar } = usePermissao("operacao");

  const empresasDoDia = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of viagens.data ?? []) if (v.empresa) m.set(v.empresa.id, nomeEmpresaViagem(v));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [viagens.data]);

  const rows = useMemo(
    () =>
      (viagens.data ?? []).filter((v) => {
        const q = search.trim().toLowerCase();
        const matchQ =
          !q ||
          `${v.numero} ${v.origem} ${v.destino} ${nomeEmpresaViagem(v)} ${v.veiculo}`
            .toLowerCase()
            .includes(q);
        return (
          matchQ &&
          (company === "todas" || v.empresa_id === company) &&
          (status === "todos" || v.status === status) &&
          (tipo === "todos" || v.tipo === tipo)
        );
      }),
    [viagens.data, search, company, status, tipo],
  );

  const gerarDoDia = () => {
    if (!data) return;
    gerar.mutate(data, {
      onSuccess: (n) =>
        toast.success(n > 0 ? `${n} viagens criadas para ${dataBR(data)}` : "Nenhuma viagem nova", {
          description:
            n > 0
              ? "Geradas a partir da grade pública (ANTT e DER-MG)."
              : "Todas as viagens da grade para esta data já existiam.",
        }),
      onError: (e) =>
        toast.error("Não foi possível gerar as viagens", { description: mensagemErro(e) }),
    });
  };

  const columns: Column<ViagemDetalhada>[] = [
    {
      key: "time",
      header: "Previsto",
      render: (v) => <span className="tabular font-semibold">{horaPrevista(v)}</span>,
    },
    {
      key: "tipo",
      header: "Tipo",
      render: (v) => <span className="text-muted-foreground">{tipoViagemLabel[v.tipo]}</span>,
    },
    { key: "company", header: "Empresa", render: (v) => nomeEmpresaViagem(v) },
    {
      key: "origin",
      header: "Origem",
      render: (v) => <span className="text-muted-foreground">{v.origem}</span>,
    },
    { key: "dest", header: "Destino", render: (v) => v.destino },
    {
      key: "platform",
      header: "Plataforma",
      align: "center",
      render: (v) => <span className="tabular">{v.plataforma?.numero ?? "—"}</span>,
    },
    {
      key: "vehicle",
      header: "Veículo",
      render: (v) => <span className="tabular text-muted-foreground">{v.veiculo || "—"}</span>,
    },
    {
      key: "boardings",
      header: "Embarques",
      align: "right",
      render: (v) => (
        <span className="tabular">{num(embarques.data?.get(v.id)?.acessos ?? 0)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (v) => (
        <StatusBadge tone={tripStatusTone[v.status].tone}>
          {tripStatusTone[v.status].label}
        </StatusBadge>
      ),
    },
    {
      key: "acoes",
      header: "",
      align: "right",
      render: (v) => <AcoesViagem viagem={v} plataformas={plataformas.data ?? []} />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Viagens"
        subtitle="Programação e execução das viagens do terminal"
        actions={
          editar ? (
            <>
              <Button variant="outline" onClick={gerarDoDia} disabled={!data || gerar.isPending}>
                <CalendarPlus className="h-4 w-4" />
                {gerar.isPending ? "Gerando..." : "Gerar viagens do dia"}
              </Button>
              <NewTripDialog data={data ?? hoje ?? ""} plataformas={plataformas.data ?? []} />
            </>
          ) : undefined
        }
      />

      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Pesquisar viagem, empresa, origem, destino ou veículo..."
      >
        <Input
          type="date"
          value={data ?? ""}
          onChange={(e) => e.target.value && setData(e.target.value)}
          className="h-9 w-[10.5rem]"
          aria-label="Data"
        />
        <Select value={company} onValueChange={setCompany}>
          <SelectTrigger className="h-9 w-[13rem]">
            <SelectValue placeholder="Empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as empresas</SelectItem>
            {empresasDoDia.map(([id, nome]) => (
              <SelectItem key={id} value={id}>
                {nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger className="h-9 w-[10rem]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="partida">Partidas</SelectItem>
            <SelectItem value="chegada">Chegadas</SelectItem>
            <SelectItem value="passagem">Passagens</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-[10rem]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {Object.entries(tripStatusTone).map(([k, s]) => (
              <SelectItem key={k} value={k}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      <SectionCard bodyClassName="p-0">
        <QueryState isLoading={!data || viagens.isLoading} error={viagens.error} />
        {viagens.data && viagens.data.length === 0 && (
          <EmptyState
            message={`Nenhuma viagem registrada para ${data ? dataBR(data) : "a data"}. As viagens são geradas automaticamente da grade pública (ANTT e DER-MG) todo dia às 00:05 — use "Gerar viagens do dia" para criar agora ou lance uma viagem manualmente.`}
          />
        )}
        {viagens.data && viagens.data.length > 0 && (
          <DataTable
            columns={columns}
            rows={rows}
            emptyMessage="Nenhuma viagem com esses filtros."
            onRowClick={(v) =>
              navigate({ to: "/operacao/viagens/$tripId", params: { tripId: v.id } })
            }
          />
        )}
      </SectionCard>
      {viagens.data && viagens.data.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {rows.length} de {viagens.data.length} viagens · horários de chegadas e passagens chegam
          pela integração das empresas ou são lançados pela equipe · atualização automática a cada
          30 s.
        </p>
      )}
    </>
  );
}

/* --------------------------- Ações sobre a viagem --------------------------- */

type DialogoAcao = "plataforma" | "editar" | "cancelar" | null;

export function AcoesViagem({
  viagem,
  plataformas,
  variant = "menu",
}: {
  viagem: ViagemDetalhada;
  plataformas: Plataforma[];
  variant?: "menu" | "botao";
}) {
  const acao = useAcaoViagem();
  const { editar } = usePermissao("operacao");
  const [dialogo, setDialogo] = useState<DialogoAcao>(null);
  const aberta = emAberto(viagem);
  const embarca = viagem.tipo !== "chegada";

  const executar = (a: AcaoViagem, sucesso: string, depois?: () => void) =>
    acao.mutate(
      { viagem, ...a },
      {
        onSuccess: () => {
          toast.success(sucesso);
          depois?.();
        },
        onError: (e) =>
          toast.error("Não foi possível atualizar a viagem", { description: mensagemErro(e) }),
      },
    );

  if (!editar) return null;

  return (
    <div onClick={(e) => e.stopPropagation()} className="inline-flex">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {variant === "menu" ? (
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Ações da viagem">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          ) : (
            <Button>
              Ações <MoreHorizontal className="h-4 w-4" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {aberta && (
            <DropdownMenuItem onSelect={() => setDialogo("plataforma")}>
              <MapPin className="h-4 w-4" /> Definir plataforma
            </DropdownMenuItem>
          )}
          {aberta && !viagem.chegou_em && (
            <DropdownMenuItem onSelect={() => executar({ acao: "chegada" }, "Chegada registrada")}>
              <BusFront className="h-4 w-4" /> Registrar chegada
            </DropdownMenuItem>
          )}
          {aberta &&
            embarca &&
            viagem.status !== "embarque" &&
            viagem.status !== "ultima-chamada" && (
              <DropdownMenuItem
                onSelect={() => executar({ acao: "embarque" }, "Embarque iniciado")}
              >
                <DoorOpen className="h-4 w-4" /> Iniciar embarque
              </DropdownMenuItem>
            )}
          {aberta && embarca && viagem.status === "embarque" && (
            <DropdownMenuItem
              onSelect={() => executar({ acao: "ultima-chamada" }, "Última chamada anunciada")}
            >
              <Bell className="h-4 w-4" /> Última chamada
            </DropdownMenuItem>
          )}
          {aberta && embarca && (
            <DropdownMenuItem onSelect={() => executar({ acao: "partida" }, "Partida registrada")}>
              <Send className="h-4 w-4" /> Registrar partida
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDialogo("editar")}>
            <Pencil className="h-4 w-4" /> Editar horário / veículo
          </DropdownMenuItem>
          {aberta ? (
            <DropdownMenuItem
              className="text-danger focus:text-danger"
              onSelect={() => setDialogo("cancelar")}
            >
              <Ban className="h-4 w-4" /> Cancelar viagem
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => executar({ acao: "reabrir" }, "Viagem reaberta")}>
              <RotateCcw className="h-4 w-4" /> Reabrir viagem
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {dialogo === "plataforma" && (
        <PlataformaDialog
          viagem={viagem}
          plataformas={plataformas}
          pending={acao.isPending}
          onClose={() => setDialogo(null)}
          onSave={(id) =>
            executar({ acao: "plataforma", plataforma_id: id }, "Plataforma definida", () =>
              setDialogo(null),
            )
          }
        />
      )}
      {dialogo === "editar" && (
        <EditarDialog
          viagem={viagem}
          pending={acao.isPending}
          onClose={() => setDialogo(null)}
          onSave={(dados) =>
            executar({ acao: "editar", ...dados }, "Viagem atualizada", () => setDialogo(null))
          }
        />
      )}
      {dialogo === "cancelar" && (
        <CancelarDialog
          pending={acao.isPending}
          onClose={() => setDialogo(null)}
          onSave={(motivo) =>
            executar({ acao: "cancelar", motivo }, "Viagem cancelada", () => setDialogo(null))
          }
        />
      )}
    </div>
  );
}

function PlataformaDialog({
  viagem,
  plataformas,
  pending,
  onClose,
  onSave,
}: {
  viagem: ViagemDetalhada;
  plataformas: Plataforma[];
  pending: boolean;
  onClose: () => void;
  onSave: (id: string | null) => void;
}) {
  const [valor, setValor] = useState(viagem.plataforma_id ?? "nenhuma");
  const disponiveis = plataformas.filter((p) => p.ativa);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Definir plataforma</DialogTitle>
          <DialogDescription>
            {viagem.origem} → {viagem.destino} · previsto {horaPrevista(viagem)}
          </DialogDescription>
        </DialogHeader>
        {disponiveis.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma plataforma cadastrada. Cadastre as plataformas do terminal em Operação →
            Plataformas.
          </p>
        ) : (
          <Field label="Plataforma">
            <Select value={valor} onValueChange={setValor}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">Sem plataforma</SelectItem>
                {disponiveis.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    Plataforma {p.numero}
                    {p.em_manutencao ? " (em manutenção)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button
            disabled={pending || disponiveis.length === 0}
            onClick={() => onSave(valor === "nenhuma" ? null : valor)}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditarDialog({
  viagem,
  pending,
  onClose,
  onSave,
}: {
  viagem: ViagemDetalhada;
  pending: boolean;
  onClose: () => void;
  onSave: (d: { previsto_em: string | null; veiculo: string; observacao: string }) => void;
}) {
  const [horaPrev, setHoraPrev] = useState(horaInput(viagem.previsto_em));
  const [veiculo, setVeiculo] = useState(viagem.veiculo);
  const [observacao, setObservacao] = useState(viagem.observacao);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar viagem</DialogTitle>
          <DialogDescription>
            {viagem.origem} → {viagem.destino} · {dataBR(viagem.data)}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Horário previsto no terminal">
            <Input type="time" value={horaPrev} onChange={(e) => setHoraPrev(e.target.value)} />
          </Field>
          <Field label="Veículo (placa ou prefixo)">
            <Input
              value={veiculo}
              onChange={(e) => setVeiculo(e.target.value)}
              placeholder="ABC-1234"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Observação">
              <Textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                rows={3}
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              onSave({
                previsto_em: horaPrev ? instanteNoTerminal(viagem.data, horaPrev) : null,
                veiculo: veiculo.trim(),
                observacao: observacao.trim(),
              })
            }
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelarDialog({
  pending,
  onClose,
  onSave,
}: {
  pending: boolean;
  onClose: () => void;
  onSave: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState("");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar viagem</DialogTitle>
          <DialogDescription>
            O cancelamento aparece nos painéis públicos. Informe o motivo para o registro.
          </DialogDescription>
        </DialogHeader>
        <Field label="Motivo">
          <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Voltar
          </Button>
          <Button
            variant="destructive"
            disabled={pending || !motivo.trim()}
            onClick={() => onSave(motivo.trim())}
          >
            Cancelar viagem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- Nova viagem ------------------------------- */

function NewTripDialog({ data, plataformas }: { data: string; plataformas: Plataforma[] }) {
  const [open, setOpen] = useState(false);
  const empresas = useEmpresas();
  const nova = useNovaViagem();
  const vazio = {
    data,
    hora: "",
    tipo: "partida" as TipoViagem,
    empresa_id: "",
    numero: "",
    origem: "Manhuaçu",
    destino: "",
    plataforma_id: "",
    veiculo: "",
    observacao: "",
  };
  const [form, setForm] = useState(vazio);
  const set = <K extends keyof typeof vazio>(k: K, v: (typeof vazio)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const mudarTipo = (t: TipoViagem) =>
    setForm((f) => ({
      ...f,
      tipo: t,
      origem: t === "partida" ? "Manhuaçu" : f.origem === "Manhuaçu" ? "" : f.origem,
      destino: t === "chegada" ? "Manhuaçu" : f.destino === "Manhuaçu" ? "" : f.destino,
    }));

  const valido = form.data && form.origem.trim() && form.destino.trim();

  const salvar = () =>
    nova.mutate(
      {
        ...form,
        origem: form.origem.trim(),
        destino: form.destino.trim(),
        numero: form.numero.trim(),
        veiculo: form.veiculo.trim(),
        observacao: form.observacao.trim(),
        empresa_id: form.empresa_id || null,
        plataforma_id: form.plataforma_id || null,
      },
      {
        onSuccess: () => {
          toast.success("Viagem registrada", {
            description: `${form.origem} → ${form.destino}, ${dataBR(form.data)}.`,
          });
          setOpen(false);
        },
        onError: (e) =>
          toast.error("Não foi possível registrar a viagem", { description: mensagemErro(e) }),
      },
    );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setForm({ ...vazio, data });
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Nova viagem
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova viagem</DialogTitle>
          <DialogDescription>
            Lançamento manual de uma viagem fora da grade pública (extra, fretamento, reforço).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Data">
            <Input type="date" value={form.data} onChange={(e) => set("data", e.target.value)} />
          </Field>
          <Field label="Horário previsto no terminal">
            <Input type="time" value={form.hora} onChange={(e) => set("hora", e.target.value)} />
          </Field>
          <Field label="Tipo">
            <Select value={form.tipo} onValueChange={(v) => mudarTipo(v as TipoViagem)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="partida">Partida (sai de Manhuaçu)</SelectItem>
                <SelectItem value="chegada">Chegada (termina em Manhuaçu)</SelectItem>
                <SelectItem value="passagem">Passagem (para e segue)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Empresa">
            <Select
              value={form.empresa_id || "nenhuma"}
              onValueChange={(v) => set("empresa_id", v === "nenhuma" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={empresas.isLoading ? "Carregando..." : "Selecione"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">Não informada</SelectItem>
                {(empresas.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.razao_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Origem">
            <Input
              value={form.origem}
              disabled={form.tipo === "partida"}
              onChange={(e) => set("origem", e.target.value)}
            />
          </Field>
          <Field label="Destino">
            <Input
              value={form.destino}
              disabled={form.tipo === "chegada"}
              onChange={(e) => set("destino", e.target.value)}
            />
          </Field>
          <Field label="Plataforma">
            <Select
              value={form.plataforma_id || "nenhuma"}
              onValueChange={(v) => set("plataforma_id", v === "nenhuma" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">Definir depois</SelectItem>
                {plataformas
                  .filter((p) => p.ativa)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      Plataforma {p.numero}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Veículo">
            <Input
              value={form.veiculo}
              onChange={(e) => set("veiculo", e.target.value)}
              placeholder="ABC-1234"
            />
          </Field>
          <Field label="Número / código da viagem">
            <Input value={form.numero} onChange={(e) => set("numero", e.target.value)} />
          </Field>
          <Field label="Observação">
            <Input value={form.observacao} onChange={(e) => set("observacao", e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button disabled={!valido || nova.isPending} onClick={salvar}>
            <Clock className="h-4 w-4" /> Salvar viagem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
