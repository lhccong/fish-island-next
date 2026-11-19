import { expect, test, type Locator } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { frameFixture, releaseFrameFixture } from './avatar-frames-fixture';
import { scrollChatUp } from './chat-scroll-actions';
import { assertArea } from './sign-in-layout';

const designs = [
  ['tide-letter', '潮汐来信'],
  ['berry-cat-paw', '草莓猫爪'],
  ['moon-jellyfish', '月光水母'],
  ['yuzu-capybara', '柚子水豚'],
  ['sea-salt-seal', '海盐小海豹'],
  ['black-sugar-jelly', '黑糖星冻'],
  ['cloud-kite', '云上风筝'],
] as const;
const kiteArtwork = {
  imageUrl: 'https://frame.test/kite-light.svg',
  darkImageUrl: 'https://frame.test/kite-dark.svg',
  textTone: 'theme',
};
const day = 24 * 60 * 60 * 1_000;

test.afterEach(({ page }) => releaseFrameFixture(page));
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: 气泡兑换、启用、恢复与聊天历史`, async ({ page }, info) => {
      const mobile = page.viewportSize()!.width <= 760;
      const activate = (target: Locator) => (mobile ? target.tap() : target.click());
      const frames = await frameFixture(page, skin.id, mode, 501);
      frames.catalog = 'ready';
      frames.release();
      await page.route('https://frame.test/kite-*.svg', (route) => {
        const dark = route.request().url() === kiteArtwork.darkImageUrl;
        return route.fulfill({
          contentType: 'image/svg+xml',
          body: `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="112"><rect x="10" y="23" width="260" height="67" rx="25" fill="${dark ? '#23384d' : '#e8f3ff'}" stroke="#6099c6"/><path d="m15 21 15-15 15 15-15 16zM238 92l13-13 13 13-13 13z" fill="#79acd1"/></svg>`,
        });
      });
      let catalogReads = 0;
      let exchanges = 0;
      let equips = 0;
      let price = 300;
      let redeemed = false;
      let equipped: string | null = null;
      let releaseList!: () => void;
      const listGate = new Promise<void>((resolve) => {
        releaseList = resolve;
      });
      let releaseExchange!: () => void;
      const exchangeGate = new Promise<void>((resolve) => {
        releaseExchange = resolve;
      });
      const catalog = () =>
        designs.map(([id, name]) => ({
          id,
          name,
          points: id === 'berry-cat-paw' ? price : id === 'cloud-kite' ? 425 : 300,
          ...(id === 'cloud-kite' ? { artwork: kiteArtwork } : {}),
          durationDays: 30,
          equipped: equipped === id,
          expiresAt:
            id === 'berry-cat-paw' && redeemed
              ? new Date(Date.now() + 30 * day).toISOString()
              : id === 'tide-letter'
                ? new Date(Date.now() - day).toISOString()
                : null,
        }));
      await page.route('**/api/chat/bubble/list', async (route) => {
        catalogReads += 1;
        if (catalogReads === 1) {
          await listGate;
          return route.fulfill({ json: { code: 50000, message: '气泡目录读取失败' } });
        }
        return route.fulfill({
          json: { code: 0, data: catalogReads === 2 ? [] : catalog() },
        });
      });
      await page.route('**/api/chat/bubble/exchange', async (route) => {
        exchanges += 1;
        expect(route.request().postDataJSON()).toEqual({
          bubbleId: 'berry-cat-paw',
          expectedPoints: price,
        });
        if (exchanges === 1) {
          price = 320;
          return route.fulfill({ json: { code: 50001, message: '气泡价格已调整' } });
        }
        await exchangeGate;
        redeemed = true;
        return route.fulfill({ json: { code: 0, data: catalog() } });
      });
      await page.route('**/api/chat/bubble/equip', (route) => {
        equips += 1;
        equipped = equips === 1 ? 'berry-cat-paw' : null;
        expect(route.request().postDataJSON()).toEqual({ bubbleId: equipped });
        return route.fulfill({ json: { code: 0, data: catalog() } });
      });
      await page.route('**/api/user/get/login', (route) =>
        route.fulfill({
          json: {
            code: 0,
            data: {
              id: 'synthetic-frame-user',
              userName: '气泡岛友',
              userRole: 'user',
              points: 1000,
              usedPoints: redeemed ? 821 : 501,
            },
          },
        }),
      );

      try {
        await page.goto('/utils/avatar-frames');
        const tab = page.getByRole('button', { name: '聊天气泡', exact: true });
        await expect(tab).toBeVisible();
        expect(catalogReads).toBe(0);
        await activate(tab);
        await expect(tab).toHaveAttribute('aria-current', 'page');
        const area = page.getByRole('region', { name: '聊天气泡', exact: true });
        await expect(area.getByRole('status').locator('svg')).toBeVisible();
        releaseList();
        await expect(area.getByRole('alert')).toContainText('气泡目录读取失败');
        const read = area.getByRole('button', { name: '重新读取', exact: true });
        await activate(read);
        await expect(area.getByRole('status')).toHaveText('暂无可兑换的聊天气泡');
        await activate(read);
        await expect(area.getByRole('article')).toHaveCount(7);
        await expect(area.getByText('已过期', { exact: true })).toBeVisible();
        for (const [id] of designs) {
          const sample = area.locator(`[data-bubble-style="${id}"]`);
          await expect(sample).toHaveCSS('border-image-source', /^url\(/);
        }
        const kite = area.locator('[data-bubble-style="cloud-kite"]');
        const kiteImage = mode === 'dark' ? kiteArtwork.darkImageUrl : kiteArtwork.imageUrl;
        await expect(kite).toHaveCSS('border-image-source', `url("${kiteImage}")`);
        await expect(kite).not.toHaveCSS('background-image', 'none');
        await expect(area.getByRole('article').filter({ hasText: '云上风筝' })).toContainText(
          '425 积分',
        );
        await assertArea(area, mobile);
        await expect(area.getByRole('heading', { name: '黑糖星冻' })).toBeAttached();
        const finalProduct = area.getByRole('button', { name: '兑换 云上风筝', exact: true });
        await finalProduct.focus();
        await expect(finalProduct).toBeInViewport();
        if (mobile) expect((await finalProduct.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        if ((await area.evaluate((element) => element.scrollTop)) > 48) {
          await scrollChatUp(page, area);
        }
        const buy = area.getByRole('button', { name: '兑换 草莓猫爪', exact: true });
        await buy.scrollIntoViewIfNeeded();
        await buy.focus();
        await activate(buy);
        const dialog = page.getByRole('dialog', { name: '兑换聊天气泡', exact: true });
        await expect(dialog).toContainText('300 积分');
        await expect(dialog).toContainText('30 天');
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
        await expect(buy).toBeFocused();
        await activate(buy);
        const confirm = dialog.getByRole('button', { name: '确认兑换', exact: true });
        await activate(confirm);
        await expect(dialog.getByRole('alert')).toHaveText('气泡价格已调整');
        await page.keyboard.press('Escape');
        await expect(buy).toBeFocused();
        await activate(page.getByRole('button', { name: '重新读取', exact: true }));
        await activate(buy);
        await expect(dialog).toContainText('320 积分');
        await activate(confirm);
        await expect(dialog.getByRole('status').getByText('兑换中…')).toBeVisible();
        releaseExchange();
        await expect(dialog).toBeHidden();
        await expect(page.getByText('已兑换「草莓猫爪」')).toBeVisible();
        await expect(page.getByText('等级积分 1,000 · 使用积分 821')).toBeVisible();
        await expect(area.getByRole('button', { name: '积分不足 潮汐来信' })).toBeDisabled();
        const use = area.getByRole('button', { name: '使用 草莓猫爪', exact: true });
        await expect(use).toBeFocused();
        await activate(use);
        await expect(page.getByText('正在使用「草莓猫爪」')).toBeVisible();
        if (skin.id === 'moyu-island' || skin.id === 'wps')
          await page.screenshot({ path: info.outputPath('shop.png') });
        await activate(area.getByRole('button', { name: '恢复默认 草莓猫爪', exact: true }));
        await expect(page.getByText('已恢复默认气泡')).toBeVisible();
        expect(exchanges).toBe(2);
        expect(equips).toBe(2);
        expect(catalogReads).toBe(4);

        const messages = [
          { id: '10001', bubbleId: 'black-sugar-jelly', content: '装扮历史消息' },
          { id: '10002', content: '使用默认气泡的消息' },
          {
            id: '10003',
            bubbleId: 'cloud-kite',
            bubbleArtwork: kiteArtwork,
            content: '新增商品的历史消息',
          },
        ];
        await page.route('**/api/chat/message/page/vo', (route) =>
          route.fulfill({
            json: {
              code: 0,
              data: {
                records: messages.map((message, index) => ({
                  messageWrapper: {
                    message: {
                      ...message,
                      timestamp: 1794700000000 + index,
                      sender: { id: 'synthetic-other', name: '合成岛友' },
                    },
                  },
                })),
              },
            },
          }),
        );
        await page.goto('/chat');
        const decorated = page.locator('[data-message-id="10001"]').getByRole('group');
        await expect(decorated).toHaveAttribute('data-bubble-style', 'black-sugar-jelly');
        await expect(decorated).toHaveCSS('border-image-source', /^url\(/);
        await expect(decorated).toHaveCSS('color', 'rgb(255, 255, 255)');
        const ordinary = page.locator('[data-message-id="10002"]').getByRole('group');
        await expect(ordinary).toHaveCSS('border-image-source', 'none');
        const dynamic = page.locator('[data-message-id="10003"]').getByRole('group');
        await expect(dynamic).toHaveCSS('border-image-source', `url("${kiteImage}")`);
        await expect(dynamic).not.toHaveCSS('background-image', 'none');
        const chat = page.getByRole('region', { name: '群聊消息区', exact: true });
        expect(await chat.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
          true,
        );
        if (skin.id === 'wps' || skin.id === 'pixel-island')
          await page.screenshot({ path: info.outputPath('chat.png') });
      } finally {
        releaseList();
        releaseExchange();
      }
    });
  }
