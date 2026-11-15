import { expect, test, type Locator, type Page } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setup, post, noOverflow } from './fish-circle-fixture';

async function gesture(page: Page, list: Locator, mobile: boolean, delta: number) {
  const box = (await list.boundingBox())!;
  const x = box.x + box.width * 0.75;
  const y = box.y + Math.min(box.height / 2, 240);
  if (!mobile) {
    await page.mouse.move(x, y);
    await page.mouse.wheel(0, delta);
    return;
  }
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y }],
  });
  for (let step = 1; step <= 6; step++) {
    await page.evaluate(() => new Promise(requestAnimationFrame));
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: y - (Math.sign(delta) * step * Math.min(100, y - 15)) / 6 }],
    });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.detach();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const done = () => {
          clearTimeout(timer);
          document.removeEventListener('scrollend', done, true);
          resolve();
        };
        const timer = setTimeout(done, 500);
        document.addEventListener('scrollend', done, { capture: true, once: true });
      }),
  );
}

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: comments hand scrolling to feed at boundaries`, async ({
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
      await page.route('**/api/moments/list', (route) =>
        route.fulfill({
          json: {
            code: 0,
            data: {
              total: 8,
              records: Array.from({ length: 8 }, (_, i) => ({
                ...post,
                id: String(1001 + i),
                content: `合成动态 ${i + 1}`,
                commentNum: i === 0 ? 20 : 0,
              })),
            },
          },
        }),
      );
      let scenario = 'short';
      let release = () => {};
      await page.route('**/api/moments/comment/list', async (route) => {
        if (scenario === 'loading') await new Promise<void>((resolve) => (release = resolve));
        if (scenario === 'error') return route.fulfill({ status: 503, json: {} });
        const count = scenario === 'empty' ? 0 : scenario === 'long' ? 20 : 1;
        return route.fulfill({
          json: {
            code: 0,
            data: {
              total: count,
              records: Array.from({ length: count }, (_, i) => ({
                id: String(3000 + i),
                userId: '456',
                userName: `合成评论者 ${i + 1}`,
                content: `合成评论 ${i + 1}`,
                children: [],
              })),
            },
          },
        });
      });
      const outer = page.getByRole('region', { name: '鱼小圈列表滚动区', exact: true });
      const list = page.getByRole('region', { name: '评论列表', exact: true });
      const mobile = page.viewportSize()!.width <= 760;
      const position = async () => {
        await list.scrollIntoViewIfNeeded();
        await outer.evaluate((element) => {
          const list = element.querySelector('[aria-label="评论列表"]')!;
          element.scrollTop +=
            list.getBoundingClientRect().top - (element.getBoundingClientRect().top + 30);
        });
        await page.evaluate(
          () =>
            new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
        );
      };
      for (scenario of ['short', 'empty', 'error', 'loading', 'long']) {
        const refresh = page.getByRole('button', { name: '刷新动态', exact: true });
        await Promise.all([
          page.waitForResponse((response) => response.url().endsWith('/api/moments/list')),
          refresh.click(),
        ]);
        await expect(refresh).toBeEnabled();
        await expect(list).toBeVisible();
        if (scenario === 'error') await expect(list.getByRole('alert')).toBeVisible();
        else if (scenario === 'loading')
          await expect(list.getByText('正在加载评论…')).toBeVisible();
        else if (scenario === 'empty')
          await expect(list.getByText('暂无评论，来聊两句吧')).toBeVisible();
        else await expect(list.getByText('合成评论 1', { exact: true })).toBeVisible();
        if (scenario === 'long') {
          await list.getByRole('button', { name: '查看更多 17 条评论' }).click();
          await position();
          const before = await outer.evaluate((element) => element.scrollTop);
          await gesture(page, list, mobile, 120);
          await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
          expect(await outer.evaluate((element) => element.scrollTop)).toBe(before);
          await list.evaluate((element) => (element.scrollTop = element.scrollHeight));
        }
        await position();
        if (scenario === 'long')
          expect(
            await list.evaluate(
              (element) => element.scrollHeight - element.clientHeight - element.scrollTop,
            ),
          ).toBeLessThanOrEqual(1);
        const before = await outer.evaluate((element) => element.scrollTop);
        await gesture(page, list, mobile, 120);
        await expect
          .poll(() => outer.evaluate((element) => element.scrollTop), { message: scenario })
          .toBeGreaterThan(before);
        await noOverflow(page);
        expect(await list.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
          true,
        );
        if (scenario === 'loading') {
          release();
          await expect(list.getByText('合成评论 1', { exact: true })).toBeVisible();
        }
        if (scenario === 'long') {
          await list.evaluate((element) => (element.scrollTop = 0));
          await position();
          const before = await outer.evaluate((element) => element.scrollTop);
          await gesture(page, list, mobile, -120);
          await expect
            .poll(() => outer.evaluate((element) => element.scrollTop))
            .toBeLessThan(before);
        }
      }
      await page.screenshot({ path: info.outputPath('scroll-chain.png') });
    });
  }
