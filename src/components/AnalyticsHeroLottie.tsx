import { useEffect, useRef } from 'react';
import lottie from 'lottie-web';
import { localMedia } from '../config/site';

const LOTTIE_SRC = localMedia('/lottie/analytics.json');
const ASPECT = '1220 / 567';

export function AnalyticsHeroLottie() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;

    const anim = lottie.loadAnimation({
      container: host,
      renderer: 'svg',
      loop: false,
      autoplay: true,
      path: LOTTIE_SRC,
    });

    const loopFromFourSeconds = () => {
      const fps = anim.frameRate || 30;
      anim.setDirection(1);
      anim.goToAndPlay(4 * fps, true);
    };
    anim.addEventListener('complete', loopFromFourSeconds);

    return () => {
      anim.removeEventListener('complete', loopFromFourSeconds);
      anim.destroy();
    };
  }, []);

  return (
    <div
      ref={ref}
      className="analytics-hero-lottie"
      style={{ aspectRatio: ASPECT }}
      role="img"
      aria-label="Animated Voyant Studios analytics dashboard overview"
    />
  );
}
