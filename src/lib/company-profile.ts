/**
 * Profil complet de l'entreprise — utilisé automatiquement dans tous les
 * documents PDF générés (contrats, factures, reçus, rapports, devis...).
 * Persisté dans la table `company_settings` (une ligne singleton `profile`).
 */
import { useMemo } from "react";
import { useCollection, db } from "./demo-store";

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

export function saveCompanyProfile(patch: Partial<CompanyProfile>) {
  const next = { ...getCompanyProfile(), ...patch, id: PROFILE_ID };
  db.upsert("settings", next as any);
}
