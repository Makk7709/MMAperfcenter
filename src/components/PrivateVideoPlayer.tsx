import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export interface VideoSource {
  url: string;
  expiresAt?: number;
}

/** Refresh a signed URL without losing the viewer's playback position. */
export function PrivateVideoPlayer({
  initialSource,
  renew,
  poster,
}: {
  initialSource: VideoSource;
  renew: () => Promise<VideoSource>;
  poster?: string;
}) {
  const player = useRef<HTMLVideoElement>(null);
  const [source, setSource] = useState(initialSource);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);
  const retried = useRef(false);
  const resume = useRef<{ time: number; playing: boolean } | null>(null);
  const lastTime = useRef(0);
  const wasPlaying = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const replaceSource = (next: VideoSource) => {
    const video = player.current;
    resume.current = {
      time: video?.currentTime || lastTime.current,
      playing: wasPlaying.current,
    };
    setSource(next);
    if (video?.getAttribute("src") === next.url) video.load();
  };

  useEffect(() => {
    if (
      initialSource.url !== source.url &&
      (initialSource.expiresAt ?? 0) > (source.expiresAt ?? 0)
    ) {
      replaceSource({
        url: initialSource.url,
        expiresAt: initialSource.expiresAt,
      });
    }
  }, [
    initialSource.url,
    initialSource.expiresAt,
    source.url,
    source.expiresAt,
  ]);

  const refresh = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      const next = await renew();
      if (!alive.current) return;
      setFailed(false);
      replaceSource(next);
    } catch {
      if (alive.current) setFailed(true);
    } finally {
      inFlight.current = false;
      if (alive.current) setRefreshing(false);
    }
  };

  return (
    <>
      <video
        ref={player}
        src={source.url}
        controls
        playsInline
        preload="metadata"
        poster={poster}
        className="w-full h-full object-cover"
        onTimeUpdate={() => {
          lastTime.current = player.current?.currentTime ?? 0;
        }}
        onPlay={() => {
          wasPlaying.current = true;
          if (source.expiresAt && source.expiresAt <= Date.now() + 30_000)
            void refresh();
        }}
        onPlaying={() => {
          retried.current = false;
          setFailed(false);
        }}
        onPause={() => {
          if (!resume.current) wasPlaying.current = false;
        }}
        onLoadedMetadata={() => {
          const video = player.current;
          const pending = resume.current;
          resume.current = null;
          if (!video || !pending) return;
          video.currentTime = pending.time;
          if (pending.playing)
            void video.play().catch(() => {
              wasPlaying.current = false;
            });
        }}
        onError={() => {
          if (retried.current) {
            setFailed(true);
            return;
          }
          retried.current = true;
          void refresh();
        }}
      />
      {failed && (
        <div
          role="alert"
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/90 p-4 text-center text-sm"
        >
          <p>La vidéo n’a pas pu être chargée. Vérifie ta connexion.</p>
          <Button
            variant="outline"
            disabled={refreshing}
            onClick={() => {
              retried.current = false;
              void refresh();
            }}
          >
            Réessayer
          </Button>
        </div>
      )}
    </>
  );
}
