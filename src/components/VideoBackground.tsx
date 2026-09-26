import heroBackground from '@/assets/hero-mma.webp';

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
    <div className="fixed inset-0 -z-10 overflow-hidden bg-korev-deep">
      <img
        src={heroBackground}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-bottom opacity-60"
      />
      {/* Depth: dark top for the header, vignette on the sides, gold halo above. */}
      <div className="absolute inset-0 bg-gradient-to-b from-korev-deep via-korev-deep/70 to-korev-deep/40" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,hsl(var(--korev-deep))_95%)]" />
      <div className="absolute inset-x-0 top-0 h-[40vh] bg-[radial-gradient(60%_100%_at_50%_0%,hsl(var(--korev-gold)/0.10),transparent)]" />
    </div>
  );
}

export default VideoBackground;
