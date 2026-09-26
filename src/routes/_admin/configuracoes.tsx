import { createFileRoute } from "@tanstack/react-router";
import {
  DataTable,
  PageHeader,
  SectionCard,
  StatusBadge,
  type Column,
} from "@/components/common";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { auditLogs, companies, platforms, users } from "@/data/mock";
import type { AuditLog, User } from "@/types";

export const Route = createFileRoute("/_admin/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — SisRodov Manhuaçu" },
      {
        name: "description",
        content: "Usuários, perfis, permissões, parâmetros do painel e log de auditoria do SisRodov Manhuaçu.",
      },
      { property: "og:title", content: "Configurações — SisRodov Manhuaçu" },
      { property: "og:description", content: "Usuários, perfis, parâmetros e auditoria do sistema." },
    ],
  }),
  component: SettingsPage,
});

const profiles = [
  { name: "Administrador", description: "Acesso completo ao sistema e às configurações." },
  { name: "Gestor do Terminal", description: "Operação, conciliação e relatórios do terminal." },
  { name: "Operacional", description: "Viagens, horários, plataformas e embarques." },
  { name: "Financeiro", description: "Taxas, pagamentos, pendências e inadimplência." },
  { name: "Auditor", description: "Consulta e relatórios, sem alterações." },
  { name: "Consulta", description: "Somente visualização de painéis e indicadores." },
];

function SettingsPage() {
  const userColumns: Column<User>[] = [
    { key: "name", header: "Nome", render: (u) => <span className="font-semibold">{u.name}</span> },
    { key: "email", header: "E-mail", render: (u) => <span className="text-muted-foreground">{u.email}</span> },
    { key: "profile", header: "Perfil", render: (u) => u.profile },
    { key: "last", header: "Último acesso", render: (u) => <span className="tabular">{u.lastAccess}</span> },
    {
      key: "status",
      header: "Status",
      render: (u) => <StatusBadge tone={u.active ? "success" : "neutral"}>{u.active ? "Ativo" : "Inativo"}</StatusBadge>,
    },
  ];

  const logColumns: Column<AuditLog>[] = [
    { key: "date", header: "Data", render: (l) => <span className="tabular">{l.datetime}</span> },
    { key: "user", header: "Usuário", render: (l) => l.user },
    { key: "action", header: "Ação", render: (l) => <StatusBadge tone="info" dot={false}>{l.action}</StatusBadge> },
    { key: "module", header: "Módulo", render: (l) => l.module },
    { key: "desc", header: "Descrição", render: (l) => <span className="text-muted-foreground">{l.description}</span> },
  ];

  return (
    <>
      <PageHeader title="Configurações" subtitle="Parâmetros do sistema, acessos e auditoria" />

      <Tabs defaultValue="usuarios">
        <TabsList className="flex-wrap">
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="perfis">Perfis e permissões</TabsTrigger>
          <TabsTrigger value="parametros">Parâmetros</TabsTrigger>
          <TabsTrigger value="plataformas">Plataformas</TabsTrigger>
          <TabsTrigger value="empresas">Empresas</TabsTrigger>
          <TabsTrigger value="painel">Painel</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-4">
          <SectionCard title="Usuários do sistema" bodyClassName="p-0">
            <DataTable columns={userColumns} rows={users} />
          </SectionCard>
        </TabsContent>

        <TabsContent value="perfis" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {profiles.map((p) => (
              <SectionCard key={p.name}>
                <h3 className="font-display text-base font-bold">{p.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
              </SectionCard>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="parametros" className="mt-4">
          <SectionCard title="Parâmetros gerais">
            <div className="space-y-4">
              <Toggle id="p1" label="Exibir indicador de sistema operacional no cabeçalho" defaultChecked />
              <Toggle id="p2" label="Registrar alterações de plataforma no log de auditoria" defaultChecked />
              <Toggle id="p3" label="Destacar diferenças acima de 5 passageiros" defaultChecked />
              <Toggle id="p4" label="Exibir valores financeiros no dashboard" defaultChecked />
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="plataformas" className="mt-4">
          <SectionCard title="Plataformas cadastradas" bodyClassName="p-0">
            <DataTable
              columns={[
                { key: "num", header: "Plataforma", render: (p) => <span className="tabular font-semibold">{p.number}</span> },
                { key: "status", header: "Situação", render: (p) => <span className="capitalize">{p.status}</span> },
                { key: "label", header: "Alocação", render: (p) => p.label ?? "—" },
              ]}
              rows={platforms}
            />
          </SectionCard>
        </TabsContent>

        <TabsContent value="empresas" className="mt-4">
          <SectionCard title="Empresas habilitadas" bodyClassName="p-0">
            <DataTable
              columns={[
                { key: "name", header: "Empresa", render: (c) => c.name },
                { key: "cnpj", header: "CNPJ", render: (c) => <span className="tabular">{c.cnpj}</span> },
                { key: "antt", header: "Código ANTT", render: (c) => <span className="tabular">{c.anttCode}</span> },
              ]}
              rows={companies}
            />
          </SectionCard>
        </TabsContent>

        <TabsContent value="painel" className="mt-4">
          <SectionCard title="Configurações do painel público">
            <div className="space-y-4">
              <Toggle id="b1" label="Exibir logo da Prefeitura no painel" defaultChecked />
              <Toggle id="b2" label="Alternar automaticamente entre partidas e chegadas" />
              <Toggle id="b3" label="Destacar alterações de plataforma por 30 segundos" defaultChecked />
              <Toggle id="b4" label="Modo tela cheia ao abrir" />
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <SectionCard title="Log de Auditoria" bodyClassName="p-0">
            <DataTable columns={logColumns} rows={auditLogs} />
          </SectionCard>
        </TabsContent>
      </Tabs>
    </>
  );
}

function Toggle({ id, label, defaultChecked }: { id: string; label: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 last:border-0">
      <Label htmlFor={id} className="text-sm font-normal">
        {label}
      </Label>
      <Switch id={id} defaultChecked={defaultChecked} />
    </div>
  );
}
