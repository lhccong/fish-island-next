import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setup, post, noOverflow } from './fish-circle-fixture';
import { setupPet } from './pet-fixture';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: feed and comments append, retain errors and stop`, async ({
      page,
    }, info) => {
      test.setTimeout(120000);
      await page.addInitScript(
        ({ skin, mode }) => {
          localStorage.setItem('fish-island:skin', skin);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { skin: skin.id, mode },
      );
      const state = await setup(page, false, { commentTotal: 15 });
      const card = page.getByRole('article').first();
      await expect(card.getByText('今天也要好好享受生活。')).toBeVisible();
      state.commentFailure = true;
      await card.getByRole('button', { name: '查看更多 12 条评论' }).click();
      const comments = card.locator('[data-scroll-pagination="评论"]');
      await comments.scrollIntoViewIfNeeded();
      await expect(comments.getByRole('alert')).toContainText('503');
      await expect(card.getByText('今天也要好好享受生活。')).toHaveCount(1);
      state.commentFailure = false;
      await comments.getByRole('button', { name: '重试评论' }).click();
      await expect(card.getByText('第 15 条合成评论', { exact: true })).toHaveCount(1);
      await expect(comments).toContainText('已全部加载');
      let failMore = true;
      const requests: number[] = [];
      await page.route('**/api/moments/list', async (route) => {
        const current = route.request().postDataJSON().current as number;
        requests.push(current);
        if (current === 2 && failMore) return route.fulfill({ status: 503, json: {} });
        await route.fulfill({
          json: {
            code: 0,
            data: {
              total: 12,
              records:
                current === 1
                  ? Array.from({ length: 10 }, (_, n) => ({
                      ...post,
                      id: String(n + 1),
                      content: `滚动动态${n + 1}`,
                    }))
                  : [
                      { ...post, id: '10', content: '滚动动态10' },
                      { ...post, id: '11', content: '滚动动态11' },
                      { ...post, id: '12', content: '滚动动态12' },
                    ],
            },
          },
        });
      });
      await page.getByRole('button', { name: '刷新动态' }).click();
      await expect(page.getByRole('article')).toHaveCount(10);
      const end = page.locator('[data-scroll-pagination="动态"]');
      await end.scrollIntoViewIfNeeded();
      await expect(end.getByRole('alert')).toContainText('503');
      await expect(page.getByRole('article')).toHaveCount(10);
      const failedRequests = requests.length;
      await page.waitForTimeout(150);
      expect(requests).toHaveLength(failedRequests);
      failMore = false;
      await end.getByRole('button', { name: '重试动态' }).click();
      await expect(page.getByRole('article')).toHaveCount(12);
      await end.scrollIntoViewIfNeeded();
      await expect(end).toContainText('已全部加载');
      expect(requests).toEqual([1, 2, 2]);
      await expect(page.getByRole('button', { name: /上一页|下一页|加载更多/ })).toHaveCount(0);
      await noOverflow(page);
      await page.screenshot({ path: info.outputPath('feed-end.png') });
      state.empty = true;
      await page.unroute('**/api/moments/list');
      await page.getByRole('button', { name: '刷新动态' }).click();
      await expect(page.getByText('还没有动态，分享第一条摸鱼日常吧')).toBeVisible();
    });

    test(`${skin.id} ${mode}: every paged camp panel scrolls and retries`, async ({
      page,
    }, info) => {
      test.setTimeout(120000);
      await setupPet(page, skin.id, mode);
      for (const title of ['行囊', '物品手册', '补给铺', '外观', '幸运补给']) {
        let failMore = true;
        let initialState = 'ready';
        const requests: number[] = [];
        const pattern =
          title === '外观'
            ? '**/api/api/pet/skin/list?*'
            : title === '幸运补给'
              ? '**/api/turntable/records?*'
              : title === '行囊'
                ? '**/api/itemInstances/my/list/page/vo'
                : title === '补给铺'
                  ? '**/api/itemTemplates/list/page/purchasable'
                  : '**/api/itemTemplates/list/page/vo';
        await page.route(pattern, async (route) => {
          const current =
            route.request().method() === 'POST'
              ? Number(route.request().postDataJSON().current)
              : Number(new URL(route.request().url()).searchParams.get('current'));
          requests.push(current);
          if (initialState === 'error') return route.fulfill({ status: 503, json: {} });
          if (initialState === 'empty')
            return route.fulfill({ json: { code: 0, data: { records: [], total: 0 } } });
          if (current === 2 && failMore) return route.fulfill({ status: 503, json: {} });
          const records = Array.from({ length: current === 1 ? 12 : 1 }, (_, n) => {
            const id = String(current === 1 ? n + 1 : 13);
            const value = {
              id,
              skinId: id,
              name: `分页条目${id}`,
              rarity: 2,
              qualityName: '普通',
              description: '合成分页验收',
              owned: true,
              url: '',
              createTime: '2026-11-12 10:00:00',
            };
            return title === '行囊' ? { id, quantity: 1, template: value } : value;
          });
          await route.fulfill({ json: { code: 0, data: { records, total: 13 } } });
        });
        await page.getByRole('button', { name: new RegExp('^' + title) }).click();
        const dialog = page.getByRole('dialog', { name: title, exact: true });
        const end = dialog.locator('[data-scroll-pagination]');
        await expect(end).toHaveCount(1);
        await end.scrollIntoViewIfNeeded();
        await expect(end.getByRole('alert')).toContainText('503');
        await expect(
          dialog.getByText(title === '幸运补给' ? /^分页条目1\s*·/ : '分页条目1', { exact: true }),
        ).toHaveCount(1);
        failMore = false;
        await end.getByRole('button', { name: /^重试/ }).click();
        await expect(
          dialog.getByText(title === '幸运补给' ? /^分页条目13\s*·/ : '分页条目13', {
            exact: true,
          }),
        ).toHaveCount(1);
        await end.scrollIntoViewIfNeeded();
        await expect(end).toContainText('已全部加载');
        expect(requests).toEqual([1, 2, 2]);
        await expect(dialog.getByRole('button', { name: /上一页|下一页|加载更多/ })).toHaveCount(0);
        const viewport = dialog.getByRole('region', { name: `${title}内容`, exact: true });
        await viewport.focus();
        await viewport.press('Home');
        await viewport.press('End');
        expect(await viewport.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
        await noOverflow(page);
        if (title === '行囊') await page.screenshot({ path: info.outputPath('camp-end.png') });
        await dialog.getByRole('button', { name: '关闭面板', exact: true }).click();
        initialState = 'error';
        await page.getByRole('button', { name: new RegExp('^' + title) }).click();
        await expect(dialog.getByRole('alert')).toContainText('503');
        initialState = 'empty';
        await dialog.getByRole('button', { name: '重试', exact: true }).click();
        await expect(
          dialog.getByText(
            title === '行囊'
              ? '行囊还是空的'
              : title === '外观'
                ? '暂无可用外观，稍后再来看看。'
                : title === '幸运补给'
                  ? '暂无领取记录。'
                  : '暂无物品',
            { exact: true },
          ),
        ).toBeVisible();
        await dialog.getByRole('button', { name: '关闭面板', exact: true }).click();
        await page.unroute(pattern);
      }
    });
  }
