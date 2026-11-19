import { expect, test, type Locator } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { capture, scrollRegion } from './account-menu-layout';
import { setupChatMenu } from './chat-menu-fixture';

for (const width of [1280, 375, 390]) {
  const mobile = width < 760;
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 800 }, isMobile: mobile, hasTouch: mobile });
    for (const skin of builtinSkins)
      for (const mode of ['light', 'dark']) {
        test(`${skin.id} ${mode}: 查看他人的关注和粉丝`, async ({ page }) => {
          const fixture = await setupChatMenu(page, skin.id, mode);
          const press = (control: Locator) => (mobile ? control.tap() : control.click());
          let cardReads = 0;
          let staleOwnReads = 0;
          let fail = true;
          let release!: () => void;
          const pending = new Promise<void>((resolve) => {
            release = resolve;
          });
          const pages: string[] = [];
          await page.route('**/api/user/get/vo?*', (route) => {
            cardReads++;
            return route.fulfill({
              json: {
                code: 0,
                data: {
                  id: '456',
                  userName: '合成岛友',
                  momentsBgUrl: 'https://menu.test/image.png',
                  followingCount: '0',
                  followerCount: '13',
                },
              },
            });
          });
          await page.route('**/api/follow/is-following?*', (route) =>
            route.fulfill({ json: { code: 0, data: false } }),
          );
          await page.route(/\/api\/follow\/(following|followers)\?/, (route) => {
            staleOwnReads++;
            return route.fulfill({ json: { code: 0, data: { total: '0', records: [] } } });
          });
          await page.route('**/api/follow/user/following?*', (route) => {
            expect(new URL(route.request().url()).searchParams.get('userId')).toBe('456');
            return route.fulfill({ json: { code: 0, data: { total: '0', records: [] } } });
          });
          await page.route('**/api/follow/user/followers?*', async (route) => {
            const params = new URL(route.request().url()).searchParams;
            expect(params.get('userId')).toBe('456');
            expect(params.get('pageSize')).toBe('20');
            const current = params.get('current')!;
            pages.push(current);
            if (fail) {
              await pending;
              return route.fulfill({ json: { code: 50000, message: '名单读取失败' } });
            }
            const records =
              current === '1'
                ? Array.from({ length: 12 }, (_, index) => ({
                    userId: String(800 + index),
                    userName: `合成粉丝 ${index + 1}`,
                    userProfile: index === 1 ? '用于验证名单换行的简介。'.repeat(7) : '合成简介',
                    isMutual: index === 0,
                  }))
                : [{ userId: '90071992547409921', userName: '末页粉丝', isMutual: false }];
            return route.fulfill({ json: { code: 0, data: { total: '13', records } } });
          });
          const draft = page.getByRole('textbox', { name: '消息草稿' });
          await draft.fill('查看名单时保留的草稿');
          fixture.push('8881', '合成名单卡片');
          const opener = page
            .locator('[data-message-id="8881"]')
            .getByRole('button', { name: '查看合成岛友的用户卡片' });
          await press(opener);
          const dialog = page.getByRole('dialog', { name: '用户卡片' });
          const following = dialog.getByRole('button', { name: '0 关注', exact: true });
          const fans = dialog.getByRole('button', { name: '13 粉丝', exact: true });
          await expect(fans).toBeVisible();
          expect((await fans.boundingBox())!.height).toBeGreaterThanOrEqual(44);
          await press(following);
          await expect(dialog.getByRole('heading', { name: '合成岛友的关注' })).toBeFocused();
          await expect(dialog.getByText('暂无关注。', { exact: true })).toBeVisible();
          const back = dialog.getByRole('button', { name: '返回卡片' });
          await press(back);
          await expect(following).toBeFocused();
          await press(fans);
          await expect(dialog.getByRole('heading', { name: '合成岛友的粉丝' })).toBeFocused();
          await expect(dialog.getByRole('status')).toContainText('正在读取列表');
          release();
          await expect(dialog.getByRole('alert')).toHaveText('名单读取失败');
          fail = false;
          await press(dialog.getByRole('button', { name: '重试', exact: true }));
          const region = dialog.getByRole('region', { name: '粉丝列表' });
          await expect(region.getByRole('listitem').first()).toContainText('互相关注');
          await expect(dialog.getByRole('button', { name: '取消关注', exact: true })).toHaveCount(
            0,
          );
          const track = region.locator('..').locator('[data-orientation="vertical"]');
          if (mobile) await expect(track).toBeHidden();
          else {
            await region.hover();
            await expect(track).toHaveCSS('opacity', '1');
          }
          await capture(page, '他人的粉丝名单');
          for (let swipe = 0; swipe < 6 && !pages.includes('2'); swipe++) {
            await scrollRegion(page, region, mobile);
          }
          await expect(region.getByText('末页粉丝', { exact: true })).toBeVisible();
          await expect(region.getByText('已全部加载')).toBeVisible();
          const bounds = await region.evaluate((element) => ({
            scroll: element.scrollTop,
            overflow: element.scrollWidth - element.clientWidth,
            gutter: parseFloat(getComputedStyle(element).paddingInlineEnd),
          }));
          expect(bounds.scroll).toBeGreaterThan(0);
          expect(bounds.overflow).toBeLessThanOrEqual(1);
          expect(bounds.gutter).toBeGreaterThanOrEqual(mobile ? 20 : 24);
          const beforeAppearance = [...pages];
          await page.evaluate(
            async (nextSkin) => {
              const { useAppearanceStore } = await import('/src/features/appearance/index.ts');
              const appearance = useAppearanceStore.getState();
              appearance.setSkinId(nextSkin);
              appearance.setColorMode(appearance.colorMode === 'light' ? 'dark' : 'light');
            },
            skin.id === 'wps' ? 'wechat' : 'wps',
          );
          await expect(region.getByText('末页粉丝', { exact: true })).toBeVisible();
          expect(pages).toEqual(beforeAppearance);
          expect(pages.filter((number) => number === '2')).toEqual(['2']);
          await press(back);
          await expect(fans).toBeFocused();
          expect(cardReads).toBe(1);
          expect(staleOwnReads).toBe(0);
          if (mobile) await press(dialog.getByRole('button', { name: '关闭用户卡片' }));
          else await page.keyboard.press('Escape');
          await expect(opener).toBeFocused();
          await expect(draft).toHaveText('查看名单时保留的草稿');
          expect(fixture.stats().connections).toBe(1);
        });
      }
  });
}
