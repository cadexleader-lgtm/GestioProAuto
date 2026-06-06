## Objectif
Refondre GestioPro en **démo SaaS investisseur** : un seul secteur (Commerce) avec 4 sous-secteurs métiers riches + modules transversaux (Fournisseurs, RH, Dépenses, Trésorerie, Notifications, Documents PDF). Données mock réalistes, design pro inspiré Odoo/Shopify/HubSpot.

## Phase 1 — Refonte architecture (Single Sub-Sector)
- `src/lib/sectors.ts` → supprimer phones, supermarket, insurance, clinic, school, services. Garder **commerce** uniquement avec 4 sous-secteurs : `boutique`, `electromenager`, `vehicules`, `restaurant`.
- Inscription 3 étapes simplifiée : compte → entreprise (nom, tél, adresse, pays) → sous-secteur.
- Sidebar dynamique selon sous-secteur + sections transversales (RH, Fournisseurs, Dépenses, Trésorerie, Documents) toujours visibles.
- Mock-API : étendre pour persister `subSectorId` + générer données fictives riches.

## Phase 2 — Modules transversaux (partagés)
- **Fournisseurs** : liste, dashboard, dettes, commandes, échéances.
- **RH** : employés (photo, poste, salaire), présences, congés, dashboard masse salariale.
- **Dépenses** : 10 catégories, ajout/édition, graphiques répartition.
- **Trésorerie/Caisse** : entrées/sorties, solde, historique.
- **Notifications** : centre unifié (stock faible, dettes, échéances, garanties).
- **Documents** : générateur PDF (facture, proforma, BL, reçu) avec preview + download. Boutons WhatsApp/Email (mock).

## Phase 3 — Sous-secteur Boutique & Magasin
- POS rapide existant + Fournisseurs + Caisse intégrée.

## Phase 4 — Sous-secteur Vente d'Électroménager
- Produits typés (réfrigérateurs, TV, clim…), garanties + SAV, facturation pro (Proforma/Commerciale/BL/Reçu), vente à crédit (échéancier).

## Phase 5 — Sous-secteur Vente de Véhicules
- Fiche véhicule complète (marque/modèle/VIN/plaque/km/carburant), finance (achat+frais+marge), maintenance, documents, vente à crédit, location, **suivi GPS** (carte simulée avec position + trajets fictifs via Leaflet).

## Phase 6 — Sous-secteur Restaurant & Bar Lounge
- Réutiliser modules resto existants (tables, cuisine, menu, commandes) + Réservations + Bar.

## Phase 7 — Design pass
- Palette bleu pro `#2563EB` + blanc + gris clair (remplace Midnight Indigo).
- Dashboard premium : KPI cards animées, recharts, tables shadcn pro.
- Sidebar moderne avec sections groupées.
- Landing/pricing page : refonte ton "ERP africain premium".

## Détails techniques
- **PDF** : `jspdf` + `jspdf-autotable` (déjà compatible Worker, pas de dépendance native).
- **Carte GPS** : `react-leaflet` + OpenStreetMap (gratuit, pas de clé API).
- **Charts** : recharts (déjà installé).
- **Mock data** : seeded faker-like dans `mock-api.tsx`, persisté localStorage.
- **Pas de backend** (Cloud reste off, comme demandé précédemment).

## Volume estimé
~40 nouvelles pages/composants, ~15 nouvelles routes, refonte sectors.ts + mock-api.tsx + Sidebar + Landing. C'est 1 gros run mais réalisable en livrant phase par phase. Je commence par Phases 1+2+7 (fondations + transversaux + design) puis enchaîne les sous-secteurs.
