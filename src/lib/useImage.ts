import { useEffect, useState } from 'react';

/** Load an HTMLImageElement from a URL (object URL or remote). */
export function useImage(src: string | null | undefined): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let active = true;
    if (!src) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear when the source is removed
      setImg(null);
      return;
    }
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    const onLoad = () => {
      if (active) setImg(image);
    };
    image.addEventListener('load', onLoad);
    image.src = src;
    return () => {
      active = false;
      image.removeEventListener('load', onLoad);
    };
  }, [src]);

  return img;
}
