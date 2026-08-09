import { useEffect } from 'react';

export function useScrollFade(threshold = 0.1, rootMargin = '0px 0px -50px 0px') {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          } else {
            entry.target.classList.remove('is-visible');
          }
        });
      },
      { threshold, rootMargin }
    );
    
    // We add a small delay to allow React to render the DOM elements before observing
    const timeoutId = setTimeout(() => {
      const sections = document.querySelectorAll('.fade-in-section');
      sections.forEach((section) => observer.observe(section));
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [threshold, rootMargin]);
}
