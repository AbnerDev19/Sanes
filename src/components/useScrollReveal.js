import { useEffect, useRef } from 'react';

// Keep content visible by default: unsupported APIs must never hide the page.
export default function useScrollReveal(dependencies = []) {
  const revealed = useRef(new WeakSet());
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches || !window.IntersectionObserver || !Element.prototype.animate) return;
    const animations = new Set();
    const observer = new IntersectionObserver(entries => {
      for (const { target, isIntersecting } of entries) {
        if (!isIntersecting || revealed.current.has(target)) continue;
        revealed.current.add(target);
        observer.unobserve(target);
        const animation = target.animate([
          { opacity: 0, transform: 'translateY(36px)', filter: 'blur(3px)' },
          { opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' },
        ], {
          duration: 720,
          delay: Number(target.dataset.revealDelay || 0),
          easing: 'cubic-bezier(.16, 1, .3, 1)',
          fill: 'backwards',
        });
        animations.add(animation);
        animation.finished.then(() => animations.delete(animation)).catch(() => {});
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
    document.querySelectorAll('[data-reveal]').forEach(element => {
      if (!revealed.current.has(element)) observer.observe(element);
    });
    const stop = () => { observer.disconnect(); animations.forEach(animation => animation.cancel()); };
    media.addEventListener('change', stop);
    return () => { stop(); media.removeEventListener('change', stop); };
  }, dependencies);
}
