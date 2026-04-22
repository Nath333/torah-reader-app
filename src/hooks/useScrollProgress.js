import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for tracking scroll progress
 * @returns {{ progress: number, showScrollTop: boolean }}
 */
export const useScrollProgress = () => {
  const [progress, setProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const rafRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) return; // Already scheduled
      rafRef.current = requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

        setProgress(Math.min(100, Math.max(0, scrollPercent)));
        setShowScrollTop(scrollTop > 300);
        rafRef.current = null;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return { progress, showScrollTop, scrollToTop };
};

export default useScrollProgress;
