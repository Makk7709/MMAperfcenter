import { useCallback, useEffect, useState } from "react";

interface StopwatchState {
  accumulatedMs: number;
  runningSince: number | null;
}

const readState = (key: string | null): StopwatchState => {
  if (!key) return { accumulatedMs: 0, runningSince: null };
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as StopwatchState;
      if (typeof parsed.accumulatedMs === "number") return parsed;
    }
  } catch {
    /* corrupted entry: start fresh */
  }
  return { accumulatedMs: 0, runningSince: null };
};

const useTick = (active: boolean, intervalMs = 250) => {
  const [, setNow] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
};

/**
 * Pausable stopwatch computed from wall-clock timestamps, so it stays exact when
 * the phone throttles timers or the page reloads (state persisted under `storageKey`).
 * `storageKey` is read once: remount the component (React `key`) to switch it.
 */
export function useStopwatch(storageKey: string | null) {
  const [state, setState] = useState<StopwatchState>(() => readState(storageKey));

  useEffect(() => {
    if (!storageKey) return;
    if (state.accumulatedMs === 0 && state.runningSince === null) localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, JSON.stringify(state));
  }, [storageKey, state]);

  const running = state.runningSince !== null;
  useTick(running);

  const elapsedMs = state.accumulatedMs + (state.runningSince ? Date.now() - state.runningSince : 0);

  const start = useCallback(() => setState((s) => (s.runningSince ? s : { ...s, runningSince: Date.now() })), []);
  const pause = useCallback(
    () => setState((s) => (s.runningSince ? { accumulatedMs: s.accumulatedMs + Date.now() - s.runningSince, runningSince: null } : s)),
    [],
  );
  const reset = useCallback(() => setState({ accumulatedMs: 0, runningSince: null }), []);

  return { elapsed: elapsedMs / 1000, running, start, pause, reset };
}

/** Countdown to a wall-clock deadline (rest between sets). */
export function useCountdown() {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  useTick(endsAt !== null);

  const remaining = endsAt ? Math.max(0, (endsAt - Date.now()) / 1000) : 0;

  const start = useCallback((seconds: number) => {
    setTotal(seconds);
    setEndsAt(Date.now() + seconds * 1000);
  }, []);
  const add = useCallback((seconds: number) => {
    setTotal((t) => t + seconds);
    setEndsAt((e) => (e ? e + seconds * 1000 : e));
  }, []);
  const stop = useCallback(() => setEndsAt(null), []);

  return { active: endsAt !== null, remaining, total, start, add, stop };
}
