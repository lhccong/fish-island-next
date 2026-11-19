import { readFile, writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';

async function controlled(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) return;
    await new Promise<void>((resolve) =>
      navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }),
    );
  });
}

test('install assets, cache isolation, offline deep links and safe updates', async ({
  page,
  context,
  request,
}) => {
  await page.goto('/');
  await controlled(page);
  const cdp = await context.newCDPSession(page);
  await expect
    .poll(async () =>
      (await cdp.send('Page.getInstallabilityErrors')).installabilityErrors.filter(
        ({ errorId }) => errorId !== 'in-incognito',
      ),
    )
    .toEqual([]);
  await cdp.detach();
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest).toMatchObject({ id: '/', start_url: '/', scope: '/', display: 'standalone' });
  expect(manifest.icons).toMatchObject([
    { sizes: '192x192', purpose: 'any' },
    { sizes: '512x512', purpose: 'any' },
    { sizes: '512x512', purpose: 'maskable' },
  ]);
  const appleIcon = { src: '/pwa/apple-touch-icon-180.png', sizes: '180x180', purpose: 'any' };
  const icons = [...manifest.icons, appleIcon];
  for (const icon of icons) {
    const response = await request.get(icon.src);
    expect(response.headers()['content-type']).toContain('image/png');
    const bytes = await response.body();
    const size = Number(icon.sizes.split('x')[0]);
    expect(bytes.readUInt32BE(16)).toBe(size);
    expect(bytes.readUInt32BE(20)).toBe(size);
    const artworkFits = await page.evaluate(async ({ src, purpose }) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const canvas = document.createElement('canvas');
      const width = img.naturalWidth;
      canvas.width = canvas.height = width;
      const surface = canvas.getContext('2d')!;
      surface.drawImage(img, 0, 0);
      const { data } = surface.getImageData(0, 0, width, width);
      const isOrange = (x: number, y: number) => {
        const index = (y * width + x) * 4;
        const [red, green, blue, alpha] = data.subarray(index, index + 4);
        return red! > 220 && green! > 150 && blue! < 150 && alpha === 255;
      };
      for (let i = 0; i < width; i++) {
        if (
          ![isOrange(i, 0), isOrange(i, width - 1), isOrange(0, i), isOrange(width - 1, i)].every(
            Boolean,
          )
        )
          return false;
      }
      if (purpose !== 'maskable') return true;
      const center = (width - 1) / 2;
      for (let y = 0; y < width; y++) {
        for (let x = 0; x < width; x++) {
          if (Math.hypot(x - center, y - center) > width * 0.4 && !isOrange(x, y)) return false;
        }
      }
      return true;
    }, icon);
    expect(artworkFits, icon.src).toBe(true);
  }
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', appleIcon.src);
  const favicon = '/favicon.ico?v=moyudao-2';
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', favicon);
  const entries = await page.evaluate(async () => {
    const names = await caches.keys();
    const cache = await caches.open(names.find((name) => name.startsWith('fish-island-pwa-'))!);
    return (await cache.keys()).map((entry) => entry.url);
  });
  expect(entries.some((url) => url.endsWith('/index.html'))).toBe(true);
  expect(entries.every((url) => !url.includes('/api/') && !url.includes('api.yucoder'))).toBe(true);
  const appAssets = [...icons.map((icon) => icon.src), favicon];
  expect(appAssets.every((asset) => entries.some((url) => url.endsWith(asset)))).toBe(true);
  await context.setOffline(true);
  await page.goto('/foundation');
  await expect(page.getByRole('main')).toBeVisible();
  expect(
    await page.evaluate(async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      return img.naturalWidth;
    }, favicon),
  ).toBeGreaterThanOrEqual(16);
  expect(
    await page.evaluate(() =>
      fetch('/api/pwa-probe').then(
        () => true,
        () => false,
      ),
    ),
  ).toBe(false);
  expect(
    await page.evaluate(() =>
      fetch('/assets/not-cached.png').then(
        () => true,
        () => false,
      ),
    ),
  ).toBe(false);
  expect(
    await page.evaluate(() =>
      fetch('https://example.com/pwa-probe').then(
        () => true,
        () => false,
      ),
    ),
  ).toBe(false);
  await context.setOffline(false);
  const workerPath = '.tmp-pwa-20261116/build/sw.js';
  const original = await readFile(workerPath, 'utf8');
  try {
    await page.evaluate(async () => {
      await caches.open('unrelated-cache');
      await caches.open('fish-island-pwa-obsolete');
      sessionStorage.setItem('pwa-draft-probe', '草稿保持');
    });
    await writeFile(
      workerPath,
      original.replace(
        /const CACHE_NAME = CACHE_PREFIX \+ '[^']+';/,
        "const CACHE_NAME = CACHE_PREFIX + 'update-test';",
      ),
    );
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
    });
    await expect
      .poll(() => page.evaluate(async () => !!(await navigator.serviceWorker.ready).waiting))
      .toBe(true);
    expect(await page.evaluate(() => sessionStorage.getItem('pwa-draft-probe'))).toBe('草稿保持');
    await page.close();
    const next = await context.newPage();
    await next.goto('/');
    await controlled(next);
    await expect
      .poll(() => next.evaluate(() => caches.keys()))
      .toEqual(expect.arrayContaining(['unrelated-cache', 'fish-island-pwa-update-test']));
    const names = await next.evaluate(() => caches.keys());
    expect(names.filter((name) => name.startsWith('fish-island-pwa-'))).toEqual([
      'fish-island-pwa-update-test',
    ]);
  } finally {
    await writeFile(workerPath, original);
  }
});

for (const skin of builtinSkins) {
  for (const mode of ['light', 'dark']) {
    for (const width of [1440, 375, 390]) {
      test.describe(`${skin.id}-${mode}-${width}`, () => {
        test.use({
          viewport: { width, height: 900 },
          hasTouch: width < 760,
          isMobile: width < 760,
        });
        test(`${skin.id} ${mode} ${width}: loading, empty, success and offline recovery`, async ({
          page,
          context,
        }) => {
          await page.addInitScript(
            ({ skin, mode }) => {
              localStorage.setItem('fish-island:skin', skin);
              localStorage.setItem('fish-island:color-mode', mode);
            },
            { skin: skin.id, mode },
          );
          let release!: () => void;
          const gate = new Promise<void>((resolve) => {
            release = resolve;
          });
          page.on('close', () => release());
          let state: 'empty' | 'success' | 'offline' = 'empty';
          await page.route('**/api/hot/list', async (route) => {
            await gate;
            if (state === 'offline') return route.abort('internetdisconnected');
            await route.fulfill({
              json: {
                code: 0,
                data:
                  state === 'empty'
                    ? []
                    : [
                        {
                          id: 'pwa',
                          name: '合成来源',
                          categoryName: '社区',
                          data: [{ title: '合成 PWA 条目', url: 'https://example.com/pwa' }],
                        },
                      ],
              },
            });
          });
          await page.goto('/');
          await expect(page.getByText('正在获取各平台热榜')).toBeVisible();
          release();
          await controlled(page);
          await expect(page.getByText('暂时没有热榜内容')).toBeVisible();
          state = 'success';
          const refresh = page.getByRole('button', { name: '刷新热榜', exact: true });
          if (width < 760) await refresh.tap();
          else await refresh.click();
          await expect(
            page.getByRole('link', { name: '合成 PWA 条目', exact: true }),
          ).toBeVisible();
          state = 'offline';
          await context.setOffline(true);
          await page.reload();
          await expect(page.getByRole('alert')).toBeVisible();
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true);
          await page.screenshot({ path: `.tmp-pwa-20261116/${skin.id}-${mode}-${width}.png` });
          await context.setOffline(false);
          state = 'success';
          const retry = page.getByRole('button', { name: '重试', exact: true });
          if (width < 760) await retry.tap();
          else await retry.click();
          await expect(
            page.getByRole('link', { name: '合成 PWA 条目', exact: true }),
          ).toBeVisible();
          expect(await page.evaluate(() => localStorage.getItem('fish-island:skin'))).toBe(skin.id);
          expect(await page.evaluate(() => document.documentElement.dataset.colorMode)).toBe(mode);
          expect(await page.locator('meta[name="theme-color"]').getAttribute('content')).toBe(
            await page.evaluate(() =>
              getComputedStyle(document.documentElement).getPropertyValue('--color-canvas').trim(),
            ),
          );
        });
      });
    }
  }
}
