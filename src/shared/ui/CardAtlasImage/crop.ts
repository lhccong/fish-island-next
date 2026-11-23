export function cardAtlasCrop(tile: number, portrait: boolean) {
  const height = portrait ? 250 : 200;
  return { width: 500, height, x: (tile % 5) * 100, y: tile < 5 ? 0 : height / 2 };
}
