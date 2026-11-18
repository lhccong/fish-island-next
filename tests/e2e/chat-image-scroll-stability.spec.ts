import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    test(`${skin.id} ${mode}: known image geometry survives virtual row remounts`, async ({
      page,
    }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      try {
        await page.route('https://jitter.test/**', async (route) => {
          const width = route.request().url().endsWith('wide.svg') ? 1200 : 160;
          const height = width === 1200 ? 160 : 900;
          await route.fulfill({
            contentType: 'image/svg+xml',
            headers: { 'cache-control': 'no-store' },
            body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#147a99"/></svg>`,
          });
        });
        for (let id = 1; id <= 80; id++)
          fixture.push(
            String(id),
            id === 80
              ? '[img]https://jitter.test/wide.svg[/img]'
              : id === 79
                ? '图文前文[img]https://jitter.test/tall.svg[/img]图文后文'
                : `合成历史 ${id}`,
          );
        const scroll = page.getByRole('region', { name: '群聊消息区', exact: true });
        const frame = page.locator('[data-message-id="80"] [data-image-state]');
        await expect(frame).toHaveAttribute('data-image-state', 'ready');
        const ready = (await frame.boundingBox())!;
        const tallFrame = page.locator('[data-message-id="79"] [data-image-state]');
        await expect(tallFrame).toHaveAttribute('data-image-state', 'ready');
        const tallReady = (await tallFrame.boundingBox())!;
        await scroll.hover();
        await page.mouse.wheel(0, -100000);
        await expect.poll(() => scroll.evaluate((element) => element.scrollTop)).toBe(0);
        await expect(frame).toHaveCount(0);
        await page.evaluate(() => {
          const samples: { id: string; height: number; width: number }[] = [];
          const observer = new MutationObserver(() => {
            for (const id of ['79', '80']) {
              const image = document.querySelector(`[data-message-id="${id}"] [data-image-state]`);
              if (image) {
                const { height, width } = image.getBoundingClientRect();
                samples.push({ id, height, width });
              }
            }
          });
          observer.observe(document.body, { childList: true, subtree: true, attributes: true });
          Object.assign(window, { geometrySamples: samples, geometryObserver: observer });
        });
        await page.getByRole('button', { name: '查看最新消息', exact: true }).click();
        await expect(frame).toHaveAttribute('data-image-state', 'ready');
        await expect(tallFrame).toHaveAttribute('data-image-state', 'ready');
        const samples = await page.evaluate(() => {
          const state = window as unknown as {
            geometrySamples: { id: string; height: number; width: number }[];
            geometryObserver: MutationObserver;
          };
          state.geometryObserver.disconnect();
          return state.geometrySamples;
        });
        expect(samples.length).toBeGreaterThan(0);
        for (const sample of samples) {
          const expected = sample.id === '80' ? ready : tallReady;
          expect(Math.abs(sample.height - expected.height)).toBeLessThanOrEqual(1);
          expect(Math.abs(sample.width - expected.width)).toBeLessThanOrEqual(1);
        }
        if (page.viewportSize()!.width <= 760) {
          const box = (await scroll.boundingBox())!;
          const touch = await page.context().newCDPSession(page);
          const x = box.x + box.width / 2;
          const y = box.y + box.height / 3;
          await touch.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ x, y }],
          });
          for (let step = 1; step <= 8; step++) {
            await touch.send('Input.dispatchTouchEvent', {
              type: 'touchMove',
              touchPoints: [{ x, y: y + step * 24 }],
            });
            await page.evaluate(() => new Promise(requestAnimationFrame));
          }
          await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
          await touch.detach();
        } else {
          await scroll.hover();
          await page.mouse.wheel(0, -280);
        }
        await expect(page.getByRole('button', { name: '查看最新消息', exact: true })).toBeVisible();
        const positions = await scroll.evaluate(async (element) => {
          // Sample painted frames after native wheel inertia has ended.
          await new Promise((resolve) => setTimeout(resolve, 250));
          const result: number[] = [];
          for (let i = 0; i < 30; i++) {
            await new Promise(requestAnimationFrame);
            result.push(element.scrollTop);
          }
          return result;
        });
        expect(Math.max(...positions) - Math.min(...positions)).toBeLessThanOrEqual(1);
        const position = await scroll.evaluate((element) => element.scrollTop);
        fixture.push('81', '新消息不打断回看');
        await expect(page.getByLabel('1 条新消息', { exact: true })).toBeVisible();
        expect(
          Math.abs((await scroll.evaluate((element) => element.scrollTop)) - position),
        ).toBeLessThanOrEqual(1);
        expect(await scroll.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
          true,
        );
        await page.screenshot({ path: info.outputPath('image-scroll.png') });
        expect(fixture.stats()).toMatchObject({ connections: 1, historyRequests: 1 });
      } finally {
        fixture.dispose();
      }
    });
