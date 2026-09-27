import { useCallback, useEffect, useRef, useState } from "react";
import introVideo from "@/assets/intro/korev-intro.mp4";
import { cn } from "@/lib/utils";
import { markIntroSeen } from "@/lib/intro";

const START_TIMEOUT_MS = 4000;
const MAX_DURATION_MS = 15000;
const FADE_MS = 700;

export function IntroSplash({ onDone }: { onDone: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const finish = useCallback(() => setLeaving(true), []);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    // A native modal makes the page inert, contains keyboard focus and exposes
    // modal semantics without changing the visual appearance of the intro.
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  useEffect(() => {
    markIntroSeen();
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    let started = false;
    const onPlaying = () => {
      started = true;
    };
    video.addEventListener("playing", onPlaying);
    video.play().catch(finish);
    const startTimer = window.setTimeout(() => {
      if (!started) finish();
    }, START_TIMEOUT_MS);
    const maxTimer = window.setTimeout(finish, MAX_DURATION_MS);
    return () => {
      video.removeEventListener("playing", onPlaying);
      window.clearTimeout(startTimer);
      window.clearTimeout(maxTimer);
    };
  }, [finish]);

  useEffect(() => {
    if (!leaving) return;
    videoRef.current?.pause();
    const timer = window.setTimeout(() => doneRef.current(), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  return (
    <dialog
      ref={dialogRef}
      aria-label="Introduction KOREV"
      onCancel={(event) => {
        event.preventDefault();
        finish();
      }}
      className={cn(
        "fixed inset-0 z-[200] m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-black p-0 transition-opacity ease-out backdrop:bg-transparent",
        leaving ? "opacity-0" : "opacity-100",
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
        className="korev-eyebrow absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-6 border border-white/20 bg-black/40 px-4 py-2 text-white/70 backdrop-blur-sm transition-opacity duration-500 hover:border-korev-gold/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-korev-gold"
      >
        Passer
      </button>
    </dialog>
  );
}
