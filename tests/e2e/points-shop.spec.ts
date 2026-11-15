import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { frameFixture, releaseFrameFixture } from './avatar-frames-fixture';
import { assertArea } from './sign-in-layout';

test.afterEach(({ page }) => releaseFrameFixture(page));
for (const width of [1280, 375, 390]) {
  test.describe(`${width}px`, () => {
    test.use({
      viewport: { width, height: width === 1280 ? 800 : 844 },
      isMobile: width < 760,
      hasTouch: width < 760,
    });
    for (const skin of builtinSkins)
      for (const mode of ['light', 'dark']) {
        test(`${skin.id} ${mode} 商城兑换、流水与布局`, async ({ page }, info) => {
          const frames = await frameFixture(page, skin.id, mode);
          frames.catalog = 'ready';
          frames.exchangeFail = false;
          frames.wearFail = false;
          frames.moreFail = false;
          frames.release();
          let catalog = 'loading';
          let fail = true;
          let moreFail = true;
          let syncFail = true;
          let recordState = 'loading';
          let releaseRecords = () => {};
          const recordsGate = new Promise<void>((resolve) => {
            releaseRecords = resolve;
          });
          let purchases = 0;
          let reads = 0;
          let release = () => {};
          const gate = new Promise<void>((resolve) => {
            release = resolve;
          });
          const item = (i: number) => ({
            frameId: String(i),
            name: `会员月卡 ${i}`,
            description: '增加一个月会员时间',
            type: i === 3 ? '2' : '1',
            points: i === 2 ? 99999 : 100,
            imgUrl: i === 1 ? 'https://frame.test/1.svg' : '',
          });
          await page.route('**/api/props/list/page?*', async (route) => {
            reads++;
            if (catalog === 'loading') await gate;
            if (catalog === 'error')
              return route.fulfill({ json: { code: 50000, message: '道具读取失败' } });
            const current = new URL(route.request().url()).searchParams.get('current');
            if (current !== '1' && moreFail)
              return route.fulfill({ json: { code: 50000, message: '追加失败' } });
            await route.fulfill({
              json: {
                code: 0,
                data: {
                  total: catalog === 'empty' ? '0' : '13',
                  records:
                    catalog === 'empty'
                      ? []
                      : current === '1'
                        ? Array.from({ length: 12 }, (_, i) => item(i + 1))
                        : [item(12), item(13)],
                },
              },
            });
          });
          await page.route('**/api/user/get/login', (route) => {
            if (purchases < 2) return route.fallback();
            return route.fulfill({
              json: syncFail
                ? { code: 50000, message: '同步失败' }
                : {
                    code: 0,
                    data: {
                      id: 'synthetic-frame-user',
                      userName: '头像框岛友',
                      userRole: 'user',
                      points: 1000,
                      usedPoints: 300,
                    },
                  },
            });
          });
          await page.route('**/api/props/purchase', (route) => {
            purchases++;
            expect(route.request().postDataJSON()).toEqual({ propsId: '1' });
            return route.fulfill({
              json: fail ? { code: 50000, message: '兑换失败，请重试' } : { code: 0, data: true },
            });
          });
          await page.route('**/api/user/points/record/list/my?*', async (route) => {
            if (recordState === 'loading') await recordsGate;
            if (recordState === 'error')
              return route.fulfill({ json: { code: 50000, message: '流水读取失败' } });
            if (recordState === 'empty')
              return route.fulfill({ json: { code: 0, data: { total: '0', records: [] } } });
            return route.fulfill({
              json: {
                code: 0,
                data: {
                  total: '2',
                  records: [
                    {
                      id: '1',
                      changeType: 2,
                      changePoints: 100,
                      afterPoints: 1000,
                      afterUsedPoints: 200,
                      description: '兑换月卡',
                      createTime: '2026-11-15T10:00:00+08:00',
                    },
                    {
                      id: '2',
                      changeType: 1,
                      changePoints: 10,
                      afterPoints: 1000,
                      afterUsedPoints: 100,
                      description: '每日签到',
                      createTime: '2026-11-15T09:00:00+08:00',
                    },
                  ],
                },
              },
            });
          });
          await page.goto('/avatarFrames', { waitUntil: 'domcontentloaded' });
          const store = page.getByRole('region', { name: '店铺', exact: true });
          const frameScroll = page.getByRole('region', { name: '头像框列表' });
          await expect(
            page.getByRole('heading', { name: '海风头像框 1', exact: true }),
          ).toBeVisible();
          await assertArea(frameScroll, width < 760);
          const firstFrame = store.getByRole('article').filter({ hasText: '海风头像框 1' }).first();
          await firstFrame.getByRole('button', { name: '立即兑换' }).click();
          await page
            .getByRole('dialog', { name: '确认兑换头像框' })
            .getByRole('button', { name: '确认兑换', exact: true })
            .click();
          await firstFrame.getByRole('button', { name: '使用', exact: true }).click();
          await expect(firstFrame.getByRole('button', { name: '使用中' })).toBeDisabled();
          await store.getByRole('button', { name: '其他物品', exact: true }).click();
          await expect(store.getByText('正在加载道具…')).toBeVisible();
          catalog = 'error';
          release();
          await expect(store.getByRole('alert')).toContainText('道具读取失败');
          catalog = 'empty';
          await store.getByRole('button', { name: '重新读取' }).click();
          await expect(store.getByText('暂无可兑换的道具')).toBeVisible();
          catalog = 'ready';
          await store.getByRole('button', { name: '积分记录', exact: true }).click();
          await expect(store.getByText('正在加载积分记录…')).toBeVisible();
          recordState = 'error';
          releaseRecords();
          await expect(store.getByRole('alert')).toContainText('流水读取失败');
          recordState = 'empty';
          await store.getByRole('button', { name: '重新读取' }).click();
          await expect(store.getByText('暂无积分记录')).toBeVisible();
          recordState = 'ready';
          await store.getByRole('button', { name: '重新读取' }).click();
          await expect(store.getByText('兑换月卡', { exact: true })).toBeVisible();
          await expect(store.getByText('-100', { exact: true })).toBeVisible();
          await expect(store.getByText('+10', { exact: true })).toBeVisible();
          await assertArea(
            page.getByRole('region', { name: '积分记录', exact: true }),
            width < 760,
          );
          await store.getByRole('button', { name: '其他物品', exact: true }).click();
          await store.getByRole('button', { name: '重新读取' }).click();
          const first = store
            .getByRole('article')
            .filter({ has: page.getByRole('heading', { name: '会员月卡 1', exact: true }) });
          await expect(first).toBeVisible();
          await expect(first.getByRole('img', { name: '会员月卡 1', exact: true })).toBeVisible();
          expect(
            await first.evaluate((element) => element.scrollWidth <= element.clientWidth),
          ).toBe(true);
          await expect(store.getByRole('button', { name: '积分不足' })).toBeDisabled();
          await expect(store.getByRole('button', { name: '暂不支持兑换' })).toBeDisabled();
          await first.getByRole('button').click();
          const confirm = page.getByRole('dialog', { name: '确认兑换道具' });
          await page.keyboard.press('Escape');
          await expect(confirm).toHaveCount(0);
          await expect(first.getByRole('button')).toBeFocused();
          await first.getByRole('button').click();
          await confirm.getByRole('button', { name: '确认兑换', exact: true }).click();
          await expect(confirm.getByRole('alert')).toContainText('兑换失败');
          const before = reads;
          await page.evaluate(async () => {
            const path = '/src/features/appearance/index.ts';
            const { useAppearanceStore } = (await import(
              path
            )) as typeof import('../../src/features/appearance');
            const state = useAppearanceStore.getState();
            state.setSkinId(state.skinId === 'wps' ? 'wechat' : 'wps');
            state.setColorMode(state.colorMode === 'light' ? 'dark' : 'light');
          });
          await expect(confirm).toBeVisible();
          expect(reads).toBe(before);
          // Restore the matrix appearance before inspecting layout.
          await page.evaluate(
            async ({ skin, mode }) => {
              const path = '/src/features/appearance/index.ts';
              const { useAppearanceStore } = (await import(
                path
              )) as typeof import('../../src/features/appearance');
              useAppearanceStore
                .getState()
                .setSkinId(
                  skin as typeof useAppearanceStore.getState extends () => infer S
                    ? S extends { skinId: infer I }
                      ? I
                      : never
                    : never,
                );
              useAppearanceStore.getState().setColorMode(mode as 'light' | 'dark');
            },
            { skin: skin.id, mode },
          );
          fail = false;
          await confirm.getByRole('button', { name: '确认兑换', exact: true }).click();
          await expect(confirm).toHaveCount(0);
          await expect(
            store.getByRole('status').filter({ hasText: '已兑换「会员月卡 1」' }),
          ).toBeVisible();
          await expect(store.getByRole('alert')).toContainText('兑换已成功，积分同步失败');
          await expect(first.getByRole('button')).toBeDisabled();
          await store.getByRole('button', { name: '积分记录', exact: true }).click();
          await store.getByRole('button', { name: '其他物品', exact: true }).click();
          await expect(first.getByRole('button')).toBeDisabled();
          syncFail = false;
          await store.getByRole('button', { name: '同步积分' }).click();
          await expect(first.getByRole('button')).toBeEnabled();
          await expect(store.getByText('700', { exact: true }).first()).toBeVisible();
          expect(purchases).toBe(2);
          expect(reads).toBe(before);
          const scroll = page.getByRole('region', { name: '道具', exact: true });
          await assertArea(scroll, width < 760);
          await page.screenshot({ path: info.outputPath('shop-top.png') });
          await scroll.evaluate((e) => {
            e.scrollTop = e.scrollHeight;
          });
          await expect(store.getByRole('alert')).toContainText('追加失败');
          moreFail = false;
          await store.getByRole('button', { name: '重试道具' }).click();
          await expect(
            store.getByRole('heading', { name: '会员月卡 13', exact: true }),
          ).toHaveCount(1);
          await expect(
            store.getByRole('heading', { name: '会员月卡 12', exact: true }),
          ).toHaveCount(1);
          await expect(store.getByText('已全部加载', { exact: true })).toBeVisible();
          await scroll.evaluate((e) => {
            e.scrollTop = e.scrollHeight;
          });
          await store.getByRole('article').last().getByRole('button').focus();
          await expect(store.getByRole('article').last().getByRole('button')).toBeInViewport();
          await assertArea(scroll, width < 760);
          expect(await store.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true);
          await page.screenshot({ path: info.outputPath('shop-bottom.png') });
          await store.getByRole('button', { name: '相关介绍', exact: true }).click();
          await expect(store.getByRole('link', { name: '前往支持' })).toBeVisible();
          await page.goto('/discover');
          const navigation = page
            .getByRole('navigation', { name: '发现菜单' })
            .filter({ visible: true });
          await expect(navigation.getByRole('link', { name: '店铺', exact: true })).toBeVisible();
          await navigation.getByRole('link', { name: '文章', exact: true }).click();
          await expect(page.getByRole('heading', { name: '文章', exact: true })).toBeVisible();
        });
      }
  });
}
