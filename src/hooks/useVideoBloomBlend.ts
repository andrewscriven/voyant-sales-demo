import { useLayoutEffect, type RefObject } from 'react';

export function useVideoBloomBlend(videoRef: RefObject<HTMLVideoElement | null>, active: boolean) {
  useLayoutEffect(() => {
    const content = document.querySelector<HTMLElement>('.app-content');
    if (!content) return;

    const clear = () => {
      content.classList.remove('has-video-blend');
      content.style.removeProperty('--bloom-fade');
    };

    if (!active) {
      clear();
      return;
    }

    const apply = () => {
      const video = videoRef.current;
      if (!video) {
        clear();
        return;
      }
      const stage = content.getBoundingClientRect();
      const box = video.getBoundingClientRect();
      const start = ((box.top - stage.top) / stage.height) * 100;
      content.style.setProperty('--bloom-fade', `${Math.max(6, Math.min(94, start))}%`);
      content.classList.add('has-video-blend');
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(content);
    if (videoRef.current) {
      ro.observe(videoRef.current);
      videoRef.current.addEventListener('loadedmetadata', apply);
    }
    window.addEventListener('resize', apply);
    return () => {
      ro.disconnect();
      videoRef.current?.removeEventListener('loadedmetadata', apply);
      window.removeEventListener('resize', apply);
      clear();
    };
  }, [active, videoRef]);
}
