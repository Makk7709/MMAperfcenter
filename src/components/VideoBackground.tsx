import heroBackground from '@/assets/hero-background.png';

interface VideoBackgroundProps {
  freezeAt?: number;
}

export function VideoBackground({ freezeAt }: VideoBackgroundProps) {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <img
        src={heroBackground}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Subtle dark overlay for readability */}
      <div className="absolute inset-0 bg-background/50" />
    </div>
  );
}

export default VideoBackground;
