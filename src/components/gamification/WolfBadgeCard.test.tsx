/**
 * TDD Tests for WolfBadgeCard Component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WolfBadgeCard } from './WolfBadgeCard';
import { WOLF_BADGES } from '@/utils/gamification/wolfPack';

describe('WolfBadgeCard', () => {
  const mockBadge = WOLF_BADGES[0]; // first_hunt

  describe('Rendering', () => {
    it('should render badge icon', () => {
      render(<WolfBadgeCard badge={mockBadge} unlocked />);
      expect(screen.getByText(mockBadge.icon)).toBeInTheDocument();
    });

    it('should render badge name', () => {
      render(<WolfBadgeCard badge={mockBadge} unlocked />);
      expect(screen.getByText(mockBadge.name)).toBeInTheDocument();
    });

    it('should render badge description', () => {
      render(<WolfBadgeCard badge={mockBadge} unlocked />);
      expect(screen.getByText(mockBadge.description)).toBeInTheDocument();
    });

    it('should render badge category', () => {
      render(<WolfBadgeCard badge={mockBadge} unlocked />);
      expect(screen.getByText(/milestone/i)).toBeInTheDocument();
    });
  });

  describe('Unlock State', () => {
    it('should show unlocked state when unlocked is true', () => {
      render(<WolfBadgeCard badge={mockBadge} unlocked />);
      expect(screen.getByTestId('wolf-badge-card')).toHaveClass('unlocked');
    });

    it('should show locked state when unlocked is false', () => {
      render(<WolfBadgeCard badge={mockBadge} unlocked={false} />);
      expect(screen.getByTestId('wolf-badge-card')).toHaveClass('locked');
    });

    it('should show lock icon when locked', () => {
      render(<WolfBadgeCard badge={mockBadge} unlocked={false} />);
      expect(screen.getByTestId('lock-icon')).toBeInTheDocument();
    });

    it('should hide lock icon when unlocked', () => {
      render(<WolfBadgeCard badge={mockBadge} unlocked />);
      expect(screen.queryByTestId('lock-icon')).not.toBeInTheDocument();
    });
  });

  describe('XP Display', () => {
    it('should show XP reward when unlocked', () => {
      render(<WolfBadgeCard badge={mockBadge} unlocked />);
      expect(screen.getByText(/\+50/)).toBeInTheDocument();
    });

    it('should show XP requirement when locked', () => {
      render(<WolfBadgeCard badge={mockBadge} unlocked={false} />);
      expect(screen.getByText(/50 xp/i)).toBeInTheDocument();
    });
  });

  describe('Rarity Display', () => {
    it('should show legendary badge style for high XP', () => {
      const legendaryBadge = WOLF_BADGES.find(b => b.xpReward >= 500);
      if (legendaryBadge) {
        render(<WolfBadgeCard badge={legendaryBadge} unlocked />);
        expect(screen.getByTestId('wolf-badge-card')).toHaveClass('legendary');
      }
    });

    it('should show common badge style for low XP', () => {
      render(<WolfBadgeCard badge={mockBadge} unlocked />);
      expect(screen.getByTestId('wolf-badge-card')).toHaveClass('common');
    });
  });

  describe('Interaction', () => {
    it('should call onClick when clicked', () => {
      const handleClick = vi.fn();
      render(<WolfBadgeCard badge={mockBadge} unlocked onClick={handleClick} />);
      fireEvent.click(screen.getByTestId('wolf-badge-card'));
      expect(handleClick).toHaveBeenCalledWith(mockBadge);
    });

    it('should not call onClick when locked and clickDisabledWhenLocked is true', () => {
      const handleClick = vi.fn();
      render(
        <WolfBadgeCard 
          badge={mockBadge} 
          unlocked={false} 
          onClick={handleClick}
          clickDisabledWhenLocked 
        />
      );
      fireEvent.click(screen.getByTestId('wolf-badge-card'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Animation', () => {
    it('should show unlock animation when showUnlockAnimation is true', () => {
      render(<WolfBadgeCard badge={mockBadge} unlocked showUnlockAnimation />);
      expect(screen.getByTestId('wolf-badge-card')).toHaveClass('unlock-animation');
    });

    it('should have hover effect class', () => {
      render(<WolfBadgeCard badge={mockBadge} unlocked />);
      expect(screen.getByTestId('wolf-badge-card')).toHaveClass('hover-effect');
    });
  });

  describe('Size Variants', () => {
    it('should support small size', () => {
      render(<WolfBadgeCard badge={mockBadge} unlocked size="sm" />);
      expect(screen.getByTestId('wolf-badge-card')).toHaveClass('size-sm');
    });

    it('should support medium size (default)', () => {
      render(<WolfBadgeCard badge={mockBadge} unlocked />);
      expect(screen.getByTestId('wolf-badge-card')).toHaveClass('size-md');
    });

    it('should support large size', () => {
      render(<WolfBadgeCard badge={mockBadge} unlocked size="lg" />);
      expect(screen.getByTestId('wolf-badge-card')).toHaveClass('size-lg');
    });
  });

  describe('Progress', () => {
    it('should show progress when provided', () => {
      render(
        <WolfBadgeCard 
          badge={mockBadge} 
          unlocked={false} 
          progress={{ current: 3, total: 10 }}
        />
      );
      expect(screen.getByText(/3\/10/)).toBeInTheDocument();
    });

    it('should show progress bar when progress provided', () => {
      render(
        <WolfBadgeCard 
          badge={mockBadge} 
          unlocked={false} 
          progress={{ current: 5, total: 10 }}
        />
      );
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible role', () => {
      render(<WolfBadgeCard badge={mockBadge} unlocked />);
      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('should have aria-label', () => {
      render(<WolfBadgeCard badge={mockBadge} unlocked />);
      expect(screen.getByRole('article')).toHaveAttribute('aria-label');
    });
  });
});

