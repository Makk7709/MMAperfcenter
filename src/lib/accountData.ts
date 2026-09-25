import { supabase } from '@/integrations/supabase/client';
import { readFunctionError } from '@/lib/functionError';

// Tables holding the user's rows in a user_id column (RLS limits reads to them).
const USER_TABLES = [
  'subscriptions',
  'feature_usage',
  'user_roles',
  'workouts',
  'workout_journal',
  'nutrition_logs',
  'nutrition_goals',
  'sparring_analyses',
  'notifications',
  'community_activities',
  'meute_members',
] as const;

const PAGE_SIZE = 1000;
const IN_CHUNK = 100;

type Row = Record<string, unknown>;
type PageQuery = (from: number, to: number) => PromiseLike<{ data: Row[] | null; error: { message: string } | null }>;

// PostgREST caps each response: read page by page.
async function fetchAll(query: PageQuery): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await query(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

// Long id lists would overflow the request URL: query them in chunks.
async function fetchInChunks(ids: string[], queryChunk: (chunk: string[]) => PageQuery): Promise<Row[]> {
  const rows: Row[] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    rows.push(...await fetchAll(queryChunk(ids.slice(i, i + IN_CHUNK))));
  }
  return rows;
}

/** Every personal data row readable by the user, for the RGPD portability right. */
export async function exportAccountData(userId: string): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = { exported_at: new Date().toISOString() };

  const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  data.profile = profile;

  for (const table of USER_TABLES) {
    data[table] = await fetchAll((from, to) =>
      supabase.from(table).select('*').eq('user_id', userId).range(from, to) as unknown as ReturnType<PageQuery>);
  }

  const workoutIds = (data.workouts as Row[]).map((w) => w.id as string);
  const exercises = await fetchInChunks(workoutIds, (chunk) => (from, to) =>
    supabase.from('workout_exercises').select('*').in('workout_id', chunk).range(from, to));
  data.workout_exercises = exercises;
  data.sets = await fetchInChunks(exercises.map((e) => e.id as string), (chunk) => (from, to) =>
    supabase.from('sets').select('*').in('workout_exercise_id', chunk).range(from, to));

  data.local_gamification = {
    xp: localStorage.getItem(`gamification_xp_${userId}`),
    badges: localStorage.getItem(`gamification_badges_${userId}`),
  };
  return data;
}

export function downloadJson(filename: string, payload: unknown): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export const DELETE_CONFIRMATION_WORD = 'SUPPRIMER';

export async function deleteAccount(confirm: string): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', { body: { confirm } });
  if (error) {
    const { message } = await readFunctionError(error, 'La suppression du compte a échoué');
    throw new Error(message);
  }
}
