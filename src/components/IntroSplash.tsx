import { useCallback, useEffect, useRef, useState } from "react";
import introVideo from "@/assets/intro/korev-intro.mp4";
import { cn } from "@/lib/utils";
import { markIntroSeen } from "@/lib/intro";

/** A slow network must not keep the visitor in front of a black screen. */
const START_TIMEOUT_MS = 4000;
const MAX_DURATION_MS = 15000;
const FADE_MS = 700;

export function IntroSplash({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [leaving, setLeaving] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const finish = useCallback(() => setLeaving(true), []);

  useEffect(() => {
    markIntroSeen();
    const video = videoRef.current;
    if (!video) return;
    // iOS only autoplays inline if the element is muted before play().
    video.muted = true;
    video.defaultMuted = true;
    video.play().catch(finish);

    let started = false;
    const onPlaying = () => {
      started = true;
    };
    video.addEventListener("playing", onPlaying);
    const startTimer = window.setTimeout(() => {
      if (!started) finish();
    }, START_TIMEOUT_MS);
    const maxTimer = window.setTimeout(finish, MAX_DURATION_MS);
    const skipTimer = window.setTimeout(() => setCanSkip(true), 1000);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      video.removeEventListener("playing", onPlaying);
      window.clearTimeout(startTimer);
      window.clearTimeout(maxTimer);
      window.clearTimeout(skipTimer);
      window.removeEventListener("keydown", onKey);
    };
  }, [finish]);

  useEffect(() => {
    if (!leaving) return;
    videoRef.current?.pause();
    const timer = window.setTimeout(() => doneRef.current(), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  return (
    <div
      role="dialog"
      aria-label="Introduction KOREV"
      className={cn(
        "fixed inset-0 z-[200] bg-black transition-opacity ease-out",
        leaving ? "pointer-events-none opacity-0" : "opacity-100",
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <video
        ref={videoRef}
        src={introVideo}
        muted
        playsInline
        autoPlay
        preload="auto"
        disablePictureInPicture
        aria-hidden="true"
        onEnded={finish}
        onError={finish}
        className="h-full w-full object-cover portrait:object-contain"
      />
      <button
        type="button"
        onClick={finish}
        tabIndex={canSkip ? 0 : -1}
        className={cn(
          "korev-eyebrow absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-6 border border-white/20 bg-black/40 px-4 py-2 text-white/70 backdrop-blur-sm transition-opacity duration-500 hover:border-korev-gold/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-korev-gold",
          canSkip ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        Passer
      </button>
    </div>
  );
}
