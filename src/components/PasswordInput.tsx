import { useState } from "react";
import { Eye, EyeOff, Check, X } from "lucide-react";

const PASSWORD_RULES: { test: (v: string) => boolean; label: string }[] = [
  { test: (v) => v.length >= 8, label: "8 caractères min." },
  { test: (v) => /[a-z]/.test(v), label: "1 minuscule" },
  { test: (v) => /[A-Z]/.test(v), label: "1 majuscule" },
  { test: (v) => /[0-9]/.test(v), label: "1 chiffre" },
  { test: (v) => /[^A-Za-z0-9]/.test(v), label: "1 caractère spécial" },
];

/** Retour visuel de force du mot de passe — informatif uniquement, ne bloque
 * pas la soumission (seule la longueur minimale est réellement imposée). */
export function PasswordStrengthMeter({ value }: { value: string }) {
  if (!value) return null;
  const passed = PASSWORD_RULES.filter((r) => r.test(value)).length;
  const barColor = passed <= 2 ? "bg-rose-500" : passed <= 4 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {PASSWORD_RULES.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < passed ? barColor : "bg-muted"}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {PASSWORD_RULES.map((r) => {
          const ok = r.test(value);
          return (
            <span key={r.label} className={`inline-flex items-center gap-1 text-[11px] ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
              {ok ? <Check size={11} /> : <X size={11} className="opacity-40" />}
              {r.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function PasswordInput({
  id, value, onChange, placeholder, autoComplete, bg = "bg-card",
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  bg?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border border-border ${bg} px-4 py-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
