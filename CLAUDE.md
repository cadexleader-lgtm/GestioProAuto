# CLAUDE.md — Carte de référence GestioProAuto

> **Règle de travail** : consulte CE FICHIER en premier pour localiser les fichiers concernés par une tâche. N'explore le reste du dépôt que si la carte ne suffit pas — et dans ce cas, complète la carte après coup. Pas d'exploration "au cas où".

## Vision

**Décision stratégique (2026-09-21) : pivot mono-secteur — exécutée (2026-09-24, commit `f1d59e0`).** GestioProAuto n'est plus une app multi-secteur — c'est un **ERP automobile dédié**, exclusivement. Boutique/Électroménager/Restaurant ont été **entièrement supprimés** du code (pas juste masqués — voir roadmap items 15-16) ; seules les tables Postgres correspondantes restent en base, orphelines, en attendant une validation explicite avant suppression. Cible : PME automobiles au Bénin, puis Afrique. Ambition produit : un ERP au niveau de finition et de confiance d'un produit **Apple** — design system unique, pas un "template IA générique". Multi-tenant strict par `company_id`, 3 rôles (`patron` > `manager` > `terrain`).

## Stack

- Frontend : React 19 + TypeScript, **TanStack Router/Start** (pas React Router), Vite 7, Tailwind 4, shadcn/Radix, react-hook-form + zod, TanStack Query, jsPDF.
- Backend : pas d'API custom, pas d'Edge Functions. Logique serveur = **RPC Postgres** (`SECURITY DEFINER`) + RLS.
- DB : Supabase Postgres. Deux familles de tables : générique `jsonb` (majorité) et typées strictes (`companies`, `profiles`, `company_members`, `ledger_entries`).
- Auth : Supabase Auth, session en localStorage, JWT validé côté serveur pour les server functions.
- Storage : bucket privé `company-documents` (documents RH/financiers, lecture manager+) + bucket public `vehicle-photos` (photos de couverture véhicule, visibles par tous les rôles — voir roadmap item 14).
- Déploiement : Cloudflare/Nitro (`.wrangler/`, `.output/`).

## 1. Structure du projet

```
src/
  routes/            TanStack Router — 1 fichier = 1 route. app.tsx = layout + guard auth (client-only).
  pages/
    vehicules/        Secteur Auto — LE seul secteur métier de l'app
    cross/            Pages transverses : Dépenses, Trésorerie, Documents, Fournisseurs, Personnel
    Dashboard.tsx      Rend directement VehiculesDashboard (plus de routage multi-secteur)
    Settings.tsx       Paramètres entreprise (plus de sélecteur de secteur — un seul existe)
  components/
    vehicles/          Dialogues métier auto (vente, crédit, location, maintenance)
    forms/             Dialogues métier transverses (Finance, RH, Fournisseurs) + SectorDialogs.tsx (VehicleDialog)
    layout/            AppShell, Sidebar, Topbar, MobileBottomNav
    analytics/         RevenueEvolutionChart (graphe CA/Dépenses)
    settings/, pwa/    TeamCard, CompanyBrandingCard, PWA install
    ui/                shadcn — ne pas modifier sans raison (généré)
  lib/
    demo-store.ts      ⭐ CŒUR DE L'APP. Store réactif + toutes les fonctions d'écriture (RPC). Voir §2.
    tenant.ts           Session multi-tenant (company, role) — useTenant()
    roles.ts            can(role, action) — permissions fines, branchées partout (cf. roadmap Phase 1)
    sectors.ts           Un seul sous-secteur (`vehicules`) — structure conservée pour les menus (CROSS_MODULES + metierModules), pas pour du multi-secteur
    mock-api.tsx         Alias tsconfig `@workspace/api-client-react` — ne garde que useGetCompany/useUpdateCompany/useListSectors (real data, pas du mock malgré le nom de fichier)
    format.ts, company-profile.ts, demo-data.ts   Data/format helpers
    pdf/engine.ts, pdf/templates.ts   Génération PDF (factures, contrats, reçus, bulletins)
    vehicle-pdf.ts       PDF spécifiques véhicule
  integrations/supabase/
    client.ts            Client Supabase navigateur
    client.server.ts     Client service_role — SERVEUR UNIQUEMENT, ne jamais importer côté client
    auth-middleware.ts   requireSupabaseAuth() — valide le JWT pour les server functions
    auth-attacher.ts      Attache le bearer token aux appels serveur côté client
    types.ts              Types générés Supabase (peuvent être en retard sur le schéma réel)
supabase/migrations/    Migrations SQL, chronologiques. Voir §2 pour la lecture des flux financiers.
```

**Secteurs legacy retirés (2026-09-24, commit `f1d59e0`)** : Boutique/Électroménager/Restaurant n'existent plus dans `src/` — ni pages, ni routes, ni dialogues, ni data layer. Ne pas chercher `pages/restaurant/`, `pages/electromenager/`, `Sales.tsx`, `Stock.tsx`, `Categories.tsx`, `Customers.tsx`, `Reports.tsx`, `commerce-data.ts`, `categories-data.ts` — ils ont été supprimés intentionnellement, pas oubliés. Les tables Postgres correspondantes (`appliances`, `warranties`, `pro_invoices`, `appliance_credits`, `products`, `customers`, `sales`, `categories`, `dishes`, `resto_tables`, `orders`, `reservations`) existent encore en base mais sont orphelines (aucun code ne les lit/écrit) — suppression en attente d'une validation explicite séparée.

### Fichiers clés (résumé une ligne)

| Fichier | Rôle |
|---|---|
| `src/lib/demo-store.ts` | Store de toutes les collections + fonctions RPC-backed (`recordVehicleCashSale`, `recordManualExpense`, etc.) |
| `src/lib/tenant.ts` | Session courante : `useTenant()`, `company`, `role`, `roleAtLeast()` |
| `src/lib/roles.ts` | `can(role, action)` — permissions fines, branchées dans toute l'UI (Phase 1 terminée) |
| `src/lib/sectors.ts` | Un seul sous-secteur (`vehicules`) — structure conservée pour les menus |
| `src/routes/app.tsx` | Layout `/app/*`, garde d'auth **client-only** (`beforeLoad` → redirect si pas de session) |
| `src/integrations/supabase/auth-middleware.ts` | Vraie barrière serveur : valide le JWT sur les server functions |
| `src/pages/cross/Documents.tsx` | Centre documentaire (items 6, 13 terminés — voir roadmap) |
| `src/pages/cross/Tresorerie.tsx` + `src/components/forms/FinanceDialogs.tsx` | Journal de caisse |
| `src/pages/cross/Depenses.tsx` | Journal des dépenses |
| `src/lib/demo-store.ts` (`signedRevenueInRange`, `cashFlowInRange`, `rentalContractedAmount`, `creditOutstandingTotal`, `creditPaymentsInRange`) | Source unique CA signé / trésorerie réelle / encours crédit — utilisée par `VehiculesDashboard.tsx` et `VehiculesRapports.tsx` (item 17 terminé) |
| `src/lib/demo-store.ts:vehicleProfitability()` | Source UNIQUE de la rentabilité véhicule (bien utilisée partout où affichée) |
| `supabase/migrations/20260904153136_add_ledger_entries.sql` | Schéma du ledger central |

## 2. Carte fonctionnelle

### Pattern général d'une opération financière (le comprendre avant de toucher à une seule fonction)

```
UI (page/dialog) → fonction dans demo-store.ts → sb.rpc("record_xxx", ...)
                                                        ↓
                                    RPC Postgres (SECURITY DEFINER, migration dédiée)
                                    - vérifie rôle (company_role_at_least)
                                    - vérifie idempotency_key (ON CONFLICT DO NOTHING)
                                    - INSERT ledger_entries + table métier + cash_movements (1 transaction)
                                        ↓
                              demo-store.ts fait db.upsertLocal(...) sur le retour (local only, pas de write)
```

Modifier une RPC = modifier la migration SQL correspondante (nouvelle migration, jamais éditer une migration déjà appliquée) **et** la fonction wrapper dans `demo-store.ts`.

### Flux financiers → fichiers concernés

| Flux | UI | Fonction demo-store | RPC / migration |
|---|---|---|---|
| Dépense manuelle | `pages/cross/Depenses.tsx` + `components/forms/FinanceDialogs.ExpenseDialog` | `recordManualExpense` | `record_manual_expense` (dernière version : `20260907141500_harden_vehicle_cash_sale_writes.sql`) |
| Mouvement de caisse manuel (entrée/sortie) | `pages/cross/Tresorerie.tsx` + `components/forms/FinanceDialogs.CashMovementDialog` | `recordCashMovement` | `record_cash_movement` (`20260921120000_add_record_cash_movement_rpc.sql`) |
| Virement entre caisses | idem | `recordCashTransfer` | `record_cash_transfer` (même migration, transaction atomique out+in) |
| Vente véhicule cash | `pages/vehicules/VehiculesVentes.tsx` + `components/vehicles/SaleWorkflowDialog.tsx` | `recordVehicleCashSale` | `20260907160600_finalize_vehicle_cash_sale.sql` |
| Vente véhicule crédit | idem + `components/vehicles/NewCreditSaleDialog.tsx` | `recordVehicleCreditSale` | `20260908110000_add_record_vehicle_credit_sale_rpc.sql` |
| Paiement crédit | `pages/vehicules/VehiculesCredits.tsx` + `VehicleActionsDialogs.CreditPaymentDialog` | `addVehicleCreditPayment` | `20260908153000_add_record_vehicle_credit_payment_rpc.sql` |
| Location (création/paiement/retour) | `pages/vehicules/VehiculesLocations.tsx` + `VehicleActionsDialogs.tsx` | `startRental` / `recordRentalPayment` / `recordVehicleRentalReturn` | `20260908174100_*`, `20260909084300_*`, `20260909093800_*` |
| Paie individuelle | `pages/cross/Personnel.tsx` + `components/forms/HrDialogs.PayrollDialog` | `recordPayrollPayment` (sync `payslip → expense → ledger → cash → document`) | `20260909114000_add_record_payroll_payment_rpc.sql` |
| Clôture maintenance | `pages/vehicules/VehiculesMaintenance.tsx` + `VehicleActionsDialogs.tsx` | `completeVehicleMaintenance` | `20260916100000_add_complete_vehicle_maintenance_rpc.sql` |
| Ouverture maintenance | idem | `openVehicleMaintenance` | `open_vehicle_maintenance` (`20260921130000_add_maintenance_lifecycle_rpc.sql`) |
| Mise à jour maintenance (statut/coûts, avant clôture) | idem | `updateVehicleMaintenance` | `update_vehicle_maintenance` (même migration) |
| Documents privés | `pages/cross/Documents.tsx` | `uploadPrivateDocument` / `getPrivateDocumentUrl` | `20260917100000_create_private_document_center.sql` |

### Dépendances importantes

- Modifier `ledger_entries` (schéma) → impacte les 8 RPC financières + `Tresorerie.tsx`/`Depenses.tsx` qui pourraient un jour le lire directement (actuellement **aucune page ne lit `ledger_entries`**, toutes lisent les collections dérivées `cash`/`expenses`/`vehicleSales`/etc. — donc modifier une RPC sans mettre à jour la collection locale correspondante désynchronise l'UI).
- `demo-store.ts` → `TABLES` (mapping collection → table Postgres) : ajouter une collection nécessite d'ajouter l'entrée ici + dans `seeds` + dans `CollectionMap`.
- Le CA signé/trésorerie réelle sont désormais calculés par les fonctions source unique de `demo-store.ts` (item 17 terminé) et consommés par `VehiculesDashboard.tsx`/`VehiculesRapports.tsx` — ne pas réimplémenter le calcul localement dans une page. `RevenueEvolutionChart.tsx` reste une 3e notion volontairement distincte (trésorerie visualisée dans le temps, sur `Tresorerie.tsx`), pas un doublon.
- `vehicleProfitability()` (demo-store.ts) dépend de `db.list("expenses")` — toute dépense non persistée côté serveur fausse la rentabilité véhicule si `vehicleId` renseigné.
- Rôles : `roles.ts:can()` existe mais n'est branché nulle part sauf le garde ad hoc de `Documents.tsx` (`role === "patron" || role === "manager"`). Les RPC financières font leur propre vérification serveur (`company_role_at_least`) — c'est la vraie barrière, pas l'UI.

## 3. Conventions du projet

- **Tables génériques** : `(id text, company_id uuid, data jsonb, created_at, updated_at)`, PK `(company_id, id)`. Les champs métier vivent dans `data`, pas de colonnes typées sauf tables spéciales.
- **RPC financières** : toujours `SECURITY DEFINER`, toujours un paramètre `p_idempotency_key` + `ON CONFLICT (company_id, idempotency_key) DO NOTHING` sur `ledger_entries`, toujours une vérification manuelle de rôle en début de fonction (RLS ne s'applique pas aux `SECURITY DEFINER`). Une nouvelle RPC financière doit suivre ce patron exactement.
- **Idempotency key côté client** : générée avec `useState(() => crypto.randomUUID())` dans le composant dialog, PAS régénérée à chaque submit — c'est ce qui protège du double-clic/double-soumission.
- **Anti double-soumission UI** : `const [submitting, setSubmitting] = useState(false)` + `if (submitting) return;` en début de `submit()` + `disabled={submitting}` sur le bouton. Pattern présent sur tous les dialogues RPC-backed, absent sur les dialogues legacy (`CashMovementDialog`, `SupplierDialog`, `EmployeeDialog`, `Categories.tsx`, `Documents.generate()`).
- **Migrations** : jamais éditer une migration déjà commitée/appliquée ; toujours créer un nouveau fichier `YYYYMMDDHHMMSS_description.sql`. Un `REVOKE INSERT/UPDATE/DELETE ... FROM authenticated` accompagne systématiquement le passage d'une table en écriture RPC-only (pattern "harden").
- **Français** dans l'UI (labels, toasts) et les commentaires métier ; anglais dans le code (variables, fonctions).
- **Nommage collections vs tables** : la collection JS (`useCollection("vehicleSales")`) et le nom de table Postgres (`vehicle_sales`) diffèrent (camelCase vs snake_case) — mapping dans `demo-store.ts:TABLES`.
- **Pièges connus à ne pas reproduire** : écriture directe `db.add/update` pour une opération à impact financier (toujours passer par une RPC) ; oublier d'insérer dans la table `expenses` typée quand une RPC crée une dépense (cf. `record_manual_expense`) ; ajouter un appel `db.xxx` sans vérifier que l'import existe en haut du fichier ; comparer des `cash_account_id` sans les normaliser (`private.normalize_cash_account()` en SQL, `normalizeCashAccount()` dans `Tresorerie.tsx`) — "Cash"/"Virement"/"Chèque" (libellés de moyen de paiement, ventes/paiements) et "Caisse principale"/"Banque" (libellés de compte, mouvements manuels) désignent les mêmes comptes réels avec des textes différents.

## 4. Roadmap maîtresse (fusion audit + liste utilisateur — 2026-09-21, à tenir à jour après chaque tâche)

**Terminé** : ledger central, dépenses manuelles/vente cash/vente crédit/paiements crédit/location (création+paiement+retour)/paie individuelle transactionnels avec anti-doublon ; RLS renforcée locations + paie ; bouton legacy "Payer salaires" désactivé.

### Phase 0 — P0 financiers (bloquant, avant toute autre chose)
1. ✅ **P0 Documents terminé** (2026-09-23, commit `bf0ac36`) — bulletins non supprimables (bouton masqué + garde double dans `removeDocument`), non modifiables, suppression non optimiste (`db.removeConfirmed`), document conservé si Supabase refuse, erreurs en toast.
2. ✅ **`CashMovementDialog` corrigé** (2026-09-21, commit `7f98bf0`) — c'était une régression du commit `62016d1` (import `db` supprimé par le refactor d'`ExpenseDialog` dans le même fichier). Remplacé par `recordCashMovement`/`recordCashTransfer` (RPC `record_cash_movement`/`record_cash_transfer`, `20260921120000_add_record_cash_movement_rpc.sql`, transaction atomique pour le virement). **⚠️ migration pas encore appliquée sur `gestiopro-dev`, à faire via `supabase db push` côté utilisateur.**
3. ✅ **`MaintenanceVehicleDialog` corrigé** (2026-09-21, commit `7f98bf0`) — même origine (régression `62016d1`, `disabled={submitting}` sans state déclaré). State ajouté, garde anti double-clic. Le flux `startVehicleMaintenance` reste legacy (pas de RPC) — c'est l'objet de l'item 4.
4. ✅ **Maintenance : ouverture + mise à jour transactionnelles** (2026-09-22, commit `c26a335`) — `open_vehicle_maintenance`/`update_vehicle_maintenance` (`20260921130000_add_maintenance_lifecycle_rpc.sql`) remplacent `startVehicleMaintenance`/`db.update` direct. Idempotency, anti-double-maintenance-active-sur-un-véhicule, immuabilité après clôture, dialogue d'édition des coûts ajouté. La clôture (`complete_vehicle_maintenance`, déjà solide) n'a pas été touchée. **⚠️ migration pas encore appliquée sur `gestiopro-dev`.**
5. ✅ **Retest global fait par l'utilisateur (2026-09-21→23)**, 3 bugs trouvés et corrigés en cours de route :
   - Trésorerie confondait tous les comptes (Caisse principale/Wave/Orange Money/Banque) dans un seul solde global, et les virements internes gonflaient les KPI Encaissements/Décaissements (commit `1ff275d`).
   - Aucune vérification de solde avant une sortie/virement (`652f941`) — corrigé, avec normalisation des libellés de compte (⚠️ **découverte importante** : les ventes/paiements utilisent des libellés de *moyen de paiement* — "Cash", "Virement", "Chèque" — différents des libellés de *compte* utilisés en Trésorerie — "Caisse principale", "Banque" — pour désigner le même compte réel ; `private.normalize_cash_account()` côté SQL et `normalizeCashAccount()` dans `Tresorerie.tsx` unifient ça, **toute nouvelle RPC qui touche `cash_account_id` doit passer par cette normalisation**).
   - Message d'erreur "solde insuffisant" enrichi (montant disponible/demandé + conseil de virement) via `DETAIL`/`HINT` Postgres + `rpcErrorMessage()` côté client (`af7d606`).
   **⚠️ 4 migrations en attente sur `gestiopro-dev`** : `20260921120000_...`, `20260921130000_...`, `20260923090000_...`, `20260923100000_...` — à appliquer via `supabase db push`.
6. ✅ **Terminé** (2026-09-24, commit `7f28f23`) — diagnostic exact : `vehicle-pdf.ts` générait un vrai PDF mais uniquement un téléchargement navigateur éphémère (`d.save()`), la ligne `documents` créée par `archiveDocument()` (supprimée, code mort) n'avait ni `storagePath` ni payload complet (télécharger depuis le coffre-fort échouait) ; pire, **aucun PDF n'existait pour le bulletin de paie**. Fix : `PdfDoc.toFile()` (engine.ts) sort un vrai `File` ; chaque générateur de `templates.ts` retourne son `PdfDoc` ; `vehicle-pdf.ts` (vente/location/crédit/reçu) et `Documents.tsx` (facture/proforma/reçu/bon/attestation) persistent désormais via `uploadPrivateDocument` (vrai fichier Storage `company-documents`) ; nouveau `pdfPayslip()` génère le bulletin qui n'existait pas ; nouvelle RPC `attach_payslip_document_file` (`20260924100000_...`) pour attacher le fichier au document `bulletin` existant sans rouvrir l'écriture directe verrouillée par `20260909145000_secure_payroll_direct_writes.sql`. **⚠️ 1 migration en attente sur `gestiopro-dev`** : `20260924100000_add_attach_payslip_document_file_rpc.sql`.

### Phase 1 — Confiance & permissions
7. ✅ **`can()` branché** (2026-09-23, commit `90d0e9c`) — terrain n'a plus accès à Trésorerie/Dépenses (page bloquée, `RestrictedAccess` partagé), ni aux boutons vente véhicule/crédit/paie (désactivés, alignés sur ce que les RPC exigeaient déjà côté serveur). Ajouté `manage.payroll` à `can()`.
8. ✅ **Purge de données sécurisée** (2026-09-23, commit `b784860`) — bouton désactivé si `!can(role,"wipe.data")`, confirmation par saisie exacte du nom de l'entreprise, `db.wipeAll()` retourne `{cleared, blocked}` et ne vide l'état local que pour ce qui a vraiment été supprimé côté serveur (les tables à historique financier verrouillées échouaient déjà silencieusement, l'UI le sait maintenant). **⚠️ Protection UI uniquement** : la RLS générique autorise encore `manager+` en DELETE sur les tables non "hardened" — un vrai verrou patron côté serveur demanderait une RPC dédiée (cf. item 10).
9. ✅ **Terminé** (2026-09-23, commit `e09afdd`, complété 2026-09-24 par `67da4b5`) — bulletins restreints patron/manager (RLS `20260916113000_...` + UI) et séparés visuellement des documents généraux dans `Documents.tsx`. Le sous-point "l'employé voit uniquement son propre bulletin" est fait : `Personnel.tsx` a une branche dédiée `role === "terrain"` (return anticipé après tous les hooks) qui n'affiche que la fiche employé liée à `userId` + ses propres `payslips`, en lecture seule, aucun accès au reste de l'effectif.
9b. ✅ **Gestion d'équipe faite** (2026-09-23→24, commits `27586d0`, `cdbf92e`) — option (a) retenue : `src/lib/api/team.functions.ts` (`createTeamMember`, server function TanStack Start + `requireSupabaseAuth` + `supabaseAdmin` service_role) crée directement le compte Auth avec mot de passe temporaire, vérifie que l'appelant est patron, rattache le membre à `company_members`, rollback si échec. UI : `src/components/settings/TeamCard.tsx` (liste + dialogue d'ajout), nouvelle action `manage.team` dans `roles.ts`. Nouvelle policy RLS `20260924090000_allow_teammates_read_profiles.sql` (les membres d'une même entreprise peuvent lire le nom de leurs coéquipiers, pas de tous les profils de la plateforme). **⚠️ Prérequis serveur** : `SUPABASE_URL` (sans `VITE_`) et `SUPABASE_SERVICE_ROLE_KEY` doivent être dans l'environnement serveur (`.env` local) — variables différentes de `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` utilisées côté client. 2026-09-24 : `TeamCard.tsx` crée désormais aussi la fiche `employees` liée (`userId`) en même temps que le compte, condition nécessaire à l'item 9 ci-dessus.
10. ✅ **Terminé** (2026-09-23, commits `e84b6d7` puis `1b81bdd`, complété 2026-09-23 par `20260923150000_add_supplier_employee_create_rpc.sql`) — `vehicle_credits`/`vehicle_payments` verrouillées (aucune écriture directe n'existait) ; `expenses` verrouillée en INSERT/UPDATE (DELETE reste manager+, volontaire) ; code mort `addExpense()`/`sellVehicle()` supprimé ; `create_supplier`/`create_employee` (RPC, idempotentes) remplacent `db.add` direct sur `suppliers`/`employees`, tables verrouillées. Plus aucune écriture financière ou métier directe dans le code client.
11. ✅ **Récupération de mot de passe** (2026-09-23, commit `0a9e36b`) — lien "Mot de passe oublié ?" sur `/connexion` (`resetPasswordForEmail`) + nouvelle route `/reinitialiser-mot-de-passe` (`updateUser({password})`). **⚠️ à vérifier côté Supabase Dashboard `gestiopro-dev`** : Auth → URL Configuration → Redirect URLs doit inclure l'URL de `/reinitialiser-mot-de-passe` (domaine de prod + localhost si testé en dev), sinon Supabase refuse le lien.
12. ✅ **Modèle de permissions terrain complet** (2026-09-24, commit `67da4b5`) — spécification exacte du patron implémentée intégralement, pattern "cacher, pas juste désactiver" (early-return après tous les hooks, jamais de bouton visible-mais-`disabled`) :
    - `roles.ts:can()` : nouvelles actions `manage.rental`, `create.sale` ; terrain n'a droit qu'à `view.finance`-scope véhicule (lecture) et à la saisie/mise à jour maintenance.
    - `VehiculesDashboard.tsx` : branche terrain dédiée — dashboard simplifié (véhicules, localisation, maintenance uniquement), aucun KPI financier.
    - `VehiculesVentes.tsx`, `VehiculesCredits.tsx` : page entièrement bloquée pour terrain (`RestrictedAccess`), pas de vente/crédit possible.
    - `VehiculesLocations.tsx` : lecture seule pour terrain — boutons de création/action masqués (`{can(...) && <Button/>}`), pas juste désactivés.
    - `Settings.tsx` : entièrement bloqué pour terrain (`RestrictedAccess`) — ne peut ni voir ni modifier identité/documents entreprise/profil.
    - `Personnel.tsx` : voir item 9 ci-dessus (self-view uniquement).
    **⚠️ Aucune nouvelle migration** — ce lot est purement UI/permissions client ; la vraie barrière reste les RPC serveur (`company_role_at_least`) déjà en place.

**Phase 1 entièrement terminée** (7, 8, 9, 9b, 10, 11, 12 tous faits au 2026-09-24). Reste à faire tester par l'utilisateur avec le compte terrain de test avant de passer à la Phase 2.

### Sécurité — hors roadmap fonctionnelle, à ne jamais régresser
- 2026-09-24, commit `95bd637` : `.env` retiré du suivi Git (`git rm --cached`, `.gitignore` le listait déjà). Vérifié via `git log -- .env` : aucun commit n'a jamais contenu de vrai secret, seul un commit très ancien (`41a8184`, placeholders du scaffold initial) touchait ce fichier. Règle permanente déjà en vigueur : ne jamais committer `.env`/`.env.local`, toujours vérifier `git status --short` avant un commit touchant la racine du projet.
- Variables serveur requises (non `VITE_`, jamais exposées au client) : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — utilisées uniquement par `client.server.ts`/`team.functions.ts`.

### Phase 2 — Centre documentaire & actifs
13. ✅ **Terminé** (2026-09-24, commits `63b9e8a`, `0b15604`) — refonte de `Documents.tsx` : types générables recentrés mono-secteur auto (Facture/Proforma/Reçu conservés ; "Bon de commande" et "Attestation" retirés — hors coeur de métier vente/location/crédit véhicule, `pdfPurchaseOrder`/`pdfAttestation` supprimées de `templates.ts`), refonte visuelle (bandeau d'indicateurs, cartes générateur avec description, barre d'archives réorganisée, état vide contextuel, mode de paiement du reçu en liste déroulante alignée sur le vocabulaire déjà utilisé ailleurs), pagination (20/page, remplace un scroll interne sans repère — anti-pattern), aperçu inline (`getPrivateDocumentUrl` accepte désormais une durée d'expiration du lien signé, 300 s pour l'aperçu vs 60 s pour le téléchargement direct). **Décision assumée, pas un oubli** : le registre de relations multi-entités (`document_relations`, table déjà peuplée en écriture par `uploadPrivateDocument` mais jamais lue par l'UI) et le versioning (remplacer un fichier existant en gardant l'historique) restent non exploités — aucun document actuel n'a besoin de plus d'une entité liée, et aucun flux de ré-upload n'existe qui justifierait un historique de versions. À reconsidérer seulement si un besoin concret apparaît (ex. un document rattaché à la fois à une vente et à son véhicule).
14. ✅ **Terminé** (2026-09-24, commit `4deb025`) — **pas le même traitement que les documents, volontairement** : les photos ne sont pas confidentielles (contrairement aux documents RH/financiers) et doivent rester visibles par tous les rôles y compris terrain, donc bucket **public** dédié `vehicle-photos` (migration `20260924110000_create_vehicle_photos_bucket.sql`) plutôt qu'une extension du bucket privé `company-documents` — URL publique stable, pas de lien signé à rafraîchir, les ~9 pages qui affichent `<img src={v.image}>` n'ont pas eu besoin d'être modifiées. `uploadVehiclePhoto()` (demo-store.ts) : chemin stable par véhicule (`vehicle-photos/{company}/{vehicle}/cover.{ext}`, upsert — pas d'historique de versions à gérer, contrairement aux documents). `SectorDialogs.tsx` (`VehicleDialog.handleImage`) n'utilise plus `FileReader.readAsDataURL` — aperçu local par URL objet, upload réel seulement à la validation. Bouton de migration des photos legacy encore en base64 sur `VehiculesList.tsx` (même pattern que la migration Base64 déjà en place pour les documents). **⚠️ 1 migration en attente sur `gestiopro-dev`** : `20260924110000_create_vehicle_photos_bucket.sql`.

### Phase 3 — Recentrage mono-secteur (décision stratégique confirmée)
15. ✅ **Terminé — suppression complète, pas un masquage** (2026-09-24, commit `f1d59e0`, à la demande explicite de l'utilisateur : "supprime complètement... que le secteur auto soit indépendant"). Restaurant/Électroménager et les pages commerce génériques utilisées par Boutique (Sales/Stock/Categories/CommerceDashboard/Customers/Reports) retirés du code : pages, routes, dialogues, data layer (`commerce-data.ts`, `categories-data.ts`). Cartographie de dépendances faite par un agent Explore avant toute suppression pour ne rien casser côté vehicules. **Tables Postgres conservées** (orphelines, non lues/écrites par le code) : `appliances`, `warranties`, `pro_invoices`, `appliance_credits`, `products`, `customers`, `sales`, `categories`, `dishes`, `resto_tables`, `orders`, `reservations` — suppression en base toujours en attente d'une validation explicite séparée.
16. ✅ **Terminé** (même commit `f1d59e0`) — `sectors.ts` simplifié à un seul sous-secteur (`vehicules`) ; `Dashboard.tsx` rend directement `VehiculesDashboard` (routeur `subSectorId` retiré) ; `mock-api.tsx` (alias `@workspace/api-client-react`) réduit aux hooks encore utilisés (`useGetCompany`/`useUpdateCompany`/`useListSectors`) ; sélecteurs de secteur retirés de `Settings.tsx`, `app.tsx` (création d'entreprise) et `inscription.tsx` (qui passe de 2 étapes à 1, l'étape "quelle activité" n'ayant plus de sens à choix unique).

### Phase 4 — Source unique de vérité métier (dashboard, rapports, statuts)
17. ✅ **Terminé** (2026-09-24, commit `1bdc2ed`) — audit des 3 définitions restantes (`Reports.tsx` générique supprimé en Phase 3) a trouvé 2 vrais bugs, pas juste un problème de vocabulaire : (1) `VehiculesDashboard.tsx` comptait les virements internes entre comptes de caisse dans ses KPI Encaissements/Décaissements/Trésorerie nette — même bug déjà corrigé sur `Tresorerie.tsx` (`1ff275d`) mais jamais reporté ici ; (2) `VehiculesRapports.tsx` ("CA total période", pie "Ventilation des revenus", "Top clients") additionnait le montant plein d'une vente à crédit **et** ses paiements d'échéance reçus par-dessus — double comptage. Fix : nouvelles fonctions source unique dans `demo-store.ts` — `rentalContractedAmount()`, `signedRevenueInRange()` (CA signé = ventes + locations contractées), `cashFlowInRange()` (trésorerie réelle, exclut les virements internes), `creditPaymentsInRange()`, `creditOutstandingTotal()`. `vehicleProfitability()` (déjà correcte) réutilise aussi `rentalContractedAmount()`. `RevenueEvolutionChart.tsx` non touché — déjà correct sur le fond (cash-basis, exclut déjà les virements internes), c'est une 3e notion légitime (trésorerie dans le temps) affichée sur `Tresorerie.tsx`, pas un doublon à fusionner avec le CA signé.
18. ✅ **Terminé** (2026-09-24, commit `4df5418`) — `window.print()` remplacé par un vrai export PDF structuré via `pdfReport()` (résumé KPI + top véhicules rentables + meilleurs clients). Profité de l'occasion pour une refonte complète de `VehiculesRapports.tsx` (palette catégorielle validée colorblind-safe, gridlines hairline pleines, états vides sur chaque graphe, hiérarchie typographique) : 4 KPI recentrés avec variation vs période précédente, nouveau graphe d'évolution du CA signé (absent avant), "Ventilation des revenus" (pie 2 tranches) remplacée par une barre horizontale empilée, bar chart Top véhicules en couleurs de statut (vert profit/rouge coût). Le double-comptage crédit corrigé sur les totaux (`1bdc2ed`) l'a aussi été sur le classement Top clients, qui avait le même bug.
19. Statuts métier véhicule cohérents (disponible/vendu/loué/en maintenance/indisponible, crédit en cours/terminé, contrat actif/terminé) entre Parking, Véhicules, Ventes, Locations, Crédits, Trésorerie, Dashboard.

### Phase 5 — Scalabilité produit
20. Paiement global sécurisé des salaires (le bouton legacy est désactivé, il faut le vrai remplaçant transactionnel — traité en priorité, avant le reste de la gestion RH avancée).
21. Gestion avancée employés : avances, paiements partiels, historique salarial, employés inactifs/licenciés, annulations contrôlées.
22. Feature Flags par organisation (activer/masquer ventes, crédit, locations, maintenance, paie, documents, rapports) — n'existe pas encore, nécessite une nouvelle table/migration à proposer avant d'implémenter.
23. 🆕 Tests automatisés — le dépôt n'a **aucun test** (`*.test.*`/`*.spec.*` introuvables, pas de script `test`). Prioriser les RPC financières (idempotency rejouée, rejet si rôle insuffisant) avant le jeu de test manuel bout-en-bout déjà prévu.
24. Jeu de test bout-en-bout manuel (5+ véhicules, clients, vente cash/crédit, paiements, location/retour, maintenance, paie, documents) suivant `écran → base → ledger → trésorerie → dashboard → rapport → document`.

### Phase 6 — Design system "Apple-grade" + mise en production
25. UI/UX professionnelle : design system unique (pas de template générique), hiérarchie visuelle, tableaux/filtres, erreurs compréhensibles, états vides/chargement, responsive mobile, boutons/dialogues uniformes. 🆕 Nettoyer aussi les bugs de polish déjà repérés : encodage cassé (mojibake) dans certains toasts (`SectorDialogs.tsx`, `Documents.tsx`), carte GPS entièrement simulée (`VehiculesGPS.tsx`) à clarifier ou remplacer avant de la présenter comme une vraie fonctionnalité.
26. Mise en production : commit propre, build réussi, migrations versionnées, vérification des variables d'environnement, confirmation que la prod ne pointe pas vers `gestiopro-dev`, sauvegarde DB, merge contrôlé vers `main`, déploiement, test post-déploiement.

**Ordre exact, fidèle à la séquence validée par l'utilisateur** : Documents → maintenance financière → retest flux → confidentialité RH → centre documentaire → **nettoyage mono-secteur** → **dashboard/rapports** → paiement global sécurisé → Feature Flags → UI/UX → tests complets → mise en production. **Ne pas partir sur le design (Phase 6) avant d'avoir fini les Phases 0-4.** 🆕 = ajouté par l'audit, absent de la liste initiale de l'utilisateur.

## Rapport d'audit complet

Un audit détaillé (architecture, sécurité RLS, tous les problèmes P0-P3 avec fichier:ligne) a été produit et discuté en conversation le 2026-09-21. Ce fichier CLAUDE.md en est la synthèse actionnable ; se référer à l'historique de conversation pour le détail complet si nécessaire (notamment le détail des 3 définitions concurrentes du CA, et les policies RLS table par table).
