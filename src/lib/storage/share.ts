import type { BikeConfig } from '../kinematics/types';

export interface ShareResult {
  url: string;
}

/** Build a self-contained share URL that encodes the config (without photo) as base64. */
export function createShare(config: BikeConfig): ShareResult {
  const sharable = { ...config, image: { src: '', width: config.image.width, height: config.image.height } };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(sharable))));
  return { url: `${window.location.origin}/v?c=${encoded}` };
}
