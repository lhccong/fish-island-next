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

export function petCardArt(art: number) {
  const atlas = cardAtlases[Math.floor(art / 10)];
  const tile = art % 10;
  // Keep the top edge of each 4:5 portrait in the square card window.
  const secondRow = atlas?.portrait ? '83.333%' : '100%';
  return {
    backgroundImage: `url('/assets/pet/${atlas?.file ?? 'card-art.jpg'}')`,
    backgroundPosition: `${(tile % 5) * 25}% ${tile < 5 ? '0%' : secondRow}`,
    backgroundSize: atlas?.portrait ? '500% 250%' : '500% 200%',
  };
}
