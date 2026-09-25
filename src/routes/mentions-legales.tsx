import { createFileRoute } from "@tanstack/react-router";
import { LegalPageShell } from "@/components/LegalPageShell";

export const Route = createFileRoute("/mentions-legales")({
  head: () => ({
    meta: [
      { title: "Mentions légales — GestioAuto" },
      { name: "description", content: "Mentions légales de GestioAuto." },
    ],
  }),
  component: MentionsLegalesPage,
});

function MentionsLegalesPage() {
  return (
    <LegalPageShell title="Mentions légales" updatedAt="24 septembre 2026">
      <p className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50/70 dark:bg-amber-950/30 px-4 py-3 text-amber-900 dark:text-amber-300 not-prose text-sm">
        Modèle générique à personnaliser : remplacez les champs entre crochets par les informations réelles de votre
        entreprise avant publication, et faites relire ce document par un professionnel du droit dans votre pays
        d'exploitation (les obligations diffèrent selon le Bénin, la Côte d'Ivoire, le Sénégal, etc.).
      </p>

      <h2>Éditeur du site</h2>
      <p>
        Le présent site et l'application GestioAuto sont édités par <strong>[Raison sociale de l'entreprise]</strong>,
        [forme juridique — ex. SARL, SAS, entreprise individuelle], immatriculée sous le numéro RCCM [numéro RCCM],
        dont le siège social est situé [adresse complète], [ville], [pays].
      </p>
      <ul>
        <li>Numéro d'identification fiscale (IFU ou équivalent local) : [numéro]</li>
        <li>Capital social (le cas échéant) : [montant] FCFA</li>
        <li>Téléphone : +229 01 56 50 13 48 / +229 01 41 82 27 30</li>
        <li>Email de contact : cadexleader@gmail.com</li>
        <li>Directeur de la publication : HAZOUME Clarence Akuègnon Alvin, fondateur</li>
      </ul>

      <h2>Hébergement</h2>
      <p>
        L'application est hébergée par Cloudflare, Inc. (infrastructure) et Supabase, Inc. (base de données et
        authentification). Ces prestataires peuvent traiter des données en dehors du pays d'exploitation de
        l'entreprise éditrice — voir la <a href="/politique-de-confidentialite">politique de confidentialité</a> pour
        le détail des transferts de données.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L'ensemble des éléments du site et de l'application (textes, logos, interface, code source) est la propriété
        de [Raison sociale de l'entreprise] ou de ses concédants, sauf mention contraire. Toute reproduction ou
        représentation, totale ou partielle, sans autorisation préalable est interdite.
      </p>

      <h2>Responsabilité</h2>
      <p>
        GestioAuto est un outil de gestion mis à disposition des entreprises clientes. L'exactitude des données
        saisies (ventes, crédits, stocks, informations véhicules) relève de la responsabilité de l'entreprise
        utilisatrice. [Raison sociale de l'entreprise] met en œuvre des moyens raisonnables pour assurer la
        disponibilité et la sécurité du service, sans garantie de disponibilité absolue.
      </p>

      <h2>Contact</h2>
      <p>Pour toute question relative à ces mentions légales : cadexleader@gmail.com.</p>
    </LegalPageShell>
  );
}
