// src/utils/ScrollToTop.tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // scroll to the element matching the hash
      const id = hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // scroll to top on plain route changes
      window.scrollTo({ top: 0 });
    }
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
