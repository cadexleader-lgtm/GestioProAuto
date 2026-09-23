-- Extension du bucket public vehicle-photos (20260924110000_...) pour la
-- galerie multi-photos (jusqu'a 8) et la video optionnelle d'un vehicule.
-- Meme bucket, memes policies deja en place (public read, ecriture reservee
-- aux membres de l'entreprise via le prefixe de chemin) -- seule la limite
-- de taille et la liste MIME changent.

UPDATE storage.buckets
SET
  file_size_limit = 52428800, -- 50 Mo (une courte video telephone tient dedans)
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
WHERE id = 'vehicle-photos';
