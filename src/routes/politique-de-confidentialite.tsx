import { createFileRoute } from "@tanstack/react-router";
import { LegalPageShell } from "@/components/LegalPageShell";

export const Route = createFileRoute("/politique-de-confidentialite")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — GestioPro" },
      { name: "description", content: "Comment GestioPro Auto collecte, utilise et protège vos données." },
    ],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="Politique de confidentialité" updatedAt="24 septembre 2026">
      <p className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50/70 dark:bg-amber-950/30 px-4 py-3 text-amber-900 dark:text-amber-300 not-prose text-sm">
        Modèle générique à personnaliser et faire valider par un professionnel du droit, notamment au regard des
        règles locales de protection des données (ex. loi n°2017-20 portant code du numérique en République du
        Bénin) et, le cas échéant, du RGPD si des utilisateurs européens sont concernés.
      </p>

      <h2>1. Qui sommes-nous</h2>
      <p>
        GestioPro Auto est un logiciel de gestion (ERP) destiné aux concessionnaires et loueurs de véhicules, édité
        par <strong>[Raison sociale de l'entreprise]</strong> — voir les <a href="/mentions-legales">mentions
        légales</a> pour les coordonnées complètes.
      </p>

      <h2>2. Données que nous collectons</h2>
      <ul>
        <li><strong>Compte utilisateur</strong> : nom, email, téléphone, mot de passe (chiffré, jamais stocké en clair).</li>
        <li><strong>Données de l'entreprise cliente</strong> : véhicules, ventes, crédits, locations, employés, fournisseurs, documents et mouvements financiers saisis par l'entreprise utilisatrice de l'application.</li>
        <li><strong>Position GPS</strong> : uniquement pour les véhicules équipés d'un traceur explicitement associé par l'entreprise, ou saisis manuellement — jamais de suivi de position sans action explicite d'un utilisateur autorisé.</li>
        <li><strong>Données techniques</strong> : journaux de connexion, type d'appareil, adresse IP, à des fins de sécurité et de diagnostic.</li>
      </ul>

      <h2>3. Pourquoi nous les utilisons</h2>
      <p>
        Ces données servent exclusivement à faire fonctionner le service pour l'entreprise cliente qui les a saisies :
        gestion du parc automobile, comptabilité interne, alertes d'échéances, facturation de l'abonnement GestioPro.
        Elles ne sont jamais vendues à des tiers.
      </p>

      <h2>4. Qui peut voir vos données</h2>
      <p>
        Les données d'une entreprise cliente sont strictement cloisonnées : seuls les membres de cette entreprise, selon
        leur rôle (Patron, Manager, Terrain), y accèdent. [Raison sociale de l'entreprise] et ses prestataires
        techniques (hébergement, base de données) peuvent y accéder uniquement à des fins de maintenance, de support
        ou d'obligation légale.
      </p>

      <h2>5. Sous-traitants et hébergement</h2>
      <p>
        L'hébergement applicatif est assuré par Cloudflare, Inc. et la base de données/authentification par Supabase,
        Inc. Ces prestataires peuvent traiter des données hors du pays d'exploitation de l'entreprise cliente, dans le
        cadre de leurs propres engagements de sécurité et de conformité.
      </p>

      <h2>6. Conservation des données</h2>
      <p>
        Les données sont conservées pendant la durée de la relation contractuelle avec l'entreprise cliente, puis
        archivées ou supprimées conformément aux obligations légales de conservation (notamment comptables et
        fiscales) applicables dans le pays d'exploitation.
      </p>

      <h2>7. Vos droits</h2>
      <p>
        Selon la réglementation applicable, vous pouvez disposer d'un droit d'accès, de rectification, d'opposition et
        de suppression de vos données personnelles. Toute demande peut être adressée à [email de contact] ; elle est
        traitée après vérification de l'identité du demandeur et, pour les données saisies par une entreprise, en
        coordination avec le patron/administrateur de cette entreprise.
      </p>

      <h2>8. Cookies et stockage local</h2>
      <p>
        L'application utilise le stockage local du navigateur (session de connexion, préférence de thème clair/sombre,
        préférence d'alertes sonores) strictement nécessaire à son fonctionnement — pas de cookie publicitaire ni de
        traceur tiers à des fins de suivi commercial.
      </p>

      <h2>9. Contact</h2>
      <p>Pour toute question relative à cette politique : [email de contact].</p>
    </LegalPageShell>
  );
}
