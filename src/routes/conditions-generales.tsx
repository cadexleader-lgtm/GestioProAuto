import { createFileRoute } from "@tanstack/react-router";
import { LegalPageShell } from "@/components/LegalPageShell";

export const Route = createFileRoute("/conditions-generales")({
  head: () => ({
    meta: [
      { title: "Conditions générales d'utilisation — GestioPro" },
      { name: "description", content: "Conditions générales d'utilisation et de vente de GestioPro Auto." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPageShell title="Conditions générales d'utilisation et de vente" updatedAt="24 septembre 2026">
      <p className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50/70 dark:bg-amber-950/30 px-4 py-3 text-amber-900 dark:text-amber-300 not-prose text-sm">
        Modèle générique à personnaliser et faire valider par un professionnel du droit avant toute mise en
        production commerciale — notamment les clauses de résiliation, de responsabilité et de droit applicable.
      </p>

      <h2>1. Objet</h2>
      <p>
        Les présentes conditions régissent l'accès et l'utilisation de l'application GestioPro Auto, éditée par
        <strong> [Raison sociale de l'entreprise]</strong>, par toute entreprise cliente ("le Client") et ses
        utilisateurs autorisés.
      </p>

      <h2>2. Abonnement et essai</h2>
      <p>
        GestioPro Auto est proposé sous forme d'abonnement mensuel ou annuel, selon les formules décrites sur la page
        <a href="/#tarifs"> Tarifs</a>. Un accès gratuit limité ("Découverte") peut être proposé sans engagement ni
        moyen de paiement. Le passage à une formule payante n'entraîne aucun prélèvement automatique sans action
        explicite du Client : chaque paiement est initié volontairement par le Client via le moyen proposé dans
        l'application.
      </p>

      <h2>3. Modules et fonctionnalités</h2>
      <p>
        Certains modules (Location, Crédit clients, Ressources humaines, suivi GPS) peuvent être activés ou
        désactivés par le Client selon la formule souscrite. La désactivation d'un module n'entraîne pas la
        suppression des données déjà saisies, sauf demande explicite du Client.
      </p>

      <h2>4. Obligations du Client</h2>
      <ul>
        <li>Fournir des informations exactes lors de la création du compte.</li>
        <li>Assurer la confidentialité des identifiants de connexion de ses utilisateurs.</li>
        <li>Utiliser l'application conformément à son objet (gestion d'une activité automobile) et à la réglementation applicable dans son pays.</li>
        <li>S'acquitter des sommes dues selon la formule d'abonnement choisie.</li>
      </ul>

      <h2>5. Disponibilité et support</h2>
      <p>
        [Raison sociale de l'entreprise] met en œuvre des moyens raisonnables pour assurer la disponibilité du
        service, sans garantie de disponibilité continue (maintenance, incidents techniques indépendants de sa
        volonté). Le support est assuré selon les modalités décrites dans la formule d'abonnement souscrite.
      </p>

      <h2>6. Résiliation</h2>
      <p>
        Le Client peut résilier son abonnement à tout moment depuis les paramètres de son compte, effective à la fin
        de la période déjà payée. En cas de non-paiement, l'accès peut être restreint (lecture seule) après un délai
        de grâce, puis suspendu, sans suppression immédiate des données.
      </p>

      <h2>7. Propriété des données</h2>
      <p>
        Les données saisies par le Client (véhicules, ventes, clients, documents) lui appartiennent. [Raison sociale
        de l'entreprise] agit en qualité de sous-traitant technique pour l'hébergement et le traitement de ces
        données, conformément à la <a href="/politique-de-confidentialite">politique de confidentialité</a>.
      </p>

      <h2>8. Limitation de responsabilité</h2>
      <p>
        [Raison sociale de l'entreprise] ne saurait être tenue responsable des conséquences d'une erreur de saisie,
        d'une mauvaise utilisation de l'application, ou d'une décision de gestion prise sur la base des informations
        qu'elle contient.
      </p>

      <h2>9. Droit applicable</h2>
      <p>Les présentes conditions sont régies par le droit [pays du siège de l'entreprise éditrice].</p>

      <h2>10. Contact</h2>
      <p>Pour toute question : cadexleader@gmail.com.</p>
    </LegalPageShell>
  );
}
