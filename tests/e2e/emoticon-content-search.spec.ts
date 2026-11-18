import { expect, test, type Locator, type Page } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
import { scrollToEnd } from './emoticon-actions';
import { setup as setupCircle } from './fish-circle-fixture';

test.use({ serviceWorkers: 'block' });

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: chat searches saved image text`, async ({ page }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      const query = await stubSearch(page, 'https://menu.test/image.png', 25);
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      await draft.fill('保留草稿');
      const open = page.getByRole('button', { name: '表情包', exact: true });
      await press(page, open);
      const panel = page.getByRole('dialog', { name: '表情包', exact: true });
      await press(page, panel.getByRole('button', { name: '我的收藏', exact: true }));
      const tiles = panel.getByRole('button', { name: /^使用表情包 / });
      await expect(tiles).toHaveCount(1);
      const filter = panel.getByRole('textbox', { name: '搜索收藏表情包' });
      const search = panel.getByRole('button', { name: '搜索', exact: true });
      const mobile = page.viewportSize()!.width <= 760;
      await expect(search).toBeDisabled();
      await expect(filter).toHaveCSS('height', mobile ? '44px' : '32px');
      await expect(search).toHaveCSS('height', mobile ? '44px' : '32px');
      await filter.fill(' 无匹配 ');
      if (mobile) await search.tap();
      else await filter.press('Enter');
      await expect(panel.getByText('正在加载表情包…')).toBeVisible();
      await expect.poll(() => query.requests.at(-1)).toEqual(['无匹配', 1]);

      const stale = page.waitForEvent(
        'requestfailed',
        (request) =>
          request.url().endsWith('/emoticon_favour/list/page') &&
          request.postDataJSON().keyword === '无匹配',
      );
      await filter.fill('摸鱼');
      await press(page, search);
      await expect(panel.getByRole('alert')).toContainText('合成搜索失败');
      query.release();
      await stale;
      query.recover();
      await press(page, panel.getByRole('button', { name: '重试表情包' }));
      await expect(tiles).toHaveCount(24);
      const scroll = panel.getByRole('region', { name: '表情包列表' });
      await scrollToEnd(page, scroll, mobile);
      await expect(panel.getByText('已全部加载')).toBeVisible();
      await expect(tiles).toHaveCount(25);
      expect(query.requests.at(-1)).toEqual(['摸鱼', 2]);
      expect(await scroll.evaluate((el) => el.scrollWidth === el.clientWidth)).toBe(true);
      await expect(scroll.locator('..').locator('[data-orientation="vertical"]')).toHaveCSS(
        'visibility',
        mobile ? 'hidden' : 'visible',
      );
      await page.mouse.move(0, 0);
      await page.screenshot({ path: info.outputPath('chat-content-search.png') });
      await filter.fill('无匹配');
      await filter.press('Enter');
      await expect(panel.getByText('没有找到表情包，请换个关键词。')).toBeVisible();
      await press(page, panel.getByRole('button', { name: '清空搜索' }));
      await expect(filter).toBeFocused();
      await expect(tiles).toHaveCount(1);
      expect(query.requests.at(-1)).toEqual(['', 1]);
      await page.keyboard.press('Escape');
      await expect(open).toBeFocused();
      await expect(draft).toHaveText('保留草稿');
      expect(fixture.stats().connections).toBe(1);
    });

    test(`${skin.id} ${mode}: comments search and attach a saved image`, async ({ page }, info) => {
      await page.addInitScript(
        ({ id, mode }) => {
          localStorage.setItem('fish-island:skin', id);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { id: skin.id, mode },
      );
      await setupCircle(page);
      const query = await stubSearch(page, 'https://circle.test/image.png', 1);
      await page.getByRole('button', { name: '评论 0', exact: true }).click();
      const section = page.getByRole('region', { name: '评论区', exact: true });
      const editor = section.getByRole('textbox', { name: '评论内容' });
      await editor.fill('保留草稿');
      const trigger = section.getByRole('button', { name: '评论表情包', exact: true });
      await press(page, trigger);
      const panel = page.getByRole('dialog', { name: '评论表情包', exact: true });
      const filter = panel.getByRole('textbox', { name: '搜索收藏表情包' });
      const search = panel.getByRole('button', { name: '搜索', exact: true });
      const tile = panel.getByRole('button', { name: '选择表情包 1' });
      await expect(tile).toBeVisible();
      await filter.fill('无匹配');
      await filter.press('Enter');
      await expect(panel.getByText('正在加载表情包…')).toBeVisible();
      query.release();
      await expect(panel.getByText('没有找到表情包，请换个关键词。')).toBeVisible();
      query.index();
      await press(page, search);
      await expect(tile).toBeVisible();
      expect(query.requests.at(-1)).toEqual(['无匹配', 1]);
      await filter.fill('摸鱼');
      await press(page, search);
      await expect(panel.getByRole('alert')).toContainText('合成搜索失败');
      query.recover();
      await press(page, panel.getByRole('button', { name: '重试表情包' }));
      await expect(tile).toBeVisible();
      const box = (await panel.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      await page.screenshot({ path: info.outputPath('comment-content-search.png') });
      await press(page, tile);
      await expect(panel).toBeHidden();
      await expect(section.getByRole('img', { name: '评论附件 1' })).toBeVisible();
      await expect(editor).toHaveValue('保留草稿');
    });
  }

async function press(page: Page, locator: Locator) {
  if (page.viewportSize()!.width <= 760) await locator.tap();
  else await locator.click();
}

async function stubSearch(page: Page, emoticonSrc: string, count: number) {
  let fail = true;
  let indexed = false;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const requests: [string, number][] = [];
  await page.route('**/api/emoticon_favour/list/page', async (route) => {
    const { current, keyword = '' } = route.request().postDataJSON() as {
      current: number;
      keyword?: string;
    };
    requests.push([keyword, current]);
    if (keyword === '摸鱼' && fail) {
      return route.fulfill({ json: { code: 50000, message: '合成搜索失败' } });
    }
    if (keyword === '无匹配') await gate;
    const total = keyword === '摸鱼' ? count : !keyword || indexed ? 1 : 0;
    const offset = (current - 1) * 24;
    const records = Array.from({ length: Math.min(24, total - offset) }, (_, index) => ({
      id: String(offset + index + 1),
      emoticonSrc,
      ocrText: keyword || null,
    }));
    return route
      .fulfill({ json: { code: 0, data: { records, total: String(total) } } })
      .catch(() => {});
  });
  return {
    requests,
    release,
    index: () => (indexed = true),
    recover: () => (fail = false),
  };
}
