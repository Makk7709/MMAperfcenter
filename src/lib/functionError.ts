import { FunctionsHttpError } from '@supabase/supabase-js';

export interface FunctionErrorDetails {
  message: string;
  status?: number;
  code?: string;
}

/**
 * Extracts the user-facing message returned by an Edge Function
 * (`{ error, code }` body) from a `supabase.functions.invoke` error.
 * Edge Functions only expose safe messages, so they can be shown as-is.
 */
export async function readFunctionError(error: unknown, fallback: string): Promise<FunctionErrorDetails> {
  if (error instanceof FunctionsHttpError) {
    const response = error.context as Response | undefined;
    const body = await response?.clone().json().catch(() => null);
    return {
      message: typeof body?.error === 'string' ? body.error : fallback,
      status: response?.status,
      code: typeof body?.code === 'string' ? body.code : undefined,
    };
  }
  return { message: fallback };
}
