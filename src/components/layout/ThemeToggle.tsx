import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/** Chave do tema no localStorage (o script em __root aplica antes da pintura). */
export const CHAVE_TEMA = "sisrodov-tema";

function lerTemaEscuro() {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

/** Alterna claro/escuro (classe `.dark` no <html>) e lembra a escolha. */
export function ThemeToggle({ className }: { className?: string }) {
  // No servidor sempre "claro"; sincroniza com a classe real após montar.
  const [escuro, setEscuro] = useState(false);
  useEffect(() => setEscuro(lerTemaEscuro()), []);

  const alternar = () => {
    const proximo = !escuro;
    document.documentElement.classList.toggle("dark", proximo);
    try {
      localStorage.setItem(CHAVE_TEMA, proximo ? "dark" : "light");
    } catch {
      /* armazenamento indisponível: vale só nesta visita */
    }
    setEscuro(proximo);
  };

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={escuro ? "Ativar modo claro" : "Ativar modo escuro"}
      title={escuro ? "Modo claro" : "Modo escuro"}
      className={cn(
        "relative grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.06] max-md:h-11 max-md:w-11",
        className,
      )}
    >
      <Sun className="h-[1.125rem] w-[1.125rem] scale-100 rotate-0 transition-transform duration-300 dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute h-[1.125rem] w-[1.125rem] scale-0 rotate-90 transition-transform duration-300 dark:scale-100 dark:rotate-0" />
    </button>
  );
}
