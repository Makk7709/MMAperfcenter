import { z } from 'zod';

// Applies to new passwords only (sign-up, reset). Sign-in must keep accepting
// the shorter passwords of existing accounts. Mirror this value in
// Supabase Auth > Providers > Email > Minimum password length.
export const MIN_PASSWORD_LENGTH = 8;

export const newPasswordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, { message: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères` });
