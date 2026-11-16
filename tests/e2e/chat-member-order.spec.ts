import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { frameFixture } from './avatar-frames-fixture';

const members = [
  { id: 'unknown', name: '合成成员缺少等级' },
  { id: 'low', name: '合成成员低等级', level: 1 },
  { id: 'high-first', name: '合成成员高等级甲', level: 7 },
  { id: 'high-second', name: '合成成员高等级乙', level: 7 },
  { id: 'zero', name: '合成成员零等级', level: 0 },
  ...Array.from({ length: 24 }, (_, i) => ({
    id: `extra-${i}`,
    name: `合成成员补充${i}`,
    level: 1,
  })),
];
const expectedNames = [
  '合成成员高等级甲',
  '合成成员高等级乙',
  '合成成员低等级',
  ...Array.from({ length: 24 }, (_, i) => `合成成员补充${i}`),
  '合成成员零等级',
  '合成成员缺少等级',
];

for (const width of [1280, 375, 390]) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, hasTouch: width <= 760 });
    // Classic and pixel desktop shells reserve the sidebar for the island feed.
    for (const skin of builtinSkins.filter(
      (skin) => width <= 760 || !['moyu-island', 'pixel-island'].includes(skin.id),
    ))
      for (const mode of ['light', 'dark']) {
        test(`${skin.id} ${mode}: 聊天列表按等级降序且保留同级顺序`, async ({ page }, info) => {
          await frameFixture(page, skin.id, mode);
          let phase = 'loading';
          let requests = 0;
          let release!: () => void;
          const gate = new Promise<void>((resolve) => {
            release = resolve;
          });
          await page.route('**/api/chat/online/user', async (route) => {
            requests++;
            if (phase === 'loading') await gate;
            await route.fulfill({
              status: phase === 'error' ? 503 : 200,
              json: { code: 0, data: phase === 'empty' ? [] : members },
            });
          });
          try {
            await page.goto('/chat');
            const draft = page.getByRole('textbox', { name: '消息草稿', exact: true });
            await draft.fill('合成排序验证草稿');
            const mobile = width <= 760;
            const dialog = mobile || skin.id === 'wps';
            const trigger = page.getByRole('button', { name: '查看聊天列表', exact: true });
            if (mobile) await trigger.tap();
            else if (dialog) await trigger.click();
            const host = dialog
              ? page.getByRole('dialog', { name: '聊天列表', exact: true })
              : page.getByRole('complementary', { name: '聊天会话', exact: true });
            const list = host.getByRole('region', { name: '聊天列表', exact: true });
            const noOverflow = async () => {
              expect(await list.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
              expect(
                await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
              ).toBe(true);
            };
            await expect(list.getByRole('status')).toHaveText('正在加载列表…');
            await expect(list.getByRole('button', { name: '刷新聊天列表' })).toBeDisabled();
            await noOverflow();
            phase = 'error';
            release();
            await expect(list.getByRole('alert')).toContainText('暂时无法加载列表');
            await noOverflow();
            phase = 'empty';
            await list.getByRole('button', { name: '重试', exact: true }).click();
            await expect(list.getByRole('status')).toHaveText('暂无列表内容，稍后刷新看看');
            await noOverflow();
            phase = 'success';
            await list.getByRole('button', { name: '刷新聊天列表' }).click();
            const names = list.getByRole('button', { name: /^查看合成成员.*的用户卡片$/ });
            await expect(names).toHaveText(expectedNames);
            const readyRequests = requests;
            await expect(list.locator('[aria-current="true"]')).toContainText('鱼岛群聊');
            await expect(list.getByRole('listitem').nth(2)).toContainText('服务号');
            await expect(list.getByRole('listitem').nth(5)).toContainText('项目协作群');
            const search = list.getByRole('searchbox', { name: '搜索聊天' });
            await search.fill('合成成员高等级');
            await expect(names).toHaveText(expectedNames.slice(0, 2));
            await search.fill('');
            await expect(names).toHaveText(expectedNames);
            const scroll = list.getByRole('region', { name: '聊天列表滚动区' });
            await scroll.hover();
            const track = scroll.locator('..').locator(':scope > [data-orientation="vertical"]');
            await expect(track).toHaveCSS('visibility', mobile ? 'hidden' : 'visible');
            await scroll.evaluate((e) => {
              e.scrollTop = e.scrollHeight;
            });
            await expect(list.getByRole('listitem').last()).toBeInViewport();
            await scroll.evaluate((e) => {
              e.scrollTop = 0;
            });
            await noOverflow();
            await page.screenshot({ path: info.outputPath('member-order.png') });
            if (dialog) {
              const close = host.getByRole('button', { name: '关闭聊天列表', exact: true });
              if (mobile) await close.tap();
              else await close.click();
              await expect(trigger).toBeFocused();
              if (mobile) await trigger.tap();
              else await trigger.click();
              await expect(names).toHaveText(expectedNames);
              await page.keyboard.press('Escape');
            }
            await expect(draft).toHaveText('合成排序验证草稿');
            expect(requests).toBe(readyRequests);
          } finally {
            release();
          }
        });
      }
  });
}
