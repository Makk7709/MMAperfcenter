import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Profile } from '@/hooks/useProfile';
import Onboarding from './Onboarding';

const navigate = vi.fn();
const signOut = vi.fn();
const update = vi.fn();
const eq = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, signOut }),
}));

const profile = {
  id: 'user-1',
  full_name: 'Alex',
  gender: 'male',
  age: 28,
  weight: 72.5,
  height: 178,
  fitness_level: 'intermediate',
  martial_arts_discipline: 'muay-thai',
  goals: [],
  belt_rank: 'Bleue',
  secondary_disciplines: ['boxe'],
  sleep_hours: null,
  stress_level: null,
} as unknown as Profile;

vi.mock('@/hooks/useProfile', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/useProfile')>()),
  useProfile: () => ({ profile, loading: false, error: null, refreshProfile: vi.fn() }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ update: (payload: unknown) => { update(payload); return { eq }; } }) },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const next = () => fireEvent.click(screen.getByRole('button', { name: /Suivant/ }));

describe('Onboarding', () => {
  beforeEach(() => {
    eq.mockResolvedValue({ error: null });
    sessionStorage.clear();
  });

  it('pre-fills from the profile and only allows saving once required goals are set', async () => {
    render(<Onboarding />);

    expect(screen.getByLabelText(/Prénom/)).toHaveValue('Alex');
    next();
    expect(screen.getByLabelText(/Poids/)).toHaveValue(72.5);
    next();
    next();

    const skip = screen.getByRole('button', { name: 'Enregistrer et passer le reste plus tard' });
    expect(skip).toBeDisabled();
    expect(screen.getByRole('button', { name: /Suivant/ })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /Gagner en force/ }));
    expect(skip).toBeEnabled();
    fireEvent.click(skip);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/', { replace: true }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      full_name: 'Alex',
      weight: 72.5,
      martial_arts_discipline: 'muay-thai',
      goals: ['force'],
      belt_rank: 'Bleue',
      secondary_disciplines: ['boxe'],
      sleep_hours: 7,
      stress_level: 5,
    }));
  });

  it('offers a sign-out action', () => {
    render(<Onboarding />);
    fireEvent.click(screen.getByRole('button', { name: /Se déconnecter/ }));
    expect(signOut).toHaveBeenCalled();
  });
});
