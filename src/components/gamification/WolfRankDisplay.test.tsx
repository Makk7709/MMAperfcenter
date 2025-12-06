/**
 * TDD Tests for WolfRankDisplay Component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WolfRankDisplay } from './WolfRankDisplay';

describe('WolfRankDisplay', () => {
  describe('Rendering', () => {
    it('should render current rank name', () => {
      render(<WolfRankDisplay currentXP={0} />);
      // Use getAllByText since there might be multiple instances
      const elements = screen.getAllByText(/louveteau/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should render rank icon', () => {
      render(<WolfRankDisplay currentXP={0} />);
      const elements = screen.getAllByText('🐺');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should render XP count', () => {
      render(<WolfRankDisplay currentXP={250} />);
      expect(screen.getByText(/250/)).toBeInTheDocument();
    });

    it('should render progress bar', () => {
      render(<WolfRankDisplay currentXP={250} />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should show next rank info', () => {
      render(<WolfRankDisplay currentXP={250} />);
      expect(screen.getByText(/prochain.*loup solitaire/i)).toBeInTheDocument();
    });
  });

  describe('Rank Progression', () => {
    it('should show Louveteau for 0 XP', () => {
      render(<WolfRankDisplay currentXP={0} />);
      const elements = screen.getAllByText(/louveteau/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should show Loup Solitaire for 500 XP', () => {
      render(<WolfRankDisplay currentXP={500} />);
      // The rank name should appear in the main display
      const container = screen.getByTestId('wolf-rank-display');
      expect(container.textContent).toMatch(/loup solitaire/i);
    });

    it('should show Loup Garou for 30000+ XP', () => {
      render(<WolfRankDisplay currentXP={30000} />);
      const container = screen.getByTestId('wolf-rank-display');
      expect(container.textContent).toMatch(/loup garou/i);
    });

    it('should show max rank message at Loup Garou', () => {
      render(<WolfRankDisplay currentXP={30000} />);
      const elements = screen.getAllByText(/légende|max|ultime/i);
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe('Progress Calculation', () => {
    it('should show 0% progress at rank start', () => {
      render(<WolfRankDisplay currentXP={0} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('should show 50% progress at midpoint', () => {
      render(<WolfRankDisplay currentXP={250} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    });

    it('should show 100% at max rank', () => {
      render(<WolfRankDisplay currentXP={30000} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });
  });

  describe('Visual Variants', () => {
    it('should support compact variant', () => {
      render(<WolfRankDisplay currentXP={500} variant="compact" />);
      expect(screen.getByTestId('wolf-rank-display')).toHaveClass('compact');
    });

    it('should support full variant', () => {
      render(<WolfRankDisplay currentXP={500} variant="full" />);
      expect(screen.getByTestId('wolf-rank-display')).toHaveClass('full');
    });
  });

  describe('Animation', () => {
    it('should have animation class when showAnimation is true', () => {
      render(<WolfRankDisplay currentXP={500} showAnimation />);
      expect(screen.getByTestId('wolf-rank-display')).toHaveClass('animate');
    });
  });
});

