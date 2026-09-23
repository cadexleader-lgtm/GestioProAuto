import { Card, CardContent } from "@/components/ui/card";

/** Écran de blocage réutilisé par les pages réservées à patron/manager (finances). */
export function RestrictedAccess({ title, message = "Accès restreint à votre rôle." }: { title: string; message?: string }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">{title}</h1>
      </div>
      <Card className="border-amber-200 bg-amber-50/60 shadow-sm">
        <CardContent className="p-6 text-sm text-amber-900">{message}</CardContent>
      </Card>
    </div>
  );
}
