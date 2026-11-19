import type { CSSProperties } from 'react';
import styles from './BubbleArtwork.module.css';

export const bubbleArtworkClass = styles.art ?? '';

export function bubbleArtworkProps(artwork?: {
  imageUrl: string;
  darkImageUrl?: string;
  textTone: string;
}) {
  if (!artwork) return {};
  const style = {
    '--bubble-light-image': `url(${JSON.stringify(artwork.imageUrl)})`,
    ...(artwork.darkImageUrl
      ? { '--bubble-dark-image': `url(${JSON.stringify(artwork.darkImageUrl)})` }
      : {}),
  } as CSSProperties;
  return { style, 'data-custom-bubble': 'true', 'data-bubble-tone': artwork.textTone };
}
