import { supabase } from '@/integrations/supabase/client';
import { readFunctionError } from '@/lib/functionError';

type AdminAction = 'list' | 'stats' | 'update_profile' | 'suspend' | 'set_plan';

// Admin screens read other users' data: RLS forbids it, the admin-users Edge
// Function does it after checking the admin role server-side.
export async function invokeAdmin<T = { ok: true }>(action: AdminAction, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-users', { body: { action, ...payload } });
  if (error) {
    const { message } = await readFunctionError(error, "L'action admin a échoué");
    throw new Error(message);
  }
  return data as T;
}
