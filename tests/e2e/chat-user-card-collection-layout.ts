import { expect, type Locator } from '@playwright/test';

export async function expectCollectionLayout(list: Locator, mobile: boolean) {
  const layout = await list.evaluate((viewport) => {
    const tiles = [...viewport.querySelectorAll('li')];
    const first = tiles[0]!.getBoundingClientRect();
    const firstRow = tiles.filter((tile) => tile.getBoundingClientRect().top === first.top);
    const frame = viewport.getBoundingClientRect();
    const scrollbar = viewport.parentElement!.querySelector<HTMLElement>(
      '[data-orientation="vertical"]',
    )!;
    const artwork = tiles.map((tile) => tile.querySelector('img')!.parentElement!);
    return {
      start: first.left - frame.left,
      top: first.top - frame.top,
      end: frame.right - firstRow.at(-1)!.getBoundingClientRect().right,
      columns: firstRow.length,
      misalignedArt: tiles
        .filter((_tile, index) => {
          const imageFrame = artwork[index]!;
          const art = imageFrame.getBoundingClientRect();
          const content = imageFrame.parentElement!.getBoundingClientRect();
          const atlas = imageFrame.querySelector('img')!.getBoundingClientRect();
          const ratio = index === 4 ? 4 / 5 : 1;
          return (
            Math.abs(art.height - artwork[0]!.getBoundingClientRect().height) > 1 ||
            Math.abs(art.left + art.width / 2 - (content.left + content.width / 2)) > 1 ||
            Math.abs(art.width - art.height * ratio) > 1 ||
            Math.abs(art.width - atlas.width / 5) > 1 ||
            Math.abs(art.height - atlas.height / 2) > 1
          );
        })
        .map((tile) => tile.innerText),
      unevenRows: tiles
        .filter((tile, index) => {
          const rowStart = tiles[index - (index % firstRow.length)]!;
          const attributes = tile.firstElementChild!.lastElementChild!.lastElementChild!;
          const rowAttributes = rowStart.firstElementChild!.lastElementChild!.lastElementChild!;
          return (
            Math.abs(
              tile.getBoundingClientRect().bottom - rowStart.getBoundingClientRect().bottom,
            ) > 1 ||
            Math.abs(
              attributes.getBoundingClientRect().bottom -
                rowAttributes.getBoundingClientRect().bottom,
            ) > 1
          );
        })
        .map((tile) => tile.innerText),
      obstructedDetails: tiles
        .filter((tile) => {
          const content = tile.firstElementChild!;
          const art = content.firstElementChild!.getBoundingClientRect();
          const details = content.lastElementChild!.getBoundingClientRect();
          return (
            art.height <= 0 ||
            details.top < art.bottom - 1 ||
            details.bottom > tile.getBoundingClientRect().bottom + 1
          );
        })
        .map((tile) => tile.innerText),
      scrollbarVisible:
        getComputedStyle(scrollbar).visibility === 'visible' &&
        Number(getComputedStyle(scrollbar).opacity) === 1,
      fits:
        viewport.scrollWidth <= viewport.clientWidth &&
        tiles.every((tile) => tile.scrollWidth <= tile.clientWidth) &&
        document.documentElement.scrollWidth <= innerWidth,
    };
  });
  expect(layout).toMatchObject({
    columns: mobile ? 2 : 3,
    misalignedArt: [],
    obstructedDetails: [],
    unevenRows: [],
    scrollbarVisible: !mobile,
    fits: true,
  });
  expect(layout.start).toBeGreaterThanOrEqual(4);
  expect(layout.top).toBeGreaterThanOrEqual(4);
  expect(layout.end).toBeGreaterThanOrEqual(mobile ? 20 : 24);
}
