/**
 * TDD Tests for WolfSessionSummary Component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WolfSessionSummary } from './WolfSessionSummary';
import type { SessionSummary } from '@/utils/gamification/wolfTracking';

describe('WolfSessionSummary', () => {
  const mockSummary: SessionSummary = {
    totalExercises: 10,
    totalSets: 25,
    totalReps: 300,
    totalWeight: 5000,
    totalVolume: 5000,
    duration: 3600,
    personalRecords: [
      { exerciseId: '1', exerciseName: 'Bench Press', value: 100, unit: 'kg', previousBest: 95, date: '2024-01-01' }
    ],
    caloriesEstimate: 500,
    intensityScore: 85,
    muscleGroups: ['chest', 'back', 'legs'],
    badges: ['premiere_lune', 'feu_meute'],
    xpEarned: 250
  };

  describe('Rendering', () => {
    it('should render session summary', () => {
      render(<WolfSessionSummary summary={mockSummary} />);
      expect(screen.getByTestId('wolf-session-summary')).toBeInTheDocument();
    });

    it('should render wolf-themed title', () => {
      render(<WolfSessionSummary summary={mockSummary} />);
      const container = screen.getByTestId('wolf-session-summary');
      expect(container.textContent).toMatch(/chasse|combat|victoire|meute|conquête|territoire/i);
    });

    it('should render total exercises', () => {
      render(<WolfSessionSummary summary={mockSummary} />);
      const container = screen.getByTestId('wolf-session-summary');
      expect(container.textContent).toMatch(/10 exercices/i);
    });

    it('should render duration', () => {
      render(<WolfSessionSummary summary={mockSummary} />);
      const container = screen.getByTestId('wolf-session-summary');
      expect(container.textContent).toMatch(/60|1h/i);
    });

    it('should render XP earned', () => {
      render(<WolfSessionSummary summary={mockSummary} />);
      expect(screen.getByText(/\+250/)).toBeInTheDocument();
      expect(screen.getByText(/xp/i)).toBeInTheDocument();
    });
  });

  describe('Stats Display', () => {
    it('should show total sets', () => {
      render(<WolfSessionSummary summary={mockSummary} />);
      expect(screen.getByText(/25 sets/i)).toBeInTheDocument();
    });

    it('should show total reps', () => {
      render(<WolfSessionSummary summary={mockSummary} />);
      expect(screen.getByText(/300 reps/i)).toBeInTheDocument();
    });

    it('should show total weight', () => {
      render(<WolfSessionSummary summary={mockSummary} />);
      const container = screen.getByTestId('wolf-session-summary');
      expect(container.textContent).toMatch(/5[,\s]?000/);
    });

    it('should show calories burned', () => {
      render(<WolfSessionSummary summary={mockSummary} />);
      expect(screen.getByText(/500 kcal/i)).toBeInTheDocument();
    });

    it('should show intensity score', () => {
      render(<WolfSessionSummary summary={mockSummary} />);
      expect(screen.getByText(/85%/)).toBeInTheDocument();
    });
  });

  describe('Personal Records', () => {
    it('should show PR section when PRs exist', () => {
      render(<WolfSessionSummary summary={mockSummary} />);
      expect(screen.getByText(/record/i)).toBeInTheDocument();
    });

    it('should show PR exercise name', () => {
      render(<WolfSessionSummary summary={mockSummary} />);
      expect(screen.getByText(/bench press/i)).toBeInTheDocument();
    });

    it('should show PR value', () => {
      render(<WolfSessionSummary summary={mockSummary} />);
      expect(screen.getByText(/100 kg/i)).toBeInTheDocument();
    });

    it('should show improvement from previous', () => {
      render(<WolfSessionSummary summary={mockSummary} />);
      expect(screen.getByText(/\+5/)).toBeInTheDocument();
    });

    it('should hide PR section when no PRs', () => {
      const summaryWithoutPR = { ...mockSummary, personalRecords: [] };
      render(<WolfSessionSummary summary={summaryWithoutPR} />);
      expect(screen.queryByText(/nouveaux records/i)).not.toBeInTheDocument();
    });
  });

  describe('Badges Section', () => {
    it('should show badges earned', () => {
      render(<WolfSessionSummary summary={mockSummary} />);
      expect(screen.getByText(/badge/i)).toBeInTheDocument();
    });

    it('should show badge count', () => {
      render(<WolfSessionSummary summary={mockSummary} />);
      expect(screen.getByText(/2 badge/i)).toBeInTheDocument();
    });

    it('should hide badges section when no badges', () => {
      const summaryWithoutBadges = { ...mockSummary, badges: [] };
      render(<WolfSessionSummary summary={summaryWithoutBadges} />);
      expect(screen.queryByText(/badge.*débloqué/i)).not.toBeInTheDocument();
    });
  });

  describe('Wolf Theme', () => {
    it('should show wolf icon', () => {
      render(<WolfSessionSummary summary={mockSummary} />);
      expect(screen.getByText('🐺')).toBeInTheDocument();
    });

    it('should show motivational message', () => {
      render(<WolfSessionSummary summary={mockSummary} />);
      expect(screen.getByTestId('motivational-message')).toBeInTheDocument();
    });

    it('should show territory stats', () => {
      render(<WolfSessionSummary summary={mockSummary} showTerritoryStats />);
      const elements = screen.getAllByText(/territoire/i);
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe('Comparison', () => {
    it('should show comparison when previousSummary provided', () => {
      const previousSummary = { ...mockSummary, totalWeight: 4500 };
      render(
        <WolfSessionSummary 
          summary={mockSummary} 
          previousSummary={previousSummary}
        />
      );
      expect(screen.getByTestId('improvement-indicator')).toBeInTheDocument();
    });

    it('should show improvement indicator', () => {
      const previousSummary = { ...mockSummary, totalWeight: 4500 };
      render(
        <WolfSessionSummary 
          summary={mockSummary} 
          previousSummary={previousSummary}
        />
      );
      expect(screen.getByTestId('improvement-indicator')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should render share button', () => {
      render(<WolfSessionSummary summary={mockSummary} showActions />);
      expect(screen.getByRole('button', { name: /partager/i })).toBeInTheDocument();
    });

    it('should call onShare when share clicked', () => {
      const onShare = vi.fn();
      render(<WolfSessionSummary summary={mockSummary} showActions onShare={onShare} />);
      fireEvent.click(screen.getByRole('button', { name: /partager/i }));
      expect(onShare).toHaveBeenCalled();
    });

    it('should render close button', () => {
      render(<WolfSessionSummary summary={mockSummary} showActions />);
      expect(screen.getByRole('button', { name: /continuer/i })).toBeInTheDocument();
    });
  });

  describe('Animation', () => {
    it('should animate in when shown', () => {
      render(<WolfSessionSummary summary={mockSummary} animate />);
      expect(screen.getByTestId('wolf-session-summary')).toHaveClass('animate-in');
    });

    it('should animate stats sequentially', () => {
      render(<WolfSessionSummary summary={mockSummary} animate />);
      const stats = screen.getAllByTestId('stat-item');
      stats.forEach((stat, index) => {
        expect(stat).toHaveStyle({ animationDelay: `${index * 100}ms` });
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible structure', () => {
      render(<WolfSessionSummary summary={mockSummary} />);
      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('should have descriptive headings', () => {
      render(<WolfSessionSummary summary={mockSummary} />);
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });
  });
});
