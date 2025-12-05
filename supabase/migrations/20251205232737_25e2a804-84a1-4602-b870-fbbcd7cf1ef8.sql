-- Première migration : Ajouter le rôle 'coach' à l'enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'coach';