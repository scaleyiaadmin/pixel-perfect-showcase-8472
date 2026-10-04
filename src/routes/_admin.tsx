import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Clock, Loader2, LogOut, ShieldAlert } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/button";
import { SisRodovLogo } from "@/components/brand/Logos";
import { moduloDaRota, podeVer, usePerfil, useSair } from "@/services/acesso";

export const Route = createFileRoute("/_admin")({
  component: AdminLayout,
});

// A checagem de acesso é feita no cliente: no SSR a sessão não existe (fica no navegador),
// então o servidor só renderiza o "Verificando acesso".
function AdminLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { sessao, perfil, carregando, error, refetch } = usePerfil();
  const sairDaConta = useSair();

  useEffect(() => {
    if (!carregando && !sessao) navigate({ to: "/" });
  }, [carregando, sessao, navigate]);

  if (carregando || !sessao) {
    return (
      <TelaCentral>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Verificando acesso...
        </div>
      </TelaCentral>
    );
  }

  const sairEVoltar = async () => {
    await sairDaConta();
    navigate({ to: "/" });
  };

  if (error) {
    return (
      <TelaCentral>
        <ShieldAlert className="h-8 w-8 text-danger" />
        <h1 className="font-display text-xl font-bold">Não foi possível verificar seu acesso</h1>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Falha ao consultar o banco de dados."}
        </p>
        <div className="flex gap-2">
          <Button onClick={() => refetch()}>Tentar novamente</Button>
          <Button variant="outline" onClick={sairEVoltar}>
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </TelaCentral>
    );
  }

  if (!perfil?.ativo) {
    return (
      <TelaCentral>
        <Clock className="h-8 w-8 text-warning" />
        <h1 className="font-display text-xl font-bold">Aguardando aprovação</h1>
        <p className="text-sm text-muted-foreground">
          {perfil
            ? "Sua conta foi criada e aguarda a aprovação do administrador do sistema, que vai definir o seu perfil de acesso. Tente novamente mais tarde."
            : "Não encontramos o perfil da sua conta. Fale com o administrador do sistema."}
        </p>
        <p className="text-xs text-muted-foreground">Conectado como {sessao.user.email}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            Verificar novamente
          </Button>
          <Button onClick={sairEVoltar}>
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </TelaCentral>
    );
  }

  const modulo = moduloDaRota(pathname);
  const permitido = !modulo || podeVer(perfil.papel, modulo);

  return (
    <AdminShell>
      {permitido ? (
        <Outlet />
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <ShieldAlert className="h-8 w-8 text-muted-foreground" />
          <h1 className="font-display text-xl font-bold">Acesso não permitido</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            O seu perfil de acesso não inclui este módulo. Se precisar dele, peça ao administrador
            do sistema.
          </p>
        </div>
      )}
    </AdminShell>
  );
}

function TelaCentral({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-xl border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
        <SisRodovLogo />
        {children}
      </div>
    </div>
  );
}
