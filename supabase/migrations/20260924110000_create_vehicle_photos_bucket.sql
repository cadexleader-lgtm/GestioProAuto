-- Item 14 roadmap : la photo de couverture d'un vehicule (vehicles.data.image)
-- est actuellement une chaine base64 directement dans la colonne jsonb --
-- chaque enregistrement vehicule gonfle de plusieurs centaines de Ko, et ce
-- n'est pas ce que jsonb est fait pour porter.
--
-- Contrairement aux documents (bucket prive company-documents, lecture
-- reservee a manager+ -- car RH/financier sensible), une photo de vehicule
-- n'a rien de confidentiel : tous les roles doivent pouvoir la voir, y
-- compris terrain qui peut deja saisir/modifier un vehicule. D'ou un bucket
-- PUBLIC dedie plutot qu'une extension du bucket prive existant : URL
-- publique stable, aucun lien signe a rafraichir, et surtout aucune des
-- ~9 pages qui font deja <img src={v.image}> n'a besoin d'etre modifiee
-- au-dela de la valeur qu'elles recoivent (une URL publique remplace une
-- chaine base64 de facon totalement transparente pour ces pages).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle-photos',
  'vehicle-photos',
  true,
  3145728,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Convention de chemin identique a company-documents :
-- vehicle-photos/{company_id}/{vehicle_id}/cover.{ext}
-- (chemin stable, upsert a chaque remplacement -- pas d'accumulation de
-- fichiers orphelins a chaque nouvelle photo, contrairement aux documents
-- qui ont besoin d'un historique).
DROP POLICY IF EXISTS "public read vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "members write company vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "members update company vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "members delete company vehicle photos" ON storage.objects;

CREATE POLICY "public read vehicle photos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'vehicle-photos');

CREATE POLICY "members write company vehicle photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vehicle-photos'
    AND private.is_company_member(private.storage_company_id_from_object_name(name))
  );

CREATE POLICY "members update company vehicle photos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'vehicle-photos'
    AND private.is_company_member(private.storage_company_id_from_object_name(name))
  )
  WITH CHECK (
    bucket_id = 'vehicle-photos'
    AND private.is_company_member(private.storage_company_id_from_object_name(name))
  );

CREATE POLICY "members delete company vehicle photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'vehicle-photos'
    AND private.is_company_member(private.storage_company_id_from_object_name(name))
  );
