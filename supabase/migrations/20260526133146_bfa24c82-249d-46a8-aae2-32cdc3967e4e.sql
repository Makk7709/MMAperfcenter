-- Ajout d'un index composite sur user_id + date pour accélérer les requêtes historiques nutrition
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_date ON public.nutrition_logs (user_id, date);