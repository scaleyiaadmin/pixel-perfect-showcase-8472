import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertCircle,
  Bus,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  MonitorPlay,
  ShieldCheck,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PrefeituraLogo, RodoviariaLogo, SisRodovLogo } from "@/components/brand/Logos";
import { supabaseConfigured } from "@/lib/supabase";
import {
  criarConta,
  definirNovaSenha,
  entrar,
  recuperarSenha,
  rotaInicial,
  usePerfil,
  useSair,
  useSessao,
} from "@/services/acesso";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SisRodov Manhuaçu — Acesso ao sistema" },
      {
        name: "description",
        content:
          "Acesso ao SisRodov Manhuaçu, sistema municipal de gestão e controle do Terminal Rodoviário de Manhuaçu.",
      },
      { property: "og:title", content: "SisRodov Manhuaçu — Acesso ao sistema" },
      {
        property: "og:description",
        content: "Sistema Municipal de Gestão e Controle do Terminal Rodoviário de Manhuaçu.",
      },
    ],
  }),
  component: LoginPage,
});

type Modo = "entrar" | "criar" | "esqueci";

function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Lado institucional */}
      <div className="relative hidden flex-col justify-between overflow-hidden gradient-institutional p-12 lg:flex">
        <div className="absolute inset-0 opacity-[0.12]">
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full border-[3rem] border-primary-foreground" />
          <div className="absolute right-10 bottom-10 h-[28rem] w-[28rem] rounded-full border-[2rem] border-primary-foreground" />
        </div>

        <div className="relative">
          <RodoviariaLogo inverted size="lg" />
        </div>

        <div className="relative max-w-lg">
          <p className="font-display text-sm font-semibold tracking-[0.3em] text-primary-foreground/70 uppercase">
            Terminal Rodoviário
          </p>
          <h2 className="mt-4 font-display text-4xl leading-tight font-extrabold text-primary-foreground">
            Informação, controle e transparência em cada embarque.
          </h2>
          <p className="mt-5 text-primary-foreground/80">
            Da viagem ao embarque. Do embarque à conciliação. Da conciliação à gestão — tudo em uma
            única plataforma municipal.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4 text-primary-foreground">
            {[
              { icon: Bus, label: "Operação" },
              { icon: ShieldCheck, label: "Controle" },
              { icon: MonitorPlay, label: "Painel público" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-xl border border-primary-foreground/20 p-4">
                <Icon className="h-5 w-5" />
                <p className="mt-2 text-xs font-semibold tracking-wide uppercase">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-primary-foreground/60">
          Prefeitura de Manhuaçu · Nova Rodoviária · SisRodov
        </p>
      </div>

      {/* Formulário */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-14">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center justify-between gap-4">
            <PrefeituraLogo />
            <SisRodovLogo />
          </div>

          <div className="mt-12">
            <h1 className="font-display text-3xl font-extrabold tracking-tight">
              SisRodov Manhuaçu
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sistema Municipal de Gestão e Controle do Terminal Rodoviário
            </p>
          </div>

          <AreaDeAcesso />

          <div className="mt-8 flex items-center justify-end text-xs text-muted-foreground">
            <Link to="/painel" className="font-semibold text-primary hover:underline">
              Abrir Painel Público
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function AreaDeAcesso() {
  const navigate = useNavigate();
  const { recuperacaoSenha } = useSessao();
  const { sessao, perfil, carregando } = usePerfil();
  const sairDaConta = useSair();
  const [modo, setModo] = useState<Modo>("entrar");

  // Já logado com perfil ativo: vai direto para o sistema.
  useEffect(() => {
    if (recuperacaoSenha || !perfil?.ativo) return;
    const empresaId = rotaInicial(perfil).empresaId;
    if (empresaId) navigate({ to: "/empresas/$companyId", params: { companyId: empresaId } });
    else navigate({ to: "/dashboard" });
  }, [perfil, recuperacaoSenha, navigate]);

  if (!supabaseConfigured) {
    return (
      <Aviso tipo="erro" className="mt-8">
        Banco de dados não conectado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.
      </Aviso>
    );
  }

  if (recuperacaoSenha && sessao) return <NovaSenha />;

  if (carregando || perfil?.ativo) {
    return (
      <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Verificando acesso...
      </div>
    );
  }

  // Logado, mas a conta ainda não foi aprovada.
  if (sessao) {
    return (
      <div className="mt-8 space-y-4">
        <Aviso tipo="info">
          {perfil
            ? "Sua conta foi criada e está aguardando aprovação do administrador do sistema. Você poderá entrar assim que ela for ativada."
            : "Não encontramos o perfil da sua conta. Fale com o administrador do sistema."}
        </Aviso>
        <p className="text-sm text-muted-foreground">
          Conectado como <span className="font-semibold text-foreground">{sessao.user.email}</span>
        </p>
        <Button variant="outline" className="h-11 w-full" onClick={() => sairDaConta()}>
          Sair e usar outra conta
        </Button>
      </div>
    );
  }

  if (modo === "criar") return <CriarConta onVoltar={() => setModo("entrar")} />;
  if (modo === "esqueci") return <EsqueciSenha onVoltar={() => setModo("entrar")} />;
  return <Entrar onCriar={() => setModo("criar")} onEsqueci={() => setModo("esqueci")} />;
}

function Entrar({ onCriar, onEsqueci }: { onCriar: () => void; onEsqueci: () => void }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const valido = email.includes("@") && senha.length > 0;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido) return;
    setEnviando(true);
    setErro(null);
    try {
      await entrar(email, senha);
      // O redirecionamento acontece quando o perfil carregar.
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível entrar.");
      setEnviando(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={enviar}>
      <CampoEmail value={email} onChange={setEmail} />
      <CampoSenha
        id="senha"
        label="Senha"
        value={senha}
        onChange={setSenha}
        autoComplete="current-password"
      />

      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <Button type="submit" size="lg" className="h-11 w-full" disabled={!valido || enviando}>
        {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
        Entrar no sistema
      </Button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onEsqueci}
          className="font-medium text-primary hover:underline"
        >
          Esqueci minha senha
        </button>
        <button
          type="button"
          onClick={onCriar}
          className="font-medium text-primary hover:underline"
        >
          Criar conta
        </button>
      </div>
    </form>
  );
}

function CriarConta({ onVoltar }: { onVoltar: () => void }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmarEmail, setConfirmarEmail] = useState(false);

  const senhasDiferentes = confirmacao.length > 0 && senha !== confirmacao;
  const valido =
    nome.trim().length >= 3 && email.includes("@") && senha.length >= 6 && senha === confirmacao;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido) return;
    setEnviando(true);
    setErro(null);
    try {
      const entrou = await criarConta(nome, email, senha);
      // Se entrou, a tela de "aguardando aprovação" ou o redirecionamento assumem.
      if (!entrou) setConfirmarEmail(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível criar a conta.");
    } finally {
      setEnviando(false);
    }
  }

  if (confirmarEmail) {
    return (
      <div className="mt-8 space-y-4">
        <Aviso tipo="sucesso">
          Conta criada. Enviamos um link de confirmação para <strong>{email}</strong>. Confirme o
          e-mail e depois entre com sua senha. Após confirmar, a conta fica aguardando aprovação do
          administrador.
        </Aviso>
        <Button variant="outline" className="h-11 w-full" onClick={onVoltar}>
          Voltar para o login
        </Button>
      </div>
    );
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={enviar}>
      <Aviso tipo="info">
        Novas contas ficam <strong>aguardando aprovação do administrador</strong>, que define o
        perfil de acesso. A primeira conta criada no sistema torna-se a de administrador.
      </Aviso>

      <div className="space-y-2">
        <Label htmlFor="nome">Nome completo</Label>
        <div className="relative">
          <User className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="h-11 pl-9"
            autoComplete="name"
            placeholder="Seu nome"
          />
        </div>
      </div>
      <CampoEmail value={email} onChange={setEmail} />
      <CampoSenha
        id="nova-senha"
        label="Senha (mínimo 6 caracteres)"
        value={senha}
        onChange={setSenha}
        autoComplete="new-password"
      />
      <CampoSenha
        id="confirmar-senha"
        label="Confirmar senha"
        value={confirmacao}
        onChange={setConfirmacao}
        autoComplete="new-password"
      />
      {senhasDiferentes && <p className="text-xs text-danger">As senhas não conferem.</p>}

      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <Button type="submit" size="lg" className="h-11 w-full" disabled={!valido || enviando}>
        {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
        Criar conta
      </Button>
      <button
        type="button"
        onClick={onVoltar}
        className="w-full text-sm font-medium text-primary hover:underline"
      >
        Já tenho conta — entrar
      </button>
    </form>
  );
}

function EsqueciSenha({ onVoltar }: { onVoltar: () => void }) {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setEnviando(true);
    setErro(null);
    try {
      await recuperarSenha(email);
      setEnviado(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível enviar o e-mail.");
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div className="mt-8 space-y-4">
        <Aviso tipo="sucesso">
          Se houver uma conta com <strong>{email}</strong>, enviamos um link para definir uma nova
          senha. Abra o link neste navegador.
        </Aviso>
        <Button variant="outline" className="h-11 w-full" onClick={onVoltar}>
          Voltar para o login
        </Button>
      </div>
    );
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={enviar}>
      <p className="text-sm text-muted-foreground">
        Informe seu e-mail. Enviaremos um link para você criar uma nova senha.
      </p>
      <CampoEmail value={email} onChange={setEmail} />
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <Button
        type="submit"
        size="lg"
        className="h-11 w-full"
        disabled={!email.includes("@") || enviando}
      >
        {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
        Enviar link de recuperação
      </Button>
      <button
        type="button"
        onClick={onVoltar}
        className="w-full text-sm font-medium text-primary hover:underline"
      >
        Voltar para o login
      </button>
    </form>
  );
}

function NovaSenha() {
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const valido = senha.length >= 6 && senha === confirmacao;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido) return;
    setEnviando(true);
    setErro(null);
    try {
      await definirNovaSenha(senha);
      // Ao sair do modo de recuperação, o usuário segue para o sistema (ou "aguardando aprovação").
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível alterar a senha.");
      setEnviando(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={enviar}>
      <p className="text-sm text-muted-foreground">Defina sua nova senha de acesso.</p>
      <CampoSenha
        id="redefinir-senha"
        label="Nova senha (mínimo 6 caracteres)"
        value={senha}
        onChange={setSenha}
        autoComplete="new-password"
      />
      <CampoSenha
        id="redefinir-confirmacao"
        label="Confirmar nova senha"
        value={confirmacao}
        onChange={setConfirmacao}
        autoComplete="new-password"
      />
      {confirmacao.length > 0 && senha !== confirmacao && (
        <p className="text-xs text-danger">As senhas não conferem.</p>
      )}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <Button type="submit" size="lg" className="h-11 w-full" disabled={!valido || enviando}>
        {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
        Salvar nova senha
      </Button>
    </form>
  );
}

function CampoEmail({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label htmlFor="email">E-mail</Label>
      <div className="relative">
        <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="email"
          type="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 pl-9"
          autoComplete="email"
          placeholder="seu.nome@manhuacu.mg.gov.br"
        />
      </div>
    </div>
  );
}

function CampoSenha({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Lock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type="password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 pl-9"
          autoComplete={autoComplete}
          placeholder="••••••••"
        />
      </div>
    </div>
  );
}

function Aviso({
  tipo,
  children,
  className = "",
}: {
  tipo: "erro" | "info" | "sucesso";
  children: ReactNode;
  className?: string;
}) {
  const estilo = {
    erro: "border-danger/25 bg-danger-soft text-danger",
    info: "border-info/25 bg-info-soft text-info",
    sucesso: "border-success/25 bg-success-soft text-success",
  }[tipo];
  const Icone = tipo === "sucesso" ? CheckCircle2 : AlertCircle;
  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${estilo} ${className}`}
    >
      <Icone className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}
