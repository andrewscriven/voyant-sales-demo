import gsap from 'gsap';

export type SlideDirection = 1 | -1;

export function animateDirectionalIn(el: HTMLElement | null, _direction?: SlideDirection) {
  if (!el) return;

  gsap.killTweensOf(el);
  gsap.set(el, { x: 0 });
  gsap.fromTo(
    el,
    { opacity: 0 },
    {
      opacity: 1,
      duration: 0.42,
      ease: 'power2.out',
    },
  );
}

export function animateStaggerIn(els: ArrayLike<Element> | Element | null) {
  const list = !els
    ? []
    : els instanceof Element
      ? [els]
      : Array.from(els).filter((el): el is Element => el instanceof Element);
  if (!list.length) return;

  gsap.killTweensOf(list);
  gsap.fromTo(
    list,
    { opacity: 0, scale: 0.94 },
    {
      opacity: 1,
      scale: 1,
      duration: 0.42,
      stagger: 0.08,
      ease: 'power2.out',
      force3D: false,
      transformOrigin: '50% 50%',
      onComplete: () => {
        gsap.set(list, { clearProps: 'transform' });
      },
    },
  );
}
