import { useGetCompany, useUpdateCompany, useListSectors, getGetCompanyQueryKey } from "@workspace/api-client-react";
import { useLocation } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, Sprout, Stethoscope, UtensilsCrossed, GraduationCap, Truck, HardHat, BedDouble, Briefcase, Hammer } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const iconMap: Record<string, React.ElementType> = {
  ShoppingCart, Sprout, Stethoscope, UtensilsCrossed, GraduationCap, Truck, HardHat, BedDouble, Briefcase, Hammer
};

export function Onboarding() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: company, isLoading: isLoadingCompany } = useGetCompany();
  const { data: sectors, isLoading: isLoadingSectors } = useListSectors();
  const updateCompany = useUpdateCompany();
  
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  useEffect(() => {
    if (company && company.sectorId) {
      setLocation("/");
    }
  }, [company, setLocation]);

  if (isLoadingCompany || isLoadingSectors) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  const handleComplete = async () => {
    if (!selectedSector) return;
    try {
      await updateCompany.mutateAsync({ data: { sectorId: selectedSector } });
      queryClient.invalidateQueries({ queryKey: getGetCompanyQueryKey() });
      toast.success("Secteur configuré avec succès !");
      setLocation("/");
    } catch (error) {
      toast.error("Erreur lors de la configuration du secteur.");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-4">
      {/* Background blobs for depth */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-[40%] -left-[10%] w-[50%] h-[50%] rounded-full bg-accent/5 blur-[100px]" />
      </div>

      <div className="w-full max-w-4xl z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground font-bold text-3xl mb-6 shadow-lg">
            G
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-3">
            Bienvenue sur GestioPro
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Pour personnaliser votre expérience, veuillez sélectionner votre secteur d'activité principal.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
          {sectors?.map((sector, index) => {
            const Icon = iconMap[sector.icon] || Briefcase;
            const isSelected = selectedSector === sector.id;
            return (
              <motion.div 
                key={sector.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className={`cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md ${isSelected ? 'border-primary ring-1 ring-primary bg-primary/5' : 'hover:border-primary/30'}`}
                  onClick={() => setSelectedSector(sector.id)}
                >
                  <CardContent className="flex flex-col items-center justify-center p-6 text-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      <Icon size={24} />
                    </div>
                    <span className={`font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>{sector.name}</span>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="flex justify-center">
          <Button 
            size="lg" 
            onClick={handleComplete} 
            disabled={!selectedSector || updateCompany.isPending}
            className="px-12 rounded-full text-base"
          >
            {updateCompany.isPending ? "Configuration..." : "Continuer"}
          </Button>
        </div>
      </div>
    </div>
  );
}