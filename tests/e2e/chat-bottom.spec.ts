import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    test(`${skin.id} ${mode}: sending and receiving settle fully at the bottom`, async ({
      page,
    }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      const viewport = page.getByRole('region', { name: '群聊消息区', exact: true });
      const bottom = async () => {
        await expect
          .poll(() => viewport.evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop))
          .toBeLessThanOrEqual(1);
      };
      for (let id = 1; id <= 30; id++) fixture.push(String(id), `底部回归消息 ${id}`);
      await expect(page.locator('[data-message-id="30"]')).toBeVisible();
      await bottom();
      for (let id = 31; id <= 33; id++) {
        fixture.push(
          String(id),
          `收到的新消息 ${id}\n${'需要完整展示的换行内容。'.repeat(id - 30)}`,
        );
        await expect(page.locator(`[data-message-id="${id}"]`)).toBeVisible();
        await bottom();
      }
      let releaseImage!: () => void;
      let imageAttempts = 0;
      const imageReady = new Promise<void>((resolve) => {
        releaseImage = resolve;
      });
      await page.route('https://bottom.test/tall.svg', async (route) => {
        if (++imageAttempts === 1) {
          await route.fulfill({ status: 503 });
          return;
        }
        await imageReady;
        await route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="160"><rect width="1200" height="160" fill="#147a99"/></svg>',
        });
      });
      fixture.push('34', '[img]https://bottom.test/tall.svg[/img]');
      const image = page.locator('[data-message-id="34"] [data-image-state]');
      await expect(image).toHaveAttribute('data-image-state', 'error');
      await bottom();
      await page.getByRole('button', { name: '重新加载图片', exact: true }).click();
      await expect(image).toHaveAttribute('data-image-state', 'loading');
      await bottom();
      await page.waitForTimeout(250);
      releaseImage();
      await expect(image).toHaveAttribute('data-image-state', 'ready');
      await bottom();

      // Reading history must stop following, including within the old 64px threshold.
      await viewport.focus();
      await page.keyboard.press('ArrowUp');
      await expect
        .poll(() =>
          viewport.evaluate(async (el) => {
            const positions: number[] = [];
            for (let frame = 0; frame < 12; frame++) {
              await new Promise(requestAnimationFrame);
              positions.push(el.scrollTop);
            }
            return Math.max(...positions) - Math.min(...positions);
          }),
        )
        .toBeLessThanOrEqual(1);
      const readingTop = await viewport.evaluate((el) => el.scrollTop);
      fixture.push('35', '回看时保留当前位置');
      await page.waitForTimeout(200);
      expect(
        Math.abs((await viewport.evaluate((el) => el.scrollTop)) - readingTop),
      ).toBeLessThanOrEqual(1);
      await expect(page.getByRole('button', { name: '查看最新消息', exact: true })).toBeVisible();

      let sent = 0;
      await page.route('**/api/chat/message/send', async (route) => {
        const command = route.request().postDataJSON() as {
          content: string;
          clientMessageId: string;
        };
        sent++;
        await route.fulfill({
          json: {
            code: 0,
            data: {
              message: {
                id: '36',
                content: command.content,
                clientMessageId: command.clientMessageId,
                sender: { id: '123', name: '本人合成' },
                timestamp: 1794441600036,
              },
            },
          },
        });
      });
      await page.getByRole('textbox', { name: '消息草稿' }).fill('主动发送后完整触底\n第二行正文');
      await page.getByRole('button', { name: '发送', exact: true }).click();
      await expect(page.locator('[data-message-id="36"]')).toBeVisible();
      await bottom();
      fixture.push('37', '发送后继续跟随新消息');
      await expect(page.locator('[data-message-id="37"]')).toBeVisible();
      await bottom();
      await expect(page.getByRole('button', { name: '查看最新消息', exact: true })).toHaveCount(0);
      const last = page.locator('[data-message-id="37"]');
      const lastBounds = (await last.boundingBox())!;
      const viewportBounds = (await viewport.boundingBox())!;
      expect(lastBounds.y + lastBounds.height).toBeLessThanOrEqual(
        viewportBounds.y + viewportBounds.height + 1,
      );
      expect(sent).toBe(1);
      expect(fixture.stats()).toMatchObject({ connections: 1, historyRequests: 1 });
      expect(await viewport.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: info.outputPath('bottom.png') });
    });
