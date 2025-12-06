/**
 * TDD Tests for WolfTimerDisplay Component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { WolfTimerDisplay } from './WolfTimerDisplay';

describe('WolfTimerDisplay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render timer display', () => {
      render(<WolfTimerDisplay />);
      expect(screen.getByTestId('wolf-timer')).toBeInTheDocument();
    });

    it('should render start button initially', () => {
      render(<WolfTimerDisplay />);
      expect(screen.getByRole('button', { name: /chasse/i })).toBeInTheDocument();
    });

    it('should render time display', () => {
      render(<WolfTimerDisplay initialTime={180} />);
      expect(screen.getByText(/3:00/)).toBeInTheDocument();
    });

    it('should render wolf icon', () => {
      render(<WolfTimerDisplay />);
      expect(screen.getByTestId('wolf-icon')).toBeInTheDocument();
    });
  });

  describe('Timer Controls', () => {
    it('should start timer when start button clicked', () => {
      render(<WolfTimerDisplay initialTime={60} />);
      fireEvent.click(screen.getByRole('button', { name: /chasse/i }));
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    });

    it('should pause timer when pause button clicked', () => {
      render(<WolfTimerDisplay initialTime={60} />);
      fireEvent.click(screen.getByRole('button', { name: /chasse/i }));
      fireEvent.click(screen.getByRole('button', { name: /pause/i }));
      expect(screen.getByRole('button', { name: /reprendre/i })).toBeInTheDocument();
    });

    it('should reset timer when reset button clicked', () => {
      render(<WolfTimerDisplay initialTime={60} />);
      fireEvent.click(screen.getByRole('button', { name: /chasse/i }));
      act(() => { vi.advanceTimersByTime(10000); });
      fireEvent.click(screen.getByRole('button', { name: /reset/i }));
      expect(screen.getByText(/1:00/)).toBeInTheDocument();
    });
  });

  describe('Countdown', () => {
    it('should count down every second', () => {
      render(<WolfTimerDisplay initialTime={60} />);
      fireEvent.click(screen.getByRole('button', { name: /chasse/i }));
      act(() => { vi.advanceTimersByTime(1000); });
      expect(screen.getByText(/0:59/)).toBeInTheDocument();
    });

    it('should stop at 0', () => {
      render(<WolfTimerDisplay initialTime={2} />);
      fireEvent.click(screen.getByRole('button', { name: /chasse/i }));
      act(() => { vi.advanceTimersByTime(5000); });
      expect(screen.getByText(/0:00/)).toBeInTheDocument();
    });

    it('should call onComplete when timer reaches 0', () => {
      const onComplete = vi.fn();
      render(<WolfTimerDisplay initialTime={2} onComplete={onComplete} />);
      fireEvent.click(screen.getByRole('button', { name: /chasse/i }));
      act(() => { vi.advanceTimersByTime(3000); });
      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('Round Mode', () => {
    it('should show round counter in round mode', () => {
      render(
        <WolfTimerDisplay 
          mode="rounds"
          rounds={5}
          roundDuration={180}
          restDuration={60}
        />
      );
      expect(screen.getByText(/round 1/i)).toBeInTheDocument();
    });

    it('should show total rounds', () => {
      render(
        <WolfTimerDisplay 
          mode="rounds"
          rounds={5}
          roundDuration={180}
          restDuration={60}
        />
      );
      expect(screen.getByText(/\/5/)).toBeInTheDocument();
    });

    it('should switch to rest after round ends', () => {
      render(
        <WolfTimerDisplay 
          mode="rounds"
          rounds={5}
          roundDuration={3}
          restDuration={60}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /chasse/i }));
      act(() => { vi.advanceTimersByTime(4000); });
      // Check that we're in rest phase - either by text or by the sleep emoji
      const container = screen.getByTestId('wolf-timer');
      expect(container.textContent).toMatch(/repos|😴/i);
    });
  });

  describe('Wolf Theme', () => {
    it('should show wolf-themed start message', () => {
      render(<WolfTimerDisplay />);
      const elements = screen.getAllByText(/chasse/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should show warning when time is low', () => {
      render(<WolfTimerDisplay initialTime={10} />);
      fireEvent.click(screen.getByRole('button', { name: /chasse/i }));
      act(() => { vi.advanceTimersByTime(1000); });
      expect(screen.getByTestId('wolf-timer')).toHaveClass('warning');
    });

    it('should change icon state based on timer state', () => {
      render(<WolfTimerDisplay />);
      fireEvent.click(screen.getByRole('button', { name: /chasse/i }));
      expect(screen.getByTestId('wolf-icon')).toHaveAttribute('data-state', 'hunting');
    });
  });

  describe('Sound Configuration', () => {
    it('should render sound selector', () => {
      render(<WolfTimerDisplay showSoundSelector />);
      expect(screen.getByTestId('sound-selector')).toBeInTheDocument();
    });
  });

  describe('Presets', () => {
    it('should show preset buttons when showPresets is true', () => {
      render(<WolfTimerDisplay showPresets />);
      expect(screen.getByText(/boxing/i)).toBeInTheDocument();
    });

    it('should apply boxing preset', () => {
      render(<WolfTimerDisplay showPresets />);
      fireEvent.click(screen.getByText(/boxing/i));
      expect(screen.getByText(/3:00/)).toBeInTheDocument();
    });

    it('should apply MMA preset', () => {
      render(<WolfTimerDisplay showPresets />);
      fireEvent.click(screen.getByText(/mma/i));
      expect(screen.getByText(/5:00/)).toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('should call onStart when timer starts', () => {
      const onStart = vi.fn();
      render(<WolfTimerDisplay onStart={onStart} />);
      fireEvent.click(screen.getByRole('button', { name: /chasse/i }));
      expect(onStart).toHaveBeenCalled();
    });

    it('should call onPause when timer pauses', () => {
      const onPause = vi.fn();
      render(<WolfTimerDisplay onPause={onPause} />);
      fireEvent.click(screen.getByRole('button', { name: /chasse/i }));
      fireEvent.click(screen.getByRole('button', { name: /pause/i }));
      expect(onPause).toHaveBeenCalled();
    });
  });

  describe('Progress Circle', () => {
    it('should render progress circle', () => {
      render(<WolfTimerDisplay showProgressCircle />);
      expect(screen.getByTestId('progress-circle')).toBeInTheDocument();
    });

    it('should update progress circle during countdown', () => {
      render(<WolfTimerDisplay initialTime={100} showProgressCircle />);
      fireEvent.click(screen.getByRole('button', { name: /chasse/i }));
      act(() => { vi.advanceTimersByTime(50000); });
      const circle = screen.getByTestId('progress-circle');
      expect(circle).toHaveAttribute('data-progress', '50');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible timer region', () => {
      render(<WolfTimerDisplay />);
      expect(screen.getByRole('timer')).toBeInTheDocument();
    });

    it('should announce time changes to screen readers', () => {
      render(<WolfTimerDisplay initialTime={60} />);
      expect(screen.getByRole('timer')).toHaveAttribute('aria-live', 'polite');
    });
  });
});
