import heroBackground from '@/assets/hero-background.png';

interface VideoBackgroundProps {
  /**
   * @deprecated The legacy implementation relied on an HTML5 `<video>` frozen
   * at this timecode. The current implementation renders a static hero image
   * (better LCP, no autoplay/sound policy issues). The prop is accepted for
   * backwards compatibility with existing call sites but is ignored.
   * It will be removed in a future major version.
   */
  freezeAt?: number;
}

export function VideoBackground(_props: VideoBackgroundProps) {
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
