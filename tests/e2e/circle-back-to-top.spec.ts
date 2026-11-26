import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { noOverflow, post, setup } from './fish-circle-fixture';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: return to the top of the fish circle feed`, async ({
      page,
    }, info) => {
      await page.addInitScript(
        ({ skin, mode }) => {
          localStorage.setItem('fish-island:skin', skin);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { skin: skin.id, mode },
      );
      await setup(page);
      await expect(page.getByText(post.content, { exact: true })).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
      await expect(page.locator('html')).toHaveAttribute('data-color-mode', mode);

      const feed = page.getByRole('region', { name: '鱼小圈列表滚动区' });
      const cover = page.getByRole('region', { name: '鱼小圈封面' });
      const button = page.getByRole('button', { name: '回到顶部', exact: true });
      const refresh = page.getByRole('button', { name: '刷新动态' });
      const mobile = page.viewportSize()!.width <= 760;
      const scrollTop = () => feed.evaluate((element) => element.scrollTop);
      const records = Array.from({ length: 20 }, (_, index) => ({
        ...post,
        id: String(1001 + index),
        content: `合成动态 ${index + 1}`,
      }));
      let outcome: 'ready' | 'empty' | 'error' = 'ready';
      let requests = 0;
      let release = () => {};
      const pending = new Promise<void>((resolve) => (release = resolve));
      await page.route('**/api/moments/list', async (route) => {
        requests++;
        await pending;
        if (outcome === 'error') return route.fulfill({ status: 503, json: {} });
        const items = outcome === 'ready' ? records : [];
        return route.fulfill({
          json: { code: 0, data: { records: items, total: items.length } },
        });
      });

      await refresh.click();
      await expect(feed.getByText('正在加载鱼小圈…')).toBeVisible();
      await expect(button).toHaveCount(0);
      await noOverflow(page);
      release();
      await expect(feed.getByRole('article')).toHaveCount(records.length);
      await expect(button).toHaveCount(0);
      await expect.poll(scrollTop).toBe(0);

      const pane = (await feed.boundingBox())!;
      if (mobile) {
        const touch = await page.context().newCDPSession(page);
        const x = pane.x + pane.width / 2;
        const y = pane.y + pane.height * 0.85;
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x, y }],
        });
        for (let step = 1; step <= 12; step++) {
          await page.evaluate(() => new Promise(requestAnimationFrame));
          await touch.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x, y: y - step * 40 }],
          });
        }
        await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await touch.detach();
      } else {
        await page.mouse.move(pane.x + pane.width / 2, pane.y + pane.height / 2);
        await page.mouse.wheel(0, 520);
      }
      await expect.poll(scrollTop).toBeGreaterThanOrEqual(320);
      await expect(button).toBeVisible();

      const box = (await button.boundingBox())!;
      expect(box.width).toBe(44);
      expect(box.height).toBe(44);
      expect(pane.x + pane.width - box.x - box.width).toBeGreaterThanOrEqual(mobile ? 12 : 24);
      expect(pane.y + pane.height - box.y - box.height).toBeGreaterThanOrEqual(mobile ? 12 : 20);
      expect(await feed.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      await noOverflow(page);

      const scrollbar = feed.locator('..').locator('[data-orientation="vertical"]');
      if (mobile) await expect(scrollbar).toBeHidden();
      else {
        await expect(scrollbar).toHaveCSS('opacity', '1');
        const rail = (await scrollbar.boundingBox())!;
        expect(rail.x - box.x - box.width).toBeGreaterThanOrEqual(12);
        const normalBorder = await button.evaluate(
          (element) => getComputedStyle(element).borderTopColor,
        );
        await button.hover();
        await expect(button).not.toHaveCSS('border-top-color', normalBorder);
      }

      await feed.evaluate((element) =>
        element.scrollTo({ top: element.scrollHeight, behavior: 'instant' }),
      );
      const lastPost = (await feed.getByRole('article').last().boundingBox())!;
      expect(lastPost.y + lastPost.height + 4).toBeLessThan(box.y);
      if (skin.id === 'moyu-island') {
        await page.screenshot({ path: info.outputPath('circle-back-to-top.png') });
      }
      if (mobile) await button.tap();
      else {
        await feed.evaluate((element) => element.focus({ preventScroll: true }));
        await page.keyboard.press('Shift+Tab');
        await expect(button).toBeFocused();
        await expect(button).toHaveCSS('outline-width', '2px');
        await page.keyboard.press('Enter');
      }
      await expect.poll(scrollTop).toBe(0);
      await expect(button).toHaveCount(0);
      await expect(feed).toBeFocused();
      await expect(cover).toBeInViewport();
      await expect(feed.getByRole('article')).toHaveCount(records.length);
      expect(requests).toBe(1);

      outcome = 'error';
      await refresh.click();
      await expect(feed.getByRole('alert')).toBeVisible();
      await expect(button).toHaveCount(0);
      await noOverflow(page);
      outcome = 'empty';
      await feed.getByRole('button', { name: '重试动态' }).click();
      await expect(feed.getByText('还没有动态，分享第一条摸鱼日常吧')).toBeVisible();
      await expect(button).toHaveCount(0);
      await noOverflow(page);
    });
  }
