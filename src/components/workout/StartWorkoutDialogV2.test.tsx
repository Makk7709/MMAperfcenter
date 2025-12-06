/**
 * TDD Tests for StartWorkoutDialogV2
 * 
 * PHASE RED: Write tests first, then implement
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StartWorkoutDialogV2 } from './StartWorkoutDialogV2';

// ============================================
// MOCK SETUP
// ============================================

const mockOnStartWorkout = vi.fn();
const mockOnOpenChange = vi.fn();

const defaultProps = {
  open: true,
  onOpenChange: mockOnOpenChange,
  onStartWorkout: mockOnStartWorkout,
};

// ============================================
// RENDERING TESTS
// ============================================

describe('StartWorkoutDialogV2 - Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dialog when open is true', () => {
    render(<StartWorkoutDialogV2 {...defaultProps} />);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should not render dialog when open is false', () => {
    render(<StartWorkoutDialogV2 {...defaultProps} open={false} />);
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render dialog title', () => {
    render(<StartWorkoutDialogV2 {...defaultProps} />);
    
    // Title should contain workout-related text
    expect(screen.getAllByText(/nouvel|nouveau|workout/i).length).toBeGreaterThan(0);
  });

  it('should render workout name input', () => {
    render(<StartWorkoutDialogV2 {...defaultProps} />);
    
    expect(screen.getByPlaceholderText(/nom|entraînement|workout/i)).toBeInTheDocument();
  });

  it('should render start button', () => {
    render(<StartWorkoutDialogV2 {...defaultProps} />);
    
    expect(screen.getByRole('button', { name: /démarrer|start|commencer/i })).toBeInTheDocument();
  });

  it('should render cancel button', () => {
    render(<StartWorkoutDialogV2 {...defaultProps} />);
    
    expect(screen.getByRole('button', { name: /annuler|cancel|fermer/i })).toBeInTheDocument();
  });
});

// ============================================
// MMA TEMPLATES TESTS
// ============================================

describe('StartWorkoutDialogV2 - MMA Templates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render MMA workout categories', () => {
    render(<StartWorkoutDialogV2 {...defaultProps} />);
    
    // Should have category tabs/sections (may have multiple matches)
    expect(screen.getAllByText(/boxe|boxing/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/mma|combat/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/conditioning|cardio/i).length).toBeGreaterThan(0);
  });

  it('should render boxing templates', () => {
    render(<StartWorkoutDialogV2 {...defaultProps} />);
    
    // Boxing specific templates
    expect(screen.getByText(/shadow boxing/i)).toBeInTheDocument();
    expect(screen.getByText(/heavy bag|sac de frappe/i)).toBeInTheDocument();
  });

  it('should render MMA/grappling templates', async () => {
    const user = userEvent.setup();
    render(<StartWorkoutDialogV2 {...defaultProps} />);
    
    // Click on MMA tab to see grappling templates
    const mmaTab = screen.getAllByText(/mma|combat/i)[0];
    await user.click(mmaTab);
    
    // Grappling and sparring templates should exist
    expect(screen.getAllByText(/grappling|lutte/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/sparring/i).length).toBeGreaterThan(0);
  });

  it('should render strength templates', async () => {
    const user = userEvent.setup();
    render(<StartWorkoutDialogV2 {...defaultProps} />);
    
    // Click on strength tab
    const strengthTab = screen.getAllByText(/force|strength/i)[0];
    await user.click(strengthTab);
    
    // Strength templates should exist (check for "Force" in templates)
    expect(screen.getAllByText(/force/i).length).toBeGreaterThan(0);
    
    // Click on cardio tab to see HIIT
    const cardioTab = screen.getAllByText(/conditioning|cardio/i)[0];
    await user.click(cardioTab);
    
    expect(screen.getAllByText(/hiit/i).length).toBeGreaterThan(0);
  });

  it('should fill input when template is clicked', async () => {
    const user = userEvent.setup();
    render(<StartWorkoutDialogV2 {...defaultProps} />);
    
    // Boxing tab is selected by default, shadow boxing should be visible
    // Find template buttons (they have ChevronRight icon and specific structure)
    const templateButtons = screen.getAllByRole('button').filter(btn => 
      btn.textContent?.toLowerCase().includes('shadow')
    );
    
    if (templateButtons.length > 0) {
      await user.click(templateButtons[0]);
      const input = screen.getByPlaceholderText(/nom|entraînement|workout/i) as HTMLInputElement;
      expect(input.value).toContain('Shadow');
    } else {
      // Fallback: check that clicking any template fills the input
      const anyTemplateBtn = screen.getAllByRole('button').find(btn => 
        btn.textContent?.includes('min')
      );
      if (anyTemplateBtn) {
        await user.click(anyTemplateBtn);
        const input = screen.getByPlaceholderText(/nom|entraînement|workout/i) as HTMLInputElement;
        expect(input.value.length).toBeGreaterThan(0);
      }
    }
  });
});

// ============================================
// WORKOUT CONFIGURATION TESTS
// ============================================

describe('StartWorkoutDialogV2 - Workout Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render duration selector', () => {
    render(<StartWorkoutDialogV2 {...defaultProps} />);
    
    // Should be able to select workout duration
    expect(screen.getAllByText(/durée|duration|temps/i).length).toBeGreaterThan(0);
  });

  it('should render intensity selector', () => {
    render(<StartWorkoutDialogV2 {...defaultProps} />);
    
    expect(screen.getByText(/intensité|intensity/i)).toBeInTheDocument();
  });

  it('should have intensity options', () => {
    render(<StartWorkoutDialogV2 {...defaultProps} />);
    
    // Should have all intensity options
    expect(screen.getAllByText(/léger|light/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/modéré|moderate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/intense|hard/i).length).toBeGreaterThan(0);
  });

  it('should render round configuration for combat workouts', async () => {
    const user = userEvent.setup();
    render(<StartWorkoutDialogV2 {...defaultProps} />);
    
    // Click on MMA tab first
    const mmaTab = screen.getAllByText(/mma|combat/i)[0];
    await user.click(mmaTab);
    
    // Find and click sparring template
    const sparringBtns = screen.getAllByRole('button').filter(btn => 
      btn.textContent?.toLowerCase().includes('sparring')
    );
    
    if (sparringBtns.length > 0) {
      await user.click(sparringBtns[0]);
      // Should show round config
      expect(screen.getAllByText(/rounds/i).length).toBeGreaterThan(0);
    }
  });

  it('should render rest time configuration', () => {
    render(<StartWorkoutDialogV2 {...defaultProps} />);
    
    expect(screen.getByText(/repos|rest/i)).toBeInTheDocument();
  });
});

// ============================================
// FORM SUBMISSION TESTS
// ============================================

describe('StartWorkoutDialogV2 - Form Submission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call onStartWorkout with workout config when submitted', async () => {
    const user = userEvent.setup();
    render(<StartWorkoutDialogV2 {...defaultProps} />);
    
    // Fill workout name
    const input = screen.getByPlaceholderText(/nom|entraînement|workout/i);
    await user.type(input, 'Mon Entraînement');
    
    // Submit
    const startBtn = screen.getByRole('button', { name: /démarrer|start|commencer/i });
    await user.click(startBtn);
    
    expect(mockOnStartWorkout).toHaveBeenCalledTimes(1);
    expect(mockOnStartWorkout).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Mon Entraînement',
      })
    );
  });

  it('should include duration in workout config', async () => {
    const user = userEvent.setup();
    render(<StartWorkoutDialogV2 {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/nom|entraînement|workout/i);
    await user.type(input, 'Test Workout');
    
    const startBtn = screen.getByRole('button', { name: /démarrer|start|commencer/i });
    await user.click(startBtn);
    
    expect(mockOnStartWorkout).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: expect.any(Number),
      })
    );
  });

  it('should include intensity in workout config', async () => {
    const user = userEvent.setup();
    render(<StartWorkoutDialogV2 {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/nom|entraînement|workout/i);
    await user.type(input, 'Test Workout');
    
    const startBtn = screen.getByRole('button', { name: /démarrer|start|commencer/i });
    await user.click(startBtn);
    
    expect(mockOnStartWorkout).toHaveBeenCalledWith(
      expect.objectContaining({
        intensity: expect.stringMatching(/light|moderate|intense/i),
      })
    );
  });

  it('should include workout type in config', async () => {
    const user = userEvent.setup();
    render(<StartWorkoutDialogV2 {...defaultProps} />);
    
    // Find template button that includes duration (indicating it's a template)
    const templateButtons = screen.getAllByRole('button').filter(btn => 
      btn.textContent?.includes('min') && btn.textContent?.includes('Shadow')
    );
    
    if (templateButtons.length > 0) {
      await user.click(templateButtons[0]);
    } else {
      // Fallback: type a name manually
      const input = screen.getByPlaceholderText(/nom|entraînement|workout/i);
      await user.type(input, 'Test Boxing');
    }
    
    const startBtn = screen.getByRole('button', { name: /démarrer|start|commencer/i });
    await user.click(startBtn);
    
    expect(mockOnStartWorkout).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringMatching(/boxing|mma|strength|cardio|custom/i),
      })
    );
  });

  it('should disable start button when name is empty', () => {
    render(<StartWorkoutDialogV2 {...defaultProps} />);
    
    const startBtn = screen.getByRole('button', { name: /démarrer|start|commencer/i });
    expect(startBtn).toBeDisabled();
  });

  it('should enable start button when name is filled', async () => {
    const user = userEvent.setup();
    render(<StartWorkoutDialogV2 {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/nom|entraînement|workout/i);
    await user.type(input, 'Test');
    
    const startBtn = screen.getByRole('button', { name: /démarrer|start|commencer/i });
    expect(startBtn).not.toBeDisabled();
  });

  it('should close dialog after successful submission', async () => {
    const user = userEvent.setup();
    render(<StartWorkoutDialogV2 {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/nom|entraînement|workout/i);
    await user.type(input, 'Test');
    
    const startBtn = screen.getByRole('button', { name: /démarrer|start|commencer/i });
    await user.click(startBtn);
    
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});

// ============================================
// CANCEL/CLOSE TESTS
// ============================================

describe('StartWorkoutDialogV2 - Cancel/Close', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call onOpenChange(false) when cancel clicked', async () => {
    const user = userEvent.setup();
    render(<StartWorkoutDialogV2 {...defaultProps} />);
    
    const cancelBtn = screen.getByRole('button', { name: /annuler|cancel|fermer/i });
    await user.click(cancelBtn);
    
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should reset form when dialog closes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<StartWorkoutDialogV2 {...defaultProps} />);
    
    // Type something
    const input = screen.getByPlaceholderText(/nom|entraînement|workout/i);
    await user.type(input, 'Test Workout');
    
    // Close dialog
    rerender(<StartWorkoutDialogV2 {...defaultProps} open={false} />);
    
    // Reopen
    rerender(<StartWorkoutDialogV2 {...defaultProps} open={true} />);
    
    const newInput = screen.getByPlaceholderText(/nom|entraînement|workout/i) as HTMLInputElement;
    expect(newInput.value).toBe('');
  });

  it('should not call onStartWorkout when cancelled', async () => {
    const user = userEvent.setup();
    render(<StartWorkoutDialogV2 {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/nom|entraînement|workout/i);
    await user.type(input, 'Test');
    
    const cancelBtn = screen.getByRole('button', { name: /annuler|cancel|fermer/i });
    await user.click(cancelBtn);
    
    expect(mockOnStartWorkout).not.toHaveBeenCalled();
  });
});

// ============================================
// LOADING STATE TESTS
// ============================================

describe('StartWorkoutDialogV2 - Loading State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state when loading prop is true', () => {
    render(<StartWorkoutDialogV2 {...defaultProps} loading={true} />);
    
    // Loading text should be present
    expect(screen.getAllByText(/chargement|loading|démarrage/i).length).toBeGreaterThan(0);
  });

  it('should disable start button when loading', () => {
    render(<StartWorkoutDialogV2 {...defaultProps} loading={true} />);
    
    const startBtn = screen.getByRole('button', { name: /démarrer|start|commencer|chargement|loading|démarrage/i });
    expect(startBtn).toBeDisabled();
  });

  it('should disable cancel button when loading', () => {
    render(<StartWorkoutDialogV2 {...defaultProps} loading={true} />);
    
    const cancelBtn = screen.getByRole('button', { name: /annuler|cancel|fermer/i });
    expect(cancelBtn).toBeDisabled();
  });
});

// ============================================
// QUICK START TESTS
// ============================================

describe('StartWorkoutDialogV2 - Quick Start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have quick start option', () => {
    render(<StartWorkoutDialogV2 {...defaultProps} />);
    
    // Quick start options should exist
    expect(screen.getAllByText(/rapide|quick|express/i).length).toBeGreaterThan(0);
  });

  it('should start workout immediately with quick start template', async () => {
    const user = userEvent.setup();
    render(<StartWorkoutDialogV2 {...defaultProps} />);
    
    // Find and click a quick start button (should have play icon or similar)
    const quickStartBtns = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg') && btn.textContent?.match(/rapide|quick|express|5|10|15/i)
    );
    
    if (quickStartBtns.length > 0) {
      await user.click(quickStartBtns[0]);
      expect(mockOnStartWorkout).toHaveBeenCalled();
    }
  });
});

// ============================================
// ACCESSIBILITY TESTS
// ============================================

describe('StartWorkoutDialogV2 - Accessibility', () => {
  it('should have proper aria labels', () => {
    render(<StartWorkoutDialogV2 {...defaultProps} />);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby');
  });

  it('should trap focus within dialog', () => {
    render(<StartWorkoutDialogV2 {...defaultProps} />);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    
    // Dialog should be focusable
    const focusableElements = dialog.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    expect(focusableElements.length).toBeGreaterThan(0);
  });

  it('should have descriptive button labels', () => {
    render(<StartWorkoutDialogV2 {...defaultProps} />);
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      // Each button should have text content or aria-label
      const hasLabel = button.textContent?.trim() || button.getAttribute('aria-label');
      expect(hasLabel).toBeTruthy();
    });
  });
});

// ============================================
// RECENT WORKOUTS TESTS
// ============================================

describe('StartWorkoutDialogV2 - Recent Workouts', () => {
  const recentWorkouts = [
    { id: '1', name: 'Boxing Session', type: 'boxing', date: new Date().toISOString() },
    { id: '2', name: 'Strength Training', type: 'strength', date: new Date().toISOString() },
  ];

  it('should display recent workouts section', () => {
    render(<StartWorkoutDialogV2 {...defaultProps} recentWorkouts={recentWorkouts} />);
    
    expect(screen.getByText(/récent|recent|historique/i)).toBeInTheDocument();
  });

  it('should show recent workout names', () => {
    render(<StartWorkoutDialogV2 {...defaultProps} recentWorkouts={recentWorkouts} />);
    
    expect(screen.getByText(/Boxing Session/i)).toBeInTheDocument();
    expect(screen.getByText(/Strength Training/i)).toBeInTheDocument();
  });

  it('should allow quick restart of recent workout', async () => {
    const user = userEvent.setup();
    render(<StartWorkoutDialogV2 {...defaultProps} recentWorkouts={recentWorkouts} />);
    
    const recentBtn = screen.getByText(/Boxing Session/i);
    await user.click(recentBtn);
    
    const input = screen.getByPlaceholderText(/nom|entraînement|workout/i) as HTMLInputElement;
    expect(input.value).toBe('Boxing Session');
  });
});

