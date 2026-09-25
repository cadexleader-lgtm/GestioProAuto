/**
 * Profil complet de l'entreprise — utilisé automatiquement dans tous les
 * documents PDF générés (contrats, factures, reçus, rapports, devis...).
 * Persisté dans la table `company_settings` (une ligne singleton `profile`).
 */
import { useMemo } from "react";
import { useCollection, db, setCompanyProfile } from "./demo-store";

export interface CompanyProfile {
  /** Identité */
  name: string;
  legalForm: string;
  slogan: string;
  logoDataUrl: string;
  /** Contact */
  address: string;
  city: string;
  country: string;
  phone: string;
  phone2: string;
  email: string;
  website: string;
  /** Légal & fiscal */
  rccm: string;
  ifu: string;
  taxNumber: string;
  currency: string;
  /** Documents */
  signatureDataUrl: string;
  stampDataUrl: string;
  terms: string;
  documentFooter: string;
  /** Conditions générales par type de contrat (articles numérotés), imprimées
   * sur le contrat correspondant à la place du texte générique par défaut du
   * modèle dès qu'au moins un article est renseigné. */
  contractArticles: {
    vente: string[];
    location: string[];
    credit: string[];
  };
  /** Banque */
  bankName: string;
  bankAccount: string;
  bankIban: string;
  bankSwift: string;
  mobileMoney: string;
  /** Réseaux */
  facebook: string;
  instagram: string;
  linkedin: string;
  whatsapp: string;
  /** Apparence documents */
  accentColor: string;
}

export const EMPTY_PROFILE: CompanyProfile = {
  name: "", legalForm: "", slogan: "", logoDataUrl: "",
  address: "", city: "", country: "", phone: "", phone2: "", email: "", website: "",
  rccm: "", ifu: "", taxNumber: "", currency: "FCFA",
  signatureDataUrl: "", stampDataUrl: "", terms: "", documentFooter: "",
  contractArticles: { vente: [], location: [], credit: [] },
  bankName: "", bankAccount: "", bankIban: "", bankSwift: "", mobileMoney: "",
  facebook: "", instagram: "", linkedin: "", whatsapp: "",
  accentColor: "#2563eb",
};

const PROFILE_ID = "profile";

/** Lecture réactive du profil (fusionné avec les valeurs par défaut). */
export function useCompanyProfile(): CompanyProfile {
  const rows = useCollection("settings");
  return useMemo(() => {
    const row = rows.find((r) => r.id === PROFILE_ID) as Partial<CompanyProfile> | undefined;
    return { ...EMPTY_PROFILE, ...(row ?? {}) };
  }, [rows]);
}

/** Lecture non réactive (pour la génération de PDF hors composant). */
export function getCompanyProfile(): CompanyProfile {
  const row = db.list("settings").find((r) => r.id === PROFILE_ID) as Partial<CompanyProfile> | undefined;
  return { ...EMPTY_PROFILE, ...(row ?? {}) };
}

/** Enregistre le profil via la RPC `set_company_profile` (company_settings
 * est écriture-RPC-only, voir 20260925100000_add_set_company_profile_rpc.sql
 * — un ancien `db.upsert("settings", ...)` direct échouait silencieusement
 * côté serveur depuis le durcissement des feature flags : la modification
 * semblait enregistrée localement mais n'atteignait jamais la base, invisible
 * sur un autre appareil ou après déconnexion). Doit être attendue : contrairement
 * à l'ancien appel synchrone optimiste, un échec (droits insuffisants, réseau)
 * est maintenant remonté à l'appelant au lieu d'être masqué. */
export async function saveCompanyProfile(patch: Partial<CompanyProfile>): Promise<CompanyProfile> {
  const next = { ...getCompanyProfile(), ...patch, id: PROFILE_ID };
  const saved = await setCompanyProfile(next);
  return { ...EMPTY_PROFILE, ...saved } as CompanyProfile;
}
