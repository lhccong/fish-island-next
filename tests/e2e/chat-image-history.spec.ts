import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: mixed image history retains its reading anchor`, async ({
      page,
    }, info) => {
      let releaseHistory!: () => void;
      let releaseImages!: () => void;
      const history = new Promise<void>((resolve) => {
        releaseHistory = resolve;
      });
      const images = new Promise<void>((resolve) => {
        releaseImages = resolve;
      });
      await page.addInitScript(
        ({ skin, mode }) => {
          localStorage.setItem('fish-island:skin', skin);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { skin: skin.id, mode },
      );
      await page.routeWebSocket(/\/ws\//, (ws) => ws.onMessage(() => {}));
      await page.route('**/api/**', (route) => route.fulfill({ json: { code: 0, data: [] } }));
      await page.route('**/api/user/**', (route) =>
        route.fulfill({
          json: {
            code: 0,
            data: {
              id: '123',
              userName: '合成用户',
              userRole: 'user',
              saTokenInfo: { tokenName: 'synthetic-session', tokenValue: 'synthetic-value' },
            },
          },
        }),
      );
      await page.route('https://history-image.test/**', async (route) => {
        await images;
        await route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="900"><rect width="160" height="900" fill="#147a99"/></svg>',
        });
      });
      await page.route('**/api/chat/message/page/vo', async (route) => {
        const initial = route.request().postDataJSON().current === 1;
        if (!initial) await history;
        await route.fulfill({
          json: {
            code: 0,
            data: {
              records: Array.from({ length: initial ? 50 : 12 }, (_, i) => {
                const id = (initial ? 100 : 50) - i;
                return {
                  messageWrapper: {
                    message: {
                      id: String(id),
                      content:
                        id % 2
                          ? `合成历史 ${id}`
                          : `图片前文[img]https://history-image.test/${id}.svg[/img]图片后文`,
                      timestamp: 1794441600000 + id,
                      sender: { id: '456', name: '合成岛友', avatar: null },
                    },
                  },
                };
              }),
            },
          },
        });
      });
      await page.goto('/chat');
      await page
        .getByRole('textbox', { name: '账号或邮箱', exact: true })
        .fill('synthetic-account');
      await page.getByLabel('密码', { exact: true }).fill('synthetic-password');
      await page.getByRole('button', { name: '登录', exact: true }).click();
      await expect(page.locator('[data-message-id="100"]')).toBeInViewport();
      await page.evaluate(async () => {
        for (let frame = 0; frame < 10; frame++)
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      });
      const scroll = page.getByRole('region', { name: '群聊消息区', exact: true });
      await scroll.evaluate((element) => {
        element.scrollTop = 0;
      });
      await expect(page.getByText('正在加载历史消息…', { exact: true })).toBeVisible();
      const anchor = page.locator('[data-message-id="51"]');
      await expect(anchor).toBeInViewport();
      // Sample every painted frame: a final-position assertion misses a temporary jump.
      await page.evaluate(() => {
        const samples: number[] = [];
        const sample = () => {
          const row = document.querySelector('[data-message-id="51"]');
          samples.push(row ? row.getBoundingClientRect().top : -10000);
          (window as unknown as { anchorFrame: number }).anchorFrame =
            requestAnimationFrame(sample);
        };
        (window as unknown as { anchorSamples: number[] }).anchorSamples = samples;
        sample();
      });
      releaseHistory();
      await expect(page.getByText('历史消息已全部加载', { exact: true })).toHaveCount(1);
      const frame = page.locator('[data-message-id="52"] [data-image-state]');
      await expect(frame).toHaveAttribute('data-image-state', 'loading');
      const before = await frame.boundingBox();
      releaseImages();
      await expect(frame).toHaveAttribute('data-image-state', 'ready');
      const after = await frame.boundingBox();
      expect(Math.abs(before!.height - after!.height)).toBeLessThan(1);
      const samples = await page.evaluate(async () => {
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
        const state = window as unknown as { anchorFrame: number; anchorSamples: number[] };
        cancelAnimationFrame(state.anchorFrame);
        return state.anchorSamples;
      });
      expect(Math.max(...samples) - Math.min(...samples)).toBeLessThan(5);
      expect(await scroll.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: info.outputPath('image-history.png') });
      await scroll.evaluate((element) => {
        element.scrollTop = 0;
      });
      await expect(page.locator('[data-message-id="39"]')).toBeInViewport();
      const latest = page.getByRole('button', { name: '查看最新消息' });
      if (page.viewportSize()!.width <= 760) await latest.tap();
      else await latest.click();
      await expect(page.locator('[data-message-id="100"]')).toBeInViewport();
    });
  }
