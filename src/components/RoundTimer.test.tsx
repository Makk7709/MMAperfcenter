import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { RoundTimer } from './RoundTimer';

vi.mock('@/lib/training/sound', () => ({
  unlockAudio: vi.fn(),
  beep: vi.fn(),
  bell: vi.fn(),
}));

import { bell, unlockAudio } from '@/lib/training/sound';

afterEach(() => {
  vi.useRealTimers();
});

describe('RoundTimer', () => {
  it('shows French copy and durations', () => {
    render(<RoundTimer />);
    expect(screen.getByRole('button', { name: /Réinitialiser/ })).toBeInTheDocument();
    expect(screen.getByText('Round : 3 min')).toBeInTheDocument();
    expect(screen.getByText('Repos : 1 min')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('3:00');
  });

  it('counts from the wall clock and unlocks audio on start', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] });
    render(<RoundTimer />);

    fireEvent.click(screen.getByRole('button', { name: /Démarrer/ }));
    expect(unlockAudio).toHaveBeenCalled();

    // A single late tick must still show the real elapsed time.
    act(() => {
      vi.setSystemTime(Date.now() + 65_000);
      vi.advanceTimersByTime(250);
    });
    expect(screen.getByRole('timer')).toHaveTextContent('1:55');

    act(() => {
      vi.setSystemTime(Date.now() + 120_000);
      vi.advanceTimersByTime(250);
    });
    expect(screen.getByText('REPOS')).toBeInTheDocument();
    expect(bell).toHaveBeenCalled();
  });

  it('keeps raw input while typing and clamps on blur', () => {
    render(<RoundTimer />);
    fireEvent.click(screen.getByRole('button', { name: 'Configurer le timer' }));

    const work = screen.getByLabelText('Durée du round (secondes)');
    fireEvent.change(work, { target: { value: '' } });
    expect(work).toHaveValue(null);
    fireEvent.change(work, { target: { value: '9999' } });
    fireEvent.blur(work);
    expect(work).toHaveValue(600);

    const rounds = screen.getByLabelText('Nombre de rounds');
    fireEvent.change(rounds, { target: { value: '0' } });
    fireEvent.blur(rounds);
    expect(rounds).toHaveValue(1);

    const rest = screen.getByLabelText('Durée du repos (secondes)');
    fireEvent.change(rest, { target: { value: '90' } });

    fireEvent.click(screen.getByRole('button', { name: 'Appliquer' }));
    expect(screen.getByText('Round : 10 min')).toBeInTheDocument();
    expect(screen.getByText('Repos : 1 min 30')).toBeInTheDocument();
    expect(screen.getByText('Round 1 / 1')).toBeInTheDocument();
  });
});
