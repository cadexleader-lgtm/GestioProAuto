-- "own profile read" (20260802221936_*.sql) ne permettait de lire que son
-- propre profil. La page Equipe (TeamCard.tsx) a besoin d'afficher le nom des
-- autres membres de la meme entreprise -- ajoute une policy dediee plutot que
-- d'elargir l'existante, pour garder la portee precise (memes coequipiers
-- uniquement, jamais tous les profils de la plateforme).

CREATE POLICY "teammates read each other profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.company_members cm_self
        JOIN public.company_members cm_target
          ON cm_target.company_id = cm_self.company_id
       WHERE cm_self.user_id = auth.uid()
         AND cm_target.user_id = profiles.id
    )
  );
