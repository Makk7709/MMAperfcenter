-- Durable checkout attempts, accessible only to Edge Functions.
CREATE TABLE IF NOT EXISTS public.checkout_attempts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  lock_token uuid,
  locked_until timestamptz,
  request_id uuid,
  params jsonb,
  session_id text,
  CHECK ((request_id IS NULL) = (params IS NULL))
);
ALTER TABLE public.checkout_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.checkout_attempts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.checkout_attempts TO service_role;

CREATE OR REPLACE FUNCTION public.acquire_checkout_lock(p_user_id uuid, p_token uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.checkout_attempts(user_id) VALUES (p_user_id) ON CONFLICT DO NOTHING;
  UPDATE public.checkout_attempts
     SET lock_token = p_token, locked_until = clock_timestamp() + interval '10 minutes'
   WHERE user_id = p_user_id
     AND (locked_until IS NULL OR locked_until < clock_timestamp());
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_checkout_lock(p_user_id uuid, p_token uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.checkout_attempts SET lock_token = NULL, locked_until = NULL
   WHERE user_id = p_user_id AND lock_token = p_token;
$$;

REVOKE ALL ON FUNCTION public.acquire_checkout_lock(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_checkout_lock(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_checkout_lock(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_checkout_lock(uuid, uuid) TO service_role;
