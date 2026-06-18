## Refonte complète du module Automobile — GestioPro

Objectif : transformer le module auto en un mini-ERP synchronisé (parc, location, vente, crédit, maintenance) avec design SaaS premium, mobile-first et glassmorphism.

> ⚠️ Travail très volumineux. Je propose de le livrer en **5 phases** pour garder la qualité et permettre validation à chaque étape. Vous validez la phase 1 avant que je passe à la suivante.

---

### Phase 1 — Fondations & synchronisation (cœur du système)

**Store unifié `vehicles` (déjà dans `demo-store`)** étendu avec champs :
- `image` (DataURL upload), `purchasePrice`, `notes`, `currentRentalId`, `currentMaintenanceId`
- Statuts : `available | rented | sold | maintenance`
- Helpers centralisés : `setVehicleStatus(id, status, meta)` qui propage partout

**Nouvelles collections :**
- `maintenances` (vehicleId, motif, type, garage, priorité, dateIn, dateOut, statut, dépenses[])
- `vehiclePayments` (creditId, montant, date, méthode) — pour suivi crédit
- Extension `rentals` : client complet (tel, adresse, pièce, permis), heures, caution, avance, photos avant/après, kmRetour, carburant, état

**Effets de synchronisation automatiques** (dans `demo-store`) :
- Créer location → véhicule passe `rented`
- Retour location → véhicule passe `available` + historique conservé
- Créer vente → véhicule `sold` + ligne `sales`
- Maintenance ouverte → `maintenance` ; clôturée → `available`
- Paiement crédit → recalcul `paid/remaining/status`

---

### Phase 2 — Parc de véhicules (page principale)

- Header dashboard : cards KPI (total, dispo, loués, vendus, maintenance, **valeur totale stock**)
- Filtres par statut + recherche
- Cards modernes glassmorphism, **2 colonnes mobile**, image upload, badge statut, prix
- Menu d'actions par card : Louer / Vendre / Maintenance / Modifier / Voir fiche
- Animations `motion` (fade, hover scale)
- **Fiche détaillée** (Sheet plein écran) : image, infos, **onglets Historique / Locations / Ventes / Maintenances / Rentabilité**
- **Rentabilité par véhicule** : achat / revenus location / revenus vente / coût maintenance / **profit net**

---

### Phase 3 — Vente & Vente à crédit

- Page Ventes véhicules : liste + nouvelle vente (cash ou crédit)
- Module Crédit refondu : popup glassmorphism avec
  - Infos contrat, échéancier, **historique paiements**, **ajout paiement**, modification échéance, statut temps réel
- Synchro auto : chaque paiement met à jour reste/statut/dashboard

---

### Phase 4 — Location avancée

- Modal "Louer" en 3 étapes : Client / Location / Financier (avec calcul auto total/reste)
- Statuts : Réservé / En cours / Retourné / En retard / Annulé
- Modal "Retour véhicule" : date réelle, km, carburant, état, observations
- **Détection auto des retards** + badge alerte dashboard
- Onglet historique par véhicule
- Dashboard location : KPI jour + mois (revenus, véhicule le + loué, client le + actif)

---

### Phase 5 — Maintenance + Contrats PDF

- Nouvelle page **Maintenance** : liste + création + statuts + dépenses (pièces, main-d'œuvre)
- Historique maintenance par véhicule
- Synchro : entrée maintenance → indisponible vente/location
- **Génération PDF** (jspdf) : contrat location, bon de vente, facture, contrat crédit avec échéancier, reçu paiement
- Bouton "Générer PDF" sur chaque entité concernée

---

### Hors scope (sera proposé après si souhaité)

- **WhatsApp** : nécessite intégration API tierce (Twilio/Meta Business) + secrets + edge function. Je le préparerai séparément après validation des phases 1-5.
- **Signature électronique** : composant `react-signature-canvas` ajouté en phase 5 si temps.
- **Vrai upload cloud** : pour la démo, images stockées en DataURL (localStorage). Migration vers Supabase Storage possible plus tard.
- Calendrier réservations : prévu en bonus phase 4 si possible.

---

### Stack technique

- Données : `useCollection` / `demo-store` (localStorage) — pas de migration DB nécessaire pour la démo
- UI : shadcn (Dialog/Sheet/Tabs/Select) + Tailwind + glassmorphism (`backdrop-blur` + `bg-white/60`)
- Animations : `framer-motion` (déjà à ajouter)
- PDF : `jspdf` + `jspdf-autotable`
- Mobile-first : grilles `grid-cols-2 lg:grid-cols-4`

---

### Démarrage

Je commence par la **Phase 1 + Phase 2** dans la prochaine itération (fondations + parc redesigné avec fiche détaillée et rentabilité), puis vous validez avant Phase 3.

Confirmez-vous ce découpage ? Souhaitez-vous réordonner ou retirer des éléments ?
