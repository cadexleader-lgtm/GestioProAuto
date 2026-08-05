import * as React from "react";
import { Input } from "@/components/ui/input";

/**
 * Champ monétaire sûr : saisie texte (chiffres uniquement) avec séparateurs
 * de milliers. Évite les modifications accidentelles par la molette/flèches
 * des inputs type="number".
 */
export function MoneyInput({
  value,
  onChange,
  placeholder,
  className,
  id,
}: {
  value: number | undefined | null;
  onChange: (v: number) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}) {
  const format = (n: number) => (n ? new Intl.NumberFormat("fr-FR").format(n) : "");
  const [text, setText] = React.useState(format(value ?? 0));

  React.useEffect(() => {
    const parsed = Number(text.replace(/\D/g, "")) || 0;
    if (parsed !== (value ?? 0)) setText(format(value ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      className={className}
      placeholder={placeholder ?? "0"}
      value={text}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "");
        const n = Number(digits) || 0;
        setText(digits ? new Intl.NumberFormat("fr-FR").format(n) : "");
        onChange(n);
      }}
      onWheel={(e) => (e.target as HTMLInputElement).blur()}
    />
  );
}
