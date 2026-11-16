import { expect as baseExpect, test } from '@playwright/test';
import { setupChatMenu } from './chat-menu-fixture';

const expect = baseExpect.configure({ timeout: 15_000 });
test.setTimeout(60_000);

for (const mode of ['light', 'dark'])
  test(`classic reference ${mode}: populated layout and members`, async ({ page }, info) => {
    const mobile = page.viewportSize()!.width <= 760;
    if (!mobile) await page.setViewportSize({ width: 1920, height: 911 });
    await setupChatMenu(page, 'moyu-island', mode, 'user', async () => {
      await page.route('**/api/chat/online/user', (route) =>
        route.fulfill({
          json: {
            code: 0,
            data: Array.from({ length: 40 }, (_, i) => ({
              id: `${500 + i}`,
              name: `合成岛友${i}`,
              level: i % 2 ? 7 : 1,
            })),
          },
        }),
      );
      await page.route('**/api/moments/list', (route) =>
        route.fulfill({
          json: {
            code: 0,
            data: {
              records: Array.from({ length: 6 }, (_, i) => ({
                id: `${700 + i}`,
                userId: '456',
                userName: `合成岛民${i}`,
                content: '今天也在岛上记录一件小事，看看海风与落日。',
                createTime: '2026-11-16 10:00:00',
                mediaJson: [],
                likeNum: 3,
                liked: false,
                likeUserNames: '',
                commentNum: 0,
                isTop: 0,
              })),
              total: 6,
            },
          },
        }),
      );
    });
    const draft = page.getByRole('textbox', { name: '消息草稿', exact: true });
    await draft.fill('合成草稿');
    if (mobile) {
      await page.getByRole('button', { name: '查看聊天列表', exact: true }).tap();
      await expect(page.getByRole('dialog', { name: '聊天列表' })).toBeVisible();
      await page.getByRole('button', { name: '关闭聊天列表', exact: true }).tap();
      await expect(draft).toHaveText('合成草稿');
    } else {
      await expect(
        page.getByRole('complementary', { name: '聊天会话', exact: true }),
      ).toBeVisible();
      await expect(page.getByRole('complementary', { name: '聊天会话', exact: true })).toHaveCSS(
        'border-radius',
        '24px',
      );
      await expect(page.getByRole('complementary', { name: '经典在线成员' })).toContainText('40');
      const chatCard = page.locator('#main-content').locator('..');
      await expect(chatCard).toHaveCSS('border-radius', '24px');
      expect((await chatCard.boundingBox())!.y).toBe(84);
      const member = page
        .getByRole('complementary', { name: '经典在线成员' })
        .getByRole('listitem')
        .first();
      await expect(member.locator('[data-size="classic"]')).toHaveCSS('width', '28px');
      await expect(member.locator('[data-size="classic"]')).toHaveCSS('border-radius', '50%');
      await expect(member).toHaveCSS('height', '46px');
      await expect(member.getByLabel('等级 7', { exact: true })).toHaveText('👑');
      await expect(member).toContainText('合成岛友1');
      await expect(page.getByRole('button', { name: '刷新经典在线成员' })).toHaveCount(0);
      const signIn = page.getByRole('button', { name: /^每日签到/ }).filter({ visible: true });
      const box = (await signIn.boundingBox())!;
      expect(box.x).toBeGreaterThan(1700);
      await expect(signIn).toHaveCSS('border-radius', '50%');
      await signIn.click();
      await expect(page.getByRole('dialog', { name: '每日签到', exact: true })).toBeVisible();
      await page.getByRole('button', { name: '关闭签到', exact: true }).click();
      await expect(signIn).toBeFocused();
      const scroll = page.getByRole('region', { name: '经典在线成员滚动区', exact: true });
      await scroll.hover();
      await page.mouse.wheel(0, 900);
      await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath(`classic-${mode}.png`) });
  });
