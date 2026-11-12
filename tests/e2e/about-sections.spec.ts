import { expect, test, type Page } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';

test.setTimeout(120_000);
async function choose(page: Page, name: string) {
  const label = name.includes('打赏榜') ? '赞助榜' : name.replace(/\s*[🎁🚀🔥]/gu, '');
  await page
    .getByRole('navigation', { name: '关于模块' })
    .getByRole('link', { name: label, exact: true })
    .click();
}
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'] as const) {
    test(`${skin.id} ${mode}: complete about sections`, async ({ page, isMobile }, info) => {
      await page.addInitScript(
        ({ id, mode }) => {
          localStorage.setItem('fish-island:skin', id);
          localStorage.setItem('fish-island:color-mode', mode);
          Object.defineProperty(navigator, 'clipboard', {
            value: {
              writeText: async (value: string) => {
                localStorage.setItem('about-product-copy', value);
              },
            },
          });
        },
        { id: skin.id, mode },
      );
      await page.route('**/api/**', (route) => route.abort());
      let state: 'error' | 'empty' | 'ready' = 'error';
      let release: () => void = () => {};
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route('**/api/donation/**/vo', async (route) => {
        await gate;
        if (state === 'error') return route.fulfill({ status: 503, body: 'unavailable' });
        const current = (route.request().postDataJSON() as { current: number }).current;
        const details = route.request().url().includes('/detail/');
        const records =
          state === 'empty'
            ? []
            : Array.from({ length: details ? 10 : 20 }, (_, i) => ({
                id: String(current * 100 + i),
                amount: 1,
                donorUser: { userName: `合成支持者${current}-${i}` },
                remark: '合成测试数据',
                createTime: '2026-11-12 10:00:00',
              }));
        return route.fulfill({
          json: { code: 0, data: { records, total: state === 'empty' ? '0' : '50' } },
        });
      });
      await page.goto('/rank/reward');
      await expect(page.getByRole('status')).toHaveCount(2);
      await page.screenshot({ path: info.outputPath('reward-loading.png') });
      release();
      await expect(page.getByRole('alert')).toHaveCount(2);
      await page.screenshot({ path: info.outputPath('reward-error.png') });
      state = 'empty';
      await page.getByRole('button', { name: '重试榜单' }).click();
      await page.getByRole('button', { name: '重试动态' }).click();
      await expect(page.getByText('暂无打赏记录', { exact: true })).toHaveCount(2);
      await page.screenshot({ path: info.outputPath('reward-empty.png') });
      state = 'ready';
      await choose(page, '外卖福利 🎁');
      await expect(page.getByRole('heading', { name: '外卖福利专区 🎁' })).toBeVisible();
      await expect(page.getByRole('button', { name: /^查看.+大图$/ })).toHaveCount(4);
      await page.getByRole('button', { name: '查看美团福利券1大图' }).click();
      const preview = page.getByRole('dialog', { name: '美团福利券1' });
      await expect(preview.getByRole('img')).toBeVisible();
      await page.screenshot({ path: info.outputPath('welfare-preview.png') });
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: '查看美团福利券1大图' })).toBeFocused();
      await choose(page, '其他产品 🔥');
      await expect(page.getByRole('article')).toHaveCount(5);
      await page.getByRole('button', { name: '复制摸鱼 TV网址' }).click();
      await expect(page.getByRole('status')).toHaveText('网址已复制到剪贴板');
      expect(await page.evaluate(() => localStorage.getItem('about-product-copy'))).toBe(
        'https://tv.yucoder.cn',
      );
      await expect(page.getByRole('link', { name: '立即访问' })).toHaveCount(3);
      await page.screenshot({ path: info.outputPath('products.png') });
      await choose(page, '打赏榜 👑');
      const rank = page.getByRole('region', { name: '排行榜', exact: true });
      await expect(rank.getByRole('listitem')).toHaveCount(20);
      await rank.getByRole('region', { name: '赞助排名滚动区' }).evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await expect(rank.getByText('合成支持者2-0', { exact: true })).toHaveCount(1);
      await page.getByRole('button', { name: '打赏支持', exact: true }).click();
      const pay = page.getByRole('dialog', { name: '打赏支持 💗' });
      await pay.getByRole('button', { name: '￥6.6', exact: true }).click();
      await pay.getByRole('textbox', { name: '备注（可选）' }).fill('合成测试备注');
      let createRelease: () => void = () => {};
      const createGate = new Promise<void>((resolve) => {
        createRelease = resolve;
      });
      let creates = 0;
      let createFails = true;
      let querySuccess = false;
      let queryCount = 0;
      const order = {
        tradeOrderId: 'synthetic-test-order',
        totalFee: 6.6,
        urlQrcode: 'https://example.com/synthetic-qr.png',
        status: 'WP',
      };
      await page.route('https://example.com/synthetic-qr.png', (route) =>
        route.fulfill({ path: 'src/features/about/assets/qq-about.png' }),
      );
      await page.route('**/api/pay/create', async (route) => {
        creates++;
        if (createFails) return route.fulfill({ status: 503, body: 'unavailable' });
        expect(route.request().postDataJSON()).toMatchObject({
          totalFee: 6.6,
          type: 1,
          remark: '合成测试备注',
        });
        await createGate;
        await route.fulfill({ json: { code: 0, data: order } });
      });
      await page.route('**/api/pay/query?*', (route) => {
        queryCount++;
        return querySuccess
          ? route.fulfill({ json: { code: 0, data: { ...order, status: 'OD' } } })
          : route.fulfill({ status: 503, body: 'unavailable' });
      });
      const confirm = pay.getByRole('button', { name: '确认打赏 ￥6.6', exact: true });
      await confirm.click();
      await expect(pay.getByRole('alert')).toContainText('服务暂不可用');
      await page.screenshot({ path: info.outputPath('payment-create-error.png') });
      createFails = false;
      if (isMobile) await confirm.tap();
      else await confirm.click();
      await expect(pay.getByRole('button', { name: '创建订单中…' })).toBeDisabled();
      await page.screenshot({ path: info.outputPath('payment-creating.png') });
      createRelease();
      await expect(pay.getByRole('img', { name: '支付二维码' })).toBeVisible();
      await pay.getByRole('button', { name: '我已支付', exact: true }).click();
      await expect(pay.getByRole('alert')).toContainText('服务暂不可用');
      await page.screenshot({ path: info.outputPath('payment-error.png') });
      querySuccess = true;
      await pay.getByRole('button', { name: '我已支付', exact: true }).click();
      await expect(pay.getByRole('status')).toHaveText('支付成功！感谢您的支持 💝');
      expect(creates).toBe(2);
      const beforeClose = queryCount;
      await page.screenshot({ path: info.outputPath('payment-success.png') });
      await pay.getByRole('button', { name: '关闭', exact: true }).click();
      await expect(pay).toBeHidden();
      expect(queryCount).toBe(beforeClose);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  }
