import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bus, Lock, Mail, ShieldCheck, MonitorPlay } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PrefeituraLogo, RodoviariaLogo, SisRodovLogo } from "@/components/brand/Logos";

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

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("carlos.henrique@manhuacu.demo");
  const [password, setPassword] = useState("demonstracao");

  const valid = email.includes("@") && password.length >= 4;

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
            <h1 className="font-display text-3xl font-extrabold tracking-tight">SisRodov Manhuaçu</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sistema Municipal de Gestão e Controle do Terminal Rodoviário
            </p>
          </div>

          <form
            className="mt-8 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) navigate({ to: "/dashboard" });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 pl-9"
                  placeholder="seu.nome@manhuacu.mg.gov.br"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="senha"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pl-9"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="lembrar" defaultChecked />
              <Label htmlFor="lembrar" className="text-sm font-normal">
                Lembrar acesso
              </Label>
            </div>

            <Button type="submit" size="lg" className="h-11 w-full" disabled={!valid}>
              Entrar no sistema
            </Button>
          </form>

          <div className="mt-8 flex items-center justify-between text-xs text-muted-foreground">
            <span className="rounded-full border border-border px-2.5 py-1 font-semibold">
              Ambiente demonstrativo
            </span>
            <Link to="/painel" className="font-semibold text-primary hover:underline">
              Abrir Painel Público
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
