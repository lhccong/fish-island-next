import { test, expect } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

test.setTimeout(60000);

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: avatar mention, incoming alert and quote navigation`, async ({
      page,
    }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      const act = async (locator: ReturnType<typeof page.getByRole>) => {
        if (page.viewportSize()!.width <= 760) await locator.tap();
        else await locator.click();
      };
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      const expectDraft = (text: string) =>
        expect
          .poll(() =>
            draft.evaluate((element) =>
              element instanceof HTMLTextAreaElement ? element.value : element.textContent,
            ),
          )
          .toBe(text);
      fixture.push('1', '需要定位的原文');
      const original = page.locator('[data-message-id="1"]');
      await expect(original).toBeVisible();
      await draft.fill('保留草稿');
      await act(original.getByRole('button', { name: '@合成岛友', exact: true }));
      await expectDraft('保留草稿 @合成岛友 ');
      await expect(draft).toBeFocused();
      for (let i = 2; i <= 40; i++) fixture.push(String(i), `合成消息 ${i}`);
      fixture.push('41', '@本人合成 请查看');
      const notice = page.getByRole('button', { name: '有 1 条消息 @我，点击查看', exact: true });
      await expect(notice).toBeVisible();
      await expect(notice.locator('svg')).toHaveCount(1);
      const noticeBox = (await notice.boundingBox())!;
      const scrollBox = (await page
        .getByRole('region', { name: '群聊消息区', exact: true })
        .boundingBox())!;
      const composerBox = (await page
        .getByRole('region', { name: '群聊输入区', exact: true })
        .boundingBox())!;
      expect(noticeBox.y).toBeGreaterThanOrEqual(scrollBox.y + scrollBox.height - 1);
      expect(noticeBox.y + noticeBox.height).toBeLessThanOrEqual(composerBox.y + 1);
      if (page.viewportSize()!.width <= 760) expect(noticeBox.height).toBeGreaterThanOrEqual(44);
      expect(await notice.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
        'rgba(0, 0, 0, 0)',
      );
      await page.screenshot({ path: info.outputPath('mention-footer.png') });
      await act(notice);
      const mentioned = page.locator('[data-message-id="41"]');
      await expect(mentioned).toHaveAttribute('data-located', 'true');
      await expect(mentioned).toBeVisible();
      const bubble = mentioned.getByRole('group');
      await expect.poll(() => bubble.evaluate((element) => element.getAnimations().length)).toBe(1);
      expect(await mentioned.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
        'rgba(0, 0, 0, 0)',
      );
      expect(
        await bubble.evaluate(
          (element) => element.getAnimations()[0]?.effect?.getTiming().iterations,
        ),
      ).toBe(3);
      await expect.poll(() => bubble.evaluate((element) => element.getAnimations().length)).toBe(0);
      expect(await bubble.evaluate((element) => getComputedStyle(element).boxShadow)).toBe('none');
      expect(await bubble.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe(
        'none',
      );
      await expect(notice).toHaveCount(0);
      fixture.push('41', '@本人合成 请查看');
      await expect(notice).toHaveCount(0);
      fixture.broadcast({
        id: '42',
        content: '引用回复',
        timestamp: 1794441600042,
        sender: { id: '456', name: '合成岛友' },
        quotedMessage: {
          id: '1',
          content: '需要定位的原文',
          sender: { id: '456', name: '合成岛友' },
        },
      });
      const latest = page.getByRole('button', { name: '查看最新消息', exact: true });
      if (await latest.isVisible()) await act(latest);
      const quote = page.getByRole('button', { name: '定位原文：合成岛友', exact: true });
      await expect(quote).toBeVisible();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await act(quote);
      await expect(original).toBeVisible();
      await expect(original).toHaveAttribute('data-located', 'true');
      const originalBubble = original.getByRole('group');
      await expect
        .poll(() => originalBubble.evaluate((element) => element.getAnimations().length))
        .toBe(1);
      expect(
        await originalBubble.evaluate(
          (element) => element.getAnimations()[0]?.effect?.getTiming().iterations,
        ),
      ).toBe(1);
      await expect
        .poll(() => originalBubble.evaluate((element) => element.getAnimations().length))
        .toBe(0);
      expect(await original.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
        'rgba(0, 0, 0, 0)',
      );
      expect(await originalBubble.evaluate((element) => getComputedStyle(element).boxShadow)).toBe(
        'none',
      );
      await page.getByRole('button', { name: '查看最新消息', exact: true }).click();
      await expect(quote).toBeVisible();
      if (page.viewportSize()!.width > 760) await quote.click({ button: 'right' });
      else {
        const touch = await page.context().newCDPSession(page);
        const box = (await quote.boundingBox())!;
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
        });
        await expect(page.getByRole('menu', { name: '引用消息操作', exact: true })).toBeVisible();
        await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
        await touch.detach();
      }
      const menu = page.getByRole('menu');
      await expect(menu.getByRole('menuitem', { name: '定位原文', exact: true })).toBeVisible();
      const bounds = (await menu.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      await page.keyboard.press('Escape');
      await expect(menu).toHaveCount(0);
      await expect(quote).toBeFocused();
      await quote.press('Shift+F10');
      await page.screenshot({ path: info.outputPath('quote-menu.png') });
      await act(menu.getByRole('menuitem', { name: '定位原文', exact: true }));
      await expect(original).toBeVisible();
      await expect(original).toHaveAttribute('data-located', 'true');
      await expectDraft('保留草稿 @合成岛友 ');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const scroll = page.getByRole('region', { name: '群聊消息区', exact: true });
      expect(await scroll.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      expect(fixture.stats()).toMatchObject({ connections: 1, historyRequests: 1 });
    });
  }

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: locating history loading, failure, retry and missing original`, async ({
      page,
    }) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      let requests = 0;
      await page.route('**/api/chat/message/page/vo', async (route) => {
        requests++;
        if (requests === 1) {
          await gate;
          await route.fulfill({ status: 503 });
        } else await route.fulfill({ json: { code: 0, data: { records: [] } } });
      });
      await page.reload();
      await expect(page.getByText('正在加载历史消息…', { exact: true })).toBeVisible();
      fixture.broadcast({
        id: '9',
        content: '合成引用回复',
        timestamp: 1794441600009,
        sender: { id: '456', name: '合成岛友' },
        quotedMessage: {
          id: 'missing',
          content: '窗口外原文',
          sender: { id: '456', name: '合成岛友' },
        },
      });
      const quote = page.getByRole('button', { name: '定位原文：合成岛友', exact: true });
      await expect(quote).toBeVisible();
      await quote.click();
      await expect(page.getByText('正在定位消息…', { exact: true })).toBeVisible();
      release();
      await expect(page.getByText('历史消息加载失败，请重试定位', { exact: true })).toBeVisible();
      expect(requests).toBe(1);
      await quote.click();
      await expect(
        page.getByText('未找到原文，消息可能已删除或超出当前历史窗口（1000条）', { exact: true }),
      ).toBeVisible();
      expect(requests).toBe(2);
      await expect(quote).toBeVisible();
      const region = page.getByRole('region', { name: '群聊消息区', exact: true });
      expect(await region.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  }
