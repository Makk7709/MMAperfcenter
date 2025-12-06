import { useEffect, useRef, useState } from 'react';

interface VideoBackgroundProps {
  freezeAt?: number; // Time in seconds to freeze
}

export function VideoBackground({ freezeAt = 9 }: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFrozen, setIsFrozen] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.currentTime >= freezeAt && !isFrozen) {
        video.pause();
        setIsFrozen(true);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    
    // Start playing
    video.play().catch(console.error);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [freezeAt, isFrozen]);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        src="/videos/hero-background.mp4"
        muted
        playsInline
        preload="auto"
      />
      {/* Subtle dark overlay for readability */}
      <div className="absolute inset-0 bg-background/50" />
    </div>
  );
}

export default VideoBackground;
