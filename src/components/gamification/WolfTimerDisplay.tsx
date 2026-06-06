/**
 * WolfTimerDisplay Component
 * A wolf-themed workout timer with round support
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TIMER_PRESETS, getPresetByName, formatTime } from '@/utils/gamification/wolfTimer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type SoundType = 'howl' | 'bell' | 'mute';
type TimerMode = 'simple' | 'rounds';
type TimerState = 'idle' | 'running' | 'paused';
type PhaseType = 'work' | 'rest';

interface WolfTimerDisplayProps {
  initialTime?: number;
  mode?: TimerMode;
  rounds?: number;
  roundDuration?: number;
  restDuration?: number;
  showSoundSelector?: boolean;
  showPresets?: boolean;
  showProgressCircle?: boolean;
  onComplete?: () => void;
  onStart?: () => void;
  onPause?: () => void;
  onRoundChange?: (round: number) => void;
  className?: string;
}

export function WolfTimerDisplay({
  initialTime = 180,
  mode = 'simple',
  rounds = 3,
  roundDuration = 180,
  restDuration = 60,
  showSoundSelector = false,
  showPresets = false,
  showProgressCircle = false,
  onComplete,
  onStart,
  onPause,
  onRoundChange,
  className
}: WolfTimerDisplayProps) {
  const [timeLeft, setTimeLeft] = useState(mode === 'rounds' ? roundDuration : initialTime);
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [currentRound, setCurrentRound] = useState(1);
  const [phase, setPhase] = useState<PhaseType>('work');
  const [soundType, setSoundType] = useState<SoundType>('howl');
  const [totalInitialTime, setTotalInitialTime] = useState(mode === 'rounds' ? roundDuration : initialTime);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const completedRef = useRef(false);

  const isWarning = timeLeft <= 10 && timerState === 'running';

  // Wolf icon state based on timer state
  const getWolfState = () => {
    if (timerState === 'running') return 'hunting';
    if (timerState === 'paused') return 'resting';
    return 'idle';
  };

  // Handle timer countdown
  useEffect(() => {
    if (timerState === 'running' && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState]);

  // Handle timer completion
  useEffect(() => {
    if (timeLeft === 0 && timerState === 'running' && !completedRef.current) {
      if (mode === 'rounds') {
        if (phase === 'work') {
          // End of round, start rest
          setPhase('rest');
          setTimeLeft(restDuration);
          setTotalInitialTime(restDuration);
        } else {
          // End of rest, start next round
          if (currentRound < rounds) {
            const nextRound = currentRound + 1;
            setCurrentRound(nextRound);
            setPhase('work');
            setTimeLeft(roundDuration);
            setTotalInitialTime(roundDuration);
            onRoundChange?.(nextRound);
          } else {
            // All rounds completed
            completedRef.current = true;
            setTimerState('idle');
            onComplete?.();
          }
        }
      } else {
        // Simple mode - just complete
        completedRef.current = true;
        setTimerState('idle');
        onComplete?.();
      }
    }
  }, [timeLeft, timerState, mode, phase, currentRound, rounds, roundDuration, restDuration, onComplete, onRoundChange]);

  const handleStart = useCallback(() => {
    completedRef.current = false;
    setTimerState('running');
    onStart?.();
  }, [onStart]);

  const handlePause = useCallback(() => {
    setTimerState('paused');
    onPause?.();
  }, [onPause]);

  const handleResume = useCallback(() => {
    setTimerState('running');
  }, []);

  const handleReset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    completedRef.current = false;
    setTimerState('idle');
    setCurrentRound(1);
    setPhase('work');
    const newTime = mode === 'rounds' ? roundDuration : initialTime;
    setTimeLeft(newTime);
    setTotalInitialTime(newTime);
  }, [mode, roundDuration, initialTime]);

  const applyPreset = useCallback((presetName: string) => {
    const preset = getPresetByName(presetName);
    if (preset) {
      setTimeLeft(preset.roundDuration);
      setTotalInitialTime(preset.roundDuration);
    }
  }, []);

  const progress = totalInitialTime > 0 
    ? Math.round(((totalInitialTime - timeLeft) / totalInitialTime) * 100)
    : 0;

  return (
    <div
      data-testid="wolf-timer"
      className={cn(
        'flex flex-col items-center gap-4 p-6 rounded-xl',
        'bg-gradient-to-br from-slate-900 to-slate-800 border border-amber-500/20',
        isWarning && 'warning border-red-500/50 animate-pulse',
        className
      )}
    >
      {/* Wolf Icon */}
      <div
        data-testid="wolf-icon"
        data-state={getWolfState()}
        className={cn(
          'text-6xl transition-transform duration-300',
          timerState === 'running' && 'animate-bounce'
        )}
      >
        {phase === 'rest' ? '😴' : '🐺'}
      </div>

      {/* Wolf-themed message */}
      <p className="text-sm text-amber-400 italic">
        {timerState === 'idle' && 'La chasse commence... 🌙'}
        {timerState === 'running' && phase === 'work' && 'En plein combat! 💪'}
        {timerState === 'running' && phase === 'rest' && 'Repos de la meute...'}
        {timerState === 'paused' && 'Meute en attente...'}
      </p>

      {/* Round Counter (for round mode) */}
      {mode === 'rounds' && (
        <div className="flex items-center gap-2 text-slate-300">
          <span className="font-bold text-amber-400">Round {currentRound}</span>
          <span>/{rounds}</span>
          {phase === 'rest' && (
            <span className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-sm">
              Repos
            </span>
          )}
        </div>
      )}

      {/* Progress Circle */}
      {showProgressCircle && (
        <div
          data-testid="progress-circle"
          data-progress={progress}
          className="relative w-32 h-32"
        >
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="56"
              className="stroke-slate-700 fill-none"
              strokeWidth="8"
            />
            <circle
              cx="64"
              cy="64"
              r="56"
              className={cn(
                'fill-none transition-all duration-300',
                isWarning ? 'stroke-red-500' : 'stroke-amber-500'
              )}
              strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 56}`}
              strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress / 100)}`}
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}

      {/* Time Display */}
      <div
        role="timer"
        aria-live="polite"
        className={cn(
          'text-6xl font-mono font-bold',
          isWarning ? 'text-red-500' : 'text-white'
        )}
      >
        {formatTime(timeLeft)}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {timerState === 'idle' && (
          <Button
            onClick={handleStart}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
          >
            <Play className="w-4 h-4 mr-2" />
            La Chasse Commence
          </Button>
        )}
        
        {timerState === 'running' && (
          <Button
            onClick={handlePause}
            variant="outline"
            className="border-amber-500 text-amber-400"
          >
            <Pause className="w-4 h-4 mr-2" />
            Pause
          </Button>
        )}
        
        {timerState === 'paused' && (
          <Button
            onClick={handleResume}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            <Play className="w-4 h-4 mr-2" />
            Reprendre
          </Button>
        )}

        {(timerState === 'running' || timerState === 'paused') && (
          <Button
            onClick={handleReset}
            variant="ghost"
            className="text-slate-400 hover:text-white"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        )}
      </div>

      {/* Sound Selector */}
      {showSoundSelector && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              data-testid="sound-selector"
              variant="ghost"
              size="sm"
              className="text-slate-400"
            >
              {soundType === 'mute' ? (
                <VolumeX className="w-4 h-4 mr-2" />
              ) : (
                <Volume2 className="w-4 h-4 mr-2" />
              )}
              Son
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setSoundType('howl')}>
              🐺 Hurlement de Loup
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSoundType('bell')}>
              🔔 Cloche
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSoundType('mute')}>
              🔇 Muet
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Presets */}
      {showPresets && (
        <div className="flex gap-2 flex-wrap justify-center">
          {TIMER_PRESETS.map(preset => (
            <Button
              key={preset.name}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(preset.name)}
              className="text-xs border-slate-600 hover:border-amber-500"
            >
              {preset.name}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

