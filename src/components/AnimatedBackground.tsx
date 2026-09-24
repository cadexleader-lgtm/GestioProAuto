import bubblesLight from "@/assets/bg-bubbles-light.svg";
import bubblesDark from "@/assets/bg-bubbles-dark.svg";
import silkLight from "@/assets/bg-silk-light.svg";
import silkDark from "@/assets/bg-silk-dark.svg";

const VARIANTS = {
  bubbles: { light: bubblesLight, dark: bubblesDark },
  silk: { light: silkLight, dark: silkDark },
};

/**
 * Fond de page SVG animé, avec une version dédiée par thème (les dégradés
 * d'origine sont pensés pour un fond clair — une bascule via `dark:` seule
 * aurait rendu les tons pastel imprimés dans le SVG incohérents en mode
 * sombre, d'où deux fichiers distincts par variante plutôt qu'un filtre CSS).
 * Purement décoratif (aria-hidden), positionné en absolute derrière le
 * contenu — le parent doit être `relative` et son contenu doit rester
 * au-dessus via un z-index.
 */
export function AnimatedBackground({ variant, className }: { variant: keyof typeof VARIANTS; className?: string }) {
  const { light, dark } = VARIANTS[variant];
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}>
      <img src={light} alt="" className="block dark:hidden w-full h-full object-cover" />
      <img src={dark} alt="" className="hidden dark:block w-full h-full object-cover" />
    </div>
  );
}
