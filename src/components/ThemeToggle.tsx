import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      className={cn(
        "relative p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors",
        className,
      )}
    >
      <Sun size={20} className={cn("transition-all", isDark ? "scale-0 -rotate-90 absolute" : "scale-100 rotate-0")} />
      <Moon size={20} className={cn("transition-all", isDark ? "scale-100 rotate-0" : "scale-0 rotate-90 absolute")} />
    </button>
  );
}
