import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import logoIcon from "@/assets/gestiopro-icon.webp";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AnimatedBackground } from "@/components/AnimatedBackground";

export function LegalPageShell({ title, updatedAt, children }: { title: string; updatedAt: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen font-sans text-foreground">
      <div className="fixed inset-0 -z-10"><AnimatedBackground variant="bubbles" /></div>

      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoIcon} alt="GestioPro" className="h-8 w-8 rounded-lg shadow-sm" />
            <span className="font-display text-lg font-bold text-foreground">GestioPro</span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link to="/" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              <ArrowLeft size={14} /> Retour
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="rounded-3xl border border-border bg-card/85 backdrop-blur-md p-6 sm:p-10 shadow-sm">
          <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Dernière mise à jour : {updatedAt}</p>
          <div className="prose prose-sm sm:prose-base prose-neutral dark:prose-invert mt-8 max-w-none prose-headings:font-display prose-headings:font-bold prose-a:text-primary">
            {children}
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} GestioPro · L'ERP des PME africaines
      </footer>
    </div>
  );
}
