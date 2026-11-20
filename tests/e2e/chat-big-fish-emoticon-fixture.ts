import type { Page } from '@playwright/test';

const stickerUrls = [
  'https://fixture.example.test/fish-1.gif',
  'https://fixture.example.test/fish-2.gif',
];

export async function mockBigFishEmoticons(page: Page) {
  let releaseSearch!: () => void;
  const searchReady = new Promise<void>((resolve) => {
    releaseSearch = resolve;
  });
  const searches: (string | null)[] = [];
  await page.route('https://fixture.example.test/fish-*.gif', (route) =>
    route.fulfill({
      contentType: 'image/gif',
      body: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'),
    }),
  );
  await page.route('**/emoticon-search?*', async (route) => {
    const keyword = new URL(route.request().url()).searchParams.get('word');
    searches.push(keyword);
    if (keyword === '无语表情') return route.fulfill({ json: { data: [] } });
    if (keyword === '震惊表情') return route.fulfill({ status: 503 });
    await searchReady;
    return route.fulfill({ json: { data: stickerUrls.map((url) => ({ thumbURL: url })) } });
  });
  return { searches, stickerUrls, releaseSearch };
}
