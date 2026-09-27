import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Subscription } from '@/hooks/useSubscription';
import PaymentSuccess from './PaymentSuccess';

const invoke = vi.fn();
const refreshSubscription = vi.fn();
let current: Subscription | null = null;

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

vi.mock('@/hooks/useSubscription', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useSubscription')>();
  return {
    ...actual,
    useSubscription: () => ({ subscription: current, refreshSubscription }),
  };
});

const sub = (plan: Subscription['plan']): Subscription => ({ id: 's', user_id: 'u', plan, status: 'active' });

const renderPage = () =>
  render(
    <MemoryRouter>
      <PaymentSuccess />
    </MemoryRouter>,
  );

const flush = async (ms = 0) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

describe('PaymentSuccess', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    invoke.mockResolvedValue({ data: null, error: null });
    current = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('confirms only once a paid plan is synced', async () => {
    refreshSubscription.mockResolvedValueOnce(sub('free')).mockResolvedValueOnce(sub('pro'));
    renderPage();
    await flush();
    expect(screen.getByText('Activation en cours…')).toBeInTheDocument();

    current = sub('pro');
    await flush(2500);
    expect(screen.getByText('Paiement confirmé !')).toBeInTheDocument();
    expect(screen.getByText(/abonnement est actif/)).toBeInTheDocument();
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it('stays in activation state with a retry when the plan remains free', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('boom') });
    refreshSubscription.mockResolvedValue(sub('free'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderPage();
    await flush(10_000);

    expect(invoke).toHaveBeenCalledTimes(3);
    expect(screen.queryByText('Paiement confirmé !')).not.toBeInTheDocument();
    expect(screen.getByText('Activation en cours…')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Accéder à mon espace' })).toHaveAttribute('href', '/');

    refreshSubscription.mockResolvedValue(sub('elite'));
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    await flush();
    expect(screen.getByText('Paiement confirmé !')).toBeInTheDocument();
  });
});
