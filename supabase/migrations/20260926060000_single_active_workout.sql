-- Échoue vite au lieu de bloquer connexions et requêtes derrière un verrou :
-- en cas d'échec, relancer la migration un peu plus tard.
SET lock_timeout = '5s';

-- Une seule séance ouverte par utilisateur : sans cette garantie, une erreur
-- réseau ou un second onglet crée une deuxième séance « active » et la
-- première, invisible, n'est jamais terminée.

-- Les doublons existants sont mis en pause (ni affichés ni comptés), en gardant
-- ouverte la plus récente de chaque utilisateur. Le verrou empêche une séance
-- démarrée pendant la migration de faire échouer la création de l'index ;
-- un started_at dans le futur (horloge du téléphone fausse) ne compte pas.
LOCK TABLE public.workouts IN SHARE ROW EXCLUSIVE MODE;

-- Anciennes lignes sans statut : ni reprises, ni effacées par « Réinitialiser ».
UPDATE public.workouts
SET status = CASE WHEN completed_at IS NOT NULL THEN 'completed' ELSE 'paused' END
WHERE status IS NULL;

WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id
           ORDER BY CASE
                      WHEN started_at IS NULL OR started_at > now() + interval '5 minutes' THEN created_at
                      ELSE started_at
                    END DESC,
                    id DESC
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
