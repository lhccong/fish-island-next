import type { PetCardImage } from '@/domain/pet';
import { cardAtlasCrop } from '@/shared/ui/CardAtlasImage';

const cardAtlases: readonly { file: string; portrait?: boolean }[] = [
  { file: 'card-art.jpg' },
  { file: 'card-art-coral-reef.jpg' },
  { file: 'card-art-mosswood.jpg' },
  { file: 'card-art-snowbay.jpg' },
  { file: 'card-art-sky-islands.jpg' },
  { file: 'card-art-three-kingdoms-shu.jpg' },
  { file: 'card-art-three-kingdoms-wei.jpg', portrait: true },
  { file: 'card-art-three-kingdoms-wu.jpg' },
  { file: 'card-art-three-kingdoms-warlords.jpg', portrait: true },
  { file: 'card-art-three-kingdoms-taoyuan.jpg', portrait: true },
];

export function petCardImage(art: number | PetCardImage): PetCardImage {
  if (typeof art !== 'number') return art;
  const atlas = cardAtlases[Math.floor(art / 10)];
  return {
    tile: art % 10,
    url: `/assets/pet/${atlas?.file ?? 'card-art.jpg'}`,
    portrait: !!atlas?.portrait,
  };
}

export function petCardArt(art: number | PetCardImage) {
  const { tile, url, portrait } = petCardImage(art);
  // Keep the top edge of each 4:5 portrait in the square card window.
  const { width, height, x, y } = cardAtlasCrop(tile, portrait);
  return {
    backgroundImage: `url(${JSON.stringify(url)})`,
    backgroundPosition: `${(x / (width - 100)) * 100}% ${(y / (height - 100)) * 100}%`,
    backgroundSize: `${width}% ${height}%`,
  };
}
