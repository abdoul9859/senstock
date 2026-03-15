import { useEffect, useRef, useState } from "react";

/**
 * Hook that triggers a reveal animation when an element enters the viewport.
 * Returns a ref to attach to the element and a boolean indicating visibility.
 *
 * rootMargin ensures animations fire while the element is still partially
 * off-screen so the user actually sees the motion happening.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.08,
) {
  const ref = useRef<T>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: "0px 0px -60px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, revealed };
}

/**
 * Hook for staggered children reveals. Returns ref + revealed state.
 * Attach the ref to the parent container.
 */
export function useStaggerReveal<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.05,
) {
  const ref = useRef<T>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, revealed };
}
