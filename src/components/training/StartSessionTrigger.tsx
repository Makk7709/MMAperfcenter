import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { StartWorkoutDialogV2, type WorkoutConfig } from "@/components/workout/StartWorkoutDialogV2";
import { useActiveWorkout, useTrainingProgress } from "@/hooks/useTraining";
import { SESSION_PATH } from "@/lib/training/session";
import { unlockAudio } from "@/lib/training/sound";

interface StartSessionTriggerProps {
  defaultType?: "boxing" | "mma" | "strength" | "cardio";
  /** Renders the trigger; `active` means a session is already running and will be resumed. */
  children: (state: { active: boolean; onClick: () => void; loading: boolean }) => ReactNode;
}

/** Starts a new session, or resumes the running one: there is only ever one open session. */
export function StartSessionTrigger({ defaultType, children }: StartSessionTriggerProps) {
  const navigate = useNavigate();
  const { workout, isLoading, pending, start } = useActiveWorkout();
  const { data: progress } = useTrainingProgress();
  const [open, setOpen] = useState(false);

  const onClick = () => {
    unlockAudio();
    if (workout) navigate(SESSION_PATH);
    else setOpen(true);
  };

  const onStart = async (config: WorkoutConfig) => {
    const created = await start({
      name: config.name,
      type: config.type,
      intensity: config.intensity,
      rounds: config.rounds,
      roundDuration: config.roundDuration,
      restDuration: config.restDuration,
    });
    if (created) navigate(SESSION_PATH);
  };

  return (
    <>
      {children({ active: !!workout, onClick, loading: isLoading || pending })}
      <StartWorkoutDialogV2
        open={open}
        onOpenChange={setOpen}
        onStartWorkout={onStart}
        loading={pending}
        defaultType={defaultType}
        recentWorkouts={progress?.recent.map((r) => ({ id: r.id, name: r.name, type: r.session_type, date: r.completed_at }))}
      />
    </>
  );
}
