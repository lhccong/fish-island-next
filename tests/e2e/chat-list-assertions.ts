import { expect, type Page, type TestInfo } from '@playwright/test';

export async function verifyChatList(
  page: Page,
  info: TestInfo,
  state: 'loading' | 'success' | 'error' | 'empty',
) {
  const mobile = page.viewportSize()!.width <= 760;
  const trigger = page.getByRole('button', { name: '查看聊天列表', exact: true });
  if (mobile) await trigger.tap();
  const host = mobile
    ? page.getByRole('dialog', { name: '聊天列表', exact: true })
    : page.getByRole('complementary', { name: '聊天会话', exact: true });
  const list = host.getByRole('region', { name: '聊天列表', exact: true });
  await expect(list).toBeVisible();
  await expect(list.locator('[data-camouflage-dot]')).toHaveCount(0);
  await expect(list.getByRole('img', { name: '本地伪装提醒' })).toHaveCount(0);
  if (!mobile) expect((await host.boundingBox())!.width).toBe(300);
  await expect(list).not.toContainText('在线');
  if (state === 'loading') {
    await expect(list.getByRole('status')).toHaveText('正在加载列表…');
    await expect(list.getByRole('button', { name: '刷新聊天列表' })).toBeDisabled();
  }
  if (state === 'error') await expect(list.getByRole('alert')).toContainText('暂时无法加载列表');
  if (state === 'empty') await expect(list.getByRole('status')).toContainText('暂无列表内容');
  if (state === 'success') {
    await expect(list.getByRole('listitem')).toHaveCount(105);
    await expect(list.locator('[data-kind="member"]')).toHaveCount(100);
    await expect(list.locator('[data-kind="cover"]')).toHaveCount(5);
    await expect(list.locator('[data-kind="cover"]').filter({ hasText: '服务号' })).toHaveCount(1);
    await expect(list.locator('[data-kind="cover"]').filter({ hasText: '公众号' })).toHaveCount(1);
    const longPreview = list
      .locator('[data-kind="cover"]')
      .filter({ hasText: '服务号' })
      .getByTitle(/^本地工作伪装摘要/);
    await expect(longPreview).toHaveCSS('text-overflow', 'ellipsis');
    expect(await longPreview.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(
      true,
    );
    const longName = list.locator('span[title^="合成岛友50"]');
    await expect(longName).toHaveCSS('text-overflow', 'ellipsis');
    expect(await longName.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(
      true,
    );
    await expect(list).not.toContainText('暂无消息');
    await expect(list.getByTitle(/^本地工作伪装摘要/)).toHaveCount(106);
    const previews = await list
      .getByRole('listitem')
      .getByTitle(/^本地工作伪装摘要/)
      .allTextContents();
    expect(new Set(previews).size).toBeGreaterThan(1);
    const rows = await list.getByRole('listitem').evaluateAll((items) =>
      items.slice(0, 2).map((item) => {
        const box = item.getBoundingClientRect();
        const avatar = item.firstElementChild!.getBoundingClientRect();
        return { x: box.x, y: box.y, h: box.height, avatarW: avatar.width, avatarH: avatar.height };
      }),
    );
    expect(rows[0]!.x).toBe(rows[1]!.x);
    expect(rows[1]!.y - rows[0]!.y).toBeGreaterThanOrEqual(66);
    expect(rows[0]!.avatarW).toBe(40);
    expect(rows[0]!.avatarH).toBe(40);
    const search = list.getByRole('searchbox', { name: '搜索聊天' });
    await search.fill('合成岛友100');
    await expect(search).toHaveCSS('outline-style', 'none');
    await expect(search.locator('..')).toHaveCSS('outline-style', 'solid');
    await expect(list.getByRole('listitem')).toHaveCount(1);
    await search.fill('公众号');
    await expect(list.getByRole('listitem')).toHaveCount(1);
    await expect(list.getByRole('listitem').getByText('公众号', { exact: true })).toBeVisible();
    await search.fill('');
    await expect(list.getByRole('listitem')).toHaveCount(105);
    await expect(list.locator('[data-camouflage-dot]')).toHaveCount(0);
    expect(
      await list
        .getByRole('listitem')
        .getByTitle(/^本地工作伪装摘要/)
        .allTextContents(),
    ).toEqual(previews);
    const scroll = list.getByRole('region', { name: '聊天列表滚动区' });
    await scroll.hover();
    expect(await scroll.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
    const gutter = await scroll.evaluate(
      (element) =>
        element.getBoundingClientRect().right -
        element.querySelector('ul time')!.getBoundingClientRect().right,
    );
    expect(gutter).toBeGreaterThanOrEqual(mobile ? 20 : 24);
    await scroll.evaluate((element) => {
      element.scrollTop = element.scrollHeight / 2;
    });
    await scroll.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(list.getByRole('listitem').last()).toBeVisible();
    await scroll.evaluate((element) => {
      element.scrollTop = 0;
    });
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (mobile) {
    const bounds = await host.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  }
  await page.screenshot({ path: info.outputPath(`chat-list-${state}.png`) });
  if (mobile) {
    await page.keyboard.press('Escape');
    await expect(host).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
}
