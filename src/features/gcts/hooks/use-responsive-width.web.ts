import { useEffect, useState } from 'react';

export function useResponsiveWidth() {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const updateWidth = () => setWidth(window.innerWidth);
    const timer = window.setTimeout(updateWidth, 0);
    window.addEventListener('resize', updateWidth);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  return width;
}
