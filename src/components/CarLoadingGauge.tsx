import { Car } from "lucide-react";

/**
 * Écran de chargement post-connexion/inscription : une voiture qui "roule"
 * en boucle sur une jauge — remplace le simple spinner générique. Boucle
 * indéterminée (pas de vraie progression disponible à ce stade, juste un
 * état chargé/pas chargé), mais rend l'attente moins aride que le spinner
 * nu qu'elle remplace. Animations définies dans styles.css
 * (.animate-road-car/.animate-road-sweep), désactivées si
 * prefers-reduced-motion.
 */
export function CarLoadingGauge({ label = "Chargement de votre espace…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative w-64 max-w-[70vw]">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-primary/20 via-primary to-primary/20 animate-road-sweep" />
        </div>
        <div className="absolute inset-x-0 -top-[15px] h-4">
          {/* left en fallback statique (prefers-reduced-motion coupe
              l'animation) : centré plutôt que la position de départ hors
              cadre de la boucle animée. */}
          <div className="absolute animate-road-car" style={{ left: "50%" }}>
            <Car size={18} className="text-primary -scale-x-100 drop-shadow-sm" />
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
