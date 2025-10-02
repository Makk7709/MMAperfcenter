-- Insert exercices de base pour MMA/Combat
INSERT INTO exercises (name, category, muscle_groups, instructions) VALUES
-- Upper Body - Striking
('Pompes', 'strength', ARRAY['Pectoraux', 'Triceps', 'Épaules'], 'Position planche, descendre en contrôlant, remonter en explosif'),
('Développé Couché', 'strength', ARRAY['Pectoraux', 'Triceps', 'Épaules'], 'Allongé sur banc, barre au niveau poitrine, pousser vers le haut'),
('Dips', 'strength', ARRAY['Pectoraux', 'Triceps'], 'Entre deux barres parallèles, descendre et remonter le corps'),
('Shadow Boxing', 'cardio', ARRAY['Épaules', 'Cardio'], 'Enchaînements de coups dans le vide, travail technique et cardio'),
('Sac de Frappe', 'cardio', ARRAY['Épaules', 'Cardio', 'Core'], 'Enchaînements sur sac lourd, puissance et endurance'),

-- Upper Body - Pull
('Tractions', 'strength', ARRAY['Dos', 'Biceps'], 'Suspendre à barre, tirer jusqu''à menton au niveau de barre'),
('Rowing Barre', 'strength', ARRAY['Dos', 'Biceps'], 'Penché à 45°, tirer barre vers abdominaux'),
('Tirage Vertical', 'strength', ARRAY['Dos', 'Biceps'], 'Assis, tirer poulie haute vers poitrine'),

-- Core / Grappling
('Planche', 'core', ARRAY['Core', 'Épaules'], 'Position planche, maintenir alignement corps droit'),
('Crunch', 'core', ARRAY['Abdominaux'], 'Allongé, contracter abdos pour soulever épaules'),
('Russian Twist', 'core', ARRAY['Obliques', 'Core'], 'Assis, rotation tronc de gauche à droite'),
('Bridge de Lutte', 'grappling', ARRAY['Cou', 'Core', 'Dos'], 'Position pont sur tête, renforcement pour grappling'),
('Sprawl', 'grappling', ARRAY['Core', 'Jambes', 'Cardio'], 'Projection rapide jambes arrière, défense takedown'),

-- Lower Body
('Squat', 'strength', ARRAY['Quadriceps', 'Fessiers'], 'Descendre fesses en arrière, genoux alignés pieds'),
('Deadlift', 'strength', ARRAY['Dos', 'Fessiers', 'Ischio-jambiers'], 'Soulever barre du sol en gardant dos droit'),
('Fentes', 'strength', ARRAY['Quadriceps', 'Fessiers'], 'Pas en avant, descendre genou arrière vers sol'),
('Leg Press', 'strength', ARRAY['Quadriceps', 'Fessiers'], 'Pousser plateforme avec jambes'),

-- Cardio / Conditioning
('Burpees', 'cardio', ARRAY['Full Body', 'Cardio'], 'Pompe, sauter pieds vers mains, saut vertical'),
('Mountain Climbers', 'cardio', ARRAY['Core', 'Cardio'], 'Position planche, ramener genoux vers poitrine alternativement'),
('Jump Rope', 'cardio', ARRAY['Mollets', 'Cardio'], 'Sauter à la corde, travail cardio et coordination'),
('Sprint Intervals', 'cardio', ARRAY['Jambes', 'Cardio'], 'Alternance sprint intense et récupération'),
('Vélo Assault', 'cardio', ARRAY['Jambes', 'Cardio'], 'Vélo haute intensité avec bras'),

-- MMA Specific
('Kicks sur Pads', 'technique', ARRAY['Jambes', 'Hanches', 'Core'], 'Coups de pied sur pattes d''ours, technique et puissance'),
('Clinch Work', 'grappling', ARRAY['Core', 'Épaules', 'Cardio'], 'Travail corps à corps, contrôle et projections'),
('Ground & Pound', 'technique', ARRAY['Épaules', 'Core'], 'Frappes au sol en position dominante'),
('Takedown Drills', 'grappling', ARRAY['Jambes', 'Core', 'Dos'], 'Répétitions amenées au sol'),

-- Shoulders / Explosivity
('Développé Militaire', 'strength', ARRAY['Épaules', 'Triceps'], 'Debout, pousser barre au-dessus tête'),
('Élévations Latérales', 'strength', ARRAY['Épaules'], 'Bras le long du corps, lever haltères latéralement'),
('Medicine Ball Slams', 'explosive', ARRAY['Core', 'Épaules', 'Cardio'], 'Lancer ballon au sol avec force maximale'),
('Box Jumps', 'explosive', ARRAY['Jambes', 'Fessiers'], 'Sauter sur box, travail explosivité')

ON CONFLICT DO NOTHING;