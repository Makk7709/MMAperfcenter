-- Séance unifiée : une seule table `workouts` pour les séances à rounds
-- (boxe, MMA, cardio) et les séances de musculation série par série.

-- ---- 1. Paramètres de séance ------------------------------------------------
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS session_type TEXT
    CHECK (session_type IN ('boxing', 'mma', 'strength', 'cardio', 'custom')),
  ADD COLUMN IF NOT EXISTS intensity TEXT
    CHECK (intensity IN ('light', 'moderate', 'intense')),
  ADD COLUMN IF NOT EXISTS planned_rounds INTEGER
    CHECK (planned_rounds BETWEEN 1 AND 30),
  ADD COLUMN IF NOT EXISTS round_seconds INTEGER
    CHECK (round_seconds BETWEEN 10 AND 1800),
  ADD COLUMN IF NOT EXISTS rest_seconds INTEGER
    CHECK (rest_seconds BETWEEN 0 AND 600),
  ADD COLUMN IF NOT EXISTS rounds_completed INTEGER NOT NULL DEFAULT 0
    CHECK (rounds_completed BETWEEN 0 AND 30);

CREATE INDEX IF NOT EXISTS idx_workouts_user_status_completed
  ON public.workouts (user_id, status, completed_at DESC);

-- ---- 2. Note de carnet rattachée à une séance --------------------------------
ALTER TABLE public.workout_journal
  ADD COLUMN IF NOT EXISTS workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workout_journal_workout_id
  ON public.workout_journal (workout_id) WHERE workout_id IS NOT NULL;

-- Une note ne peut viser qu'une séance de son auteur.
DROP POLICY IF EXISTS "Journal entries link only own workouts (insert)" ON public.workout_journal;
CREATE POLICY "Journal entries link only own workouts (insert)"
ON public.workout_journal
AS RESTRICTIVE
FOR INSERT
WITH CHECK (
  workout_id IS NULL
  OR EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Journal entries link only own workouts (update)" ON public.workout_journal;
CREATE POLICY "Journal entries link only own workouts (update)"
ON public.workout_journal
AS RESTRICTIVE
FOR UPDATE
WITH CHECK (
  workout_id IS NULL
  OR EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid())
);

-- ---- 3. Catalogue d'exercices orienté sports de combat -----------------------
INSERT INTO public.exercises (name, category, muscle_groups, instructions) VALUES
('Squat avant', 'Force', '{"Quadriceps", "Fessiers", "Gainage"}', 'Barre posée sur l''avant des épaules, descendre buste droit puis remonter.'),
('Soulevé de terre roumain', 'Force', '{"Ischio-jambiers", "Fessiers", "Lombaires"}', 'Jambes presque tendues, descendre la barre le long des cuisses en reculant les hanches.'),
('Fentes marchées', 'Force', '{"Quadriceps", "Fessiers"}', 'Avancer en fente, genou arrière proche du sol, alterner les jambes.'),
('Hip thrust', 'Force', '{"Fessiers", "Ischio-jambiers"}', 'Dos appuyé sur un banc, pousser les hanches vers le haut avec une charge sur le bassin.'),
('Développé incliné haltères', 'Force', '{"Pectoraux", "Épaules", "Triceps"}', 'Banc incliné, pousser les haltères au-dessus de la poitrine.'),
('Rowing haltère', 'Force', '{"Dorsaux", "Biceps"}', 'Un genou sur le banc, tirer l''haltère vers la hanche.'),
('Tirage vertical', 'Force', '{"Dorsaux", "Biceps"}', 'Tirer la barre vers le haut de la poitrine, coudes vers le bas.'),
('Pompes', 'Force', '{"Pectoraux", "Triceps", "Gainage"}', 'Corps gainé, descendre la poitrine près du sol puis pousser.'),
('Tractions australiennes', 'Force', '{"Dorsaux", "Biceps"}', 'Sous une barre basse, corps droit, tirer la poitrine vers la barre.'),
('Face pull', 'Force', '{"Épaules", "Trapèzes"}', 'Tirer la corde vers le visage, coudes hauts.'),
('Kettlebell swing', 'Puissance', '{"Fessiers", "Ischio-jambiers", "Lombaires"}', 'Balancer la kettlebell jusqu''à hauteur d''épaules par une extension explosive des hanches.'),
('Box jump', 'Puissance', '{"Quadriceps", "Fessiers", "Mollets"}', 'Sauter sur une box en réception amortie, redescendre en marchant.'),
('Squat sauté', 'Puissance', '{"Quadriceps", "Fessiers"}', 'Descendre en squat puis sauter le plus haut possible.'),
('Pompes claquées', 'Puissance', '{"Pectoraux", "Triceps"}', 'Pousser assez fort pour décoller les mains et frapper dans les mains.'),
('Lancer rotatif médecine-ball', 'Puissance', '{"Obliques", "Épaules", "Hanches"}', 'De profil face au mur, lancer le médecine-ball par une rotation des hanches.'),
('Épaulé en puissance', 'Puissance', '{"Fessiers", "Trapèzes", "Quadriceps"}', 'Monter la barre du sol aux épaules en une extension explosive.'),
('Burpees', 'Conditionnement', '{"Corps entier"}', 'Planche, pompe, retour pieds sous les hanches, saut.'),
('Sprawls', 'Conditionnement', '{"Corps entier"}', 'Lancer les jambes en arrière hanches basses comme pour défendre une amenée au sol, puis revenir en garde.'),
('Mountain climbers', 'Conditionnement', '{"Gainage", "Épaules"}', 'En planche, ramener les genoux vers la poitrine en alternance rapide.'),
('Thrusters', 'Conditionnement', '{"Quadriceps", "Épaules"}', 'Squat avant enchaîné avec un développé au-dessus de la tête.'),
('Relevés de jambes suspendu', 'Gainage', '{"Abdominaux", "Fléchisseurs de hanche"}', 'Suspendu à une barre, monter les jambes sans balancer.'),
('Russian twist', 'Gainage', '{"Obliques", "Abdominaux"}', 'Assis buste incliné, pieds décollés, tourner le buste de chaque côté.'),
('Roue abdominale', 'Gainage', '{"Abdominaux", "Dorsaux"}', 'À genoux, rouler vers l''avant dos plat puis revenir.'),
('Pallof press', 'Gainage', '{"Obliques", "Gainage"}', 'De profil à l''élastique, pousser les mains devant soi sans laisser le buste tourner.')
ON CONFLICT (name) DO NOTHING;
