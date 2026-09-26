-- Une seule séance ouverte par utilisateur : sans cette garantie, une erreur
-- réseau ou un second onglet crée une deuxième séance « active » et la
-- première, invisible, n'est jamais terminée.

-- Les doublons existants sont mis en pause (ni affichés ni comptés), en gardant
-- ouverte la plus récente de chaque utilisateur.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id
           ORDER BY COALESCE(started_at, created_at) DESC, id DESC
         ) AS rank
  FROM public.workouts
  WHERE status = 'active'
)
UPDATE public.workouts w
SET status = 'paused'
FROM ranked r
WHERE w.id = r.id AND r.rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS workouts_one_active_per_user
  ON public.workouts (user_id)
  WHERE status = 'active';
