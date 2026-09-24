import { HelpCircle, Mail, MessageCircle, Phone, ShoppingCart, CreditCard, KeyRound, Wrench, Users2, FileText, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface Faq {
  icon: React.ReactNode;
  question: string;
  answer: string;
}

const FAQS: Faq[] = [
  {
    icon: <ShoppingCart size={16} />,
    question: "Comment vendre un véhicule (cash) ?",
    answer:
      "Depuis Ventes, cliquez sur « Nouvelle vente », choisissez le véhicule et le client, puis suivez le déroulé de vente (documents, paiement, livraison). Une fois le paiement cash confirmé, la vente est enregistrée de façon définitive : véhicule marqué vendu, encaissement en trésorerie et écriture au journal comptable.",
  },
  {
    icon: <CreditCard size={16} />,
    question: "Comment gérer une vente à crédit ?",
    answer:
      "Depuis Ventes à crédit, créez un nouveau crédit en renseignant l'apport initial, la mensualité et la durée. Les paiements suivants se saisissent depuis la fiche du crédit (bouton « Enregistrer un paiement ») : chaque paiement met à jour l'encours restant et la trésorerie automatiquement.",
  },
  {
    icon: <KeyRound size={16} />,
    question: "Comment louer un véhicule et enregistrer son retour ?",
    answer:
      "Depuis Locations, créez une nouvelle location en indiquant le client, les dates et le tarif journalier. Les paiements se saisissent au fil de l'eau. Au retour du véhicule, utilisez « Clôturer la location » pour enregistrer le kilométrage de retour et l'état du véhicule — le véhicule redevient disponible.",
  },
  {
    icon: <Wrench size={16} />,
    question: "Comment ouvrir et clôturer une maintenance ?",
    answer:
      "Depuis Maintenance, ouvrez une intervention en précisant le motif et le garage. Le véhicule passe alors « en atelier » et n'est plus disponible à la vente ou à la location. À la clôture, renseignez les coûts (pièces, main d'œuvre, autres) : ils remontent automatiquement dans la rentabilité du véhicule.",
  },
  {
    icon: <Wallet size={16} />,
    question: "Comment payer un salaire ?",
    answer:
      "Depuis Personnel, utilisez « Payer salaire » pour un employé isolé, ou « Paie du mois » pour traiter en une fois tous les employés non encore payés ce mois-ci. Chaque paiement génère automatiquement un bulletin PDF archivé dans Documents et une écriture de trésorerie.",
  },
  {
    icon: <Users2 size={16} />,
    question: "Comment ajouter un membre de mon équipe ?",
    answer:
      "Depuis Paramètres → Équipe (accès Patron uniquement), cliquez sur « Ajouter un membre ». Un compte est créé avec un mot de passe temporaire à communiquer à la personne ; elle pourra le changer à sa première connexion.",
  },
  {
    icon: <FileText size={16} />,
    question: "Où retrouver mes factures, reçus et bulletins ?",
    answer:
      "Tous les documents générés (factures, reçus, contrats, bulletins de paie…) sont archivés dans Documents, avec aperçu et téléchargement. Les bulletins de paie y sont visibles uniquement par les rôles Patron et Manager.",
  },
  {
    icon: <HelpCircle size={16} />,
    question: "Quelle est la différence entre les rôles Patron, Manager et Terrain ?",
    answer:
      "Patron a accès à tout, y compris les finances, les suppressions et les paramètres. Manager gère les opérations quotidiennes (ventes, locations, crédits, paie) sans accès à la purge de données ni aux paramètres d'entreprise. Terrain consulte et saisit (véhicules, maintenance, locations en lecture) sans aucun accès aux données financières.",
  },
];

export function Aide() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Aide & Support</h1>
        <p className="text-muted-foreground mt-1">
          Questions fréquentes sur les modules de GestioPro Auto et comment nous contacter.
        </p>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-6">
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger>
                  <span className="flex items-center gap-2.5 text-left">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      {faq.icon}
                    </span>
                    {faq.question}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground pl-9 leading-relaxed">{faq.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="p-6 space-y-3">
          <h2 className="font-display font-bold flex items-center gap-2">
            <MessageCircle size={18} className="text-primary" /> Besoin d'aide supplémentaire ?
          </h2>
          <p className="text-sm text-muted-foreground">
            Notre équipe n'est pas encore joignable directement depuis l'application. En attendant,
            contactez votre référent GestioPro :
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <a
              href="mailto:cadexleader@gmail.com"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              <Mail size={16} /> cadexleader@gmail.com
            </a>
            <a
              href="https://wa.me/2290141822730"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              <MessageCircle size={16} /> +229 01 41 82 27 30
            </a>
            <a
              href="tel:+2290141822730"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              <Phone size={16} /> Appeler
            </a>
          </div>
          <p className="text-xs text-muted-foreground/70 pt-1">
            Également joignable au +229 01 56 50 13 48 (appel ou WhatsApp).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
