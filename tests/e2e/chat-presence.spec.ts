import { expect, test, type WebSocketRoute } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { frameFixture } from './avatar-frames-fixture';

test.setTimeout(120_000);

for (const width of [1280, 375, 390])
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, hasTouch: width <= 760, isMobile: width <= 760 });
    for (const skin of builtinSkins)
      for (const mode of ['light', 'dark'])
        test(`${skin.id} ${mode}: online presence lifecycle`, async ({ page }, info) => {
          await frameFixture(page, skin.id, mode);
          let socket!: WebSocketRoute;
          let connections = 0;
          await page.routeWebSocket(/\/ws\//, (ws) => {
            socket = ws;
            connections++;
            ws.onMessage(() => {});
          });
          let requests = 0;
          let phase = 'loading';
          let release!: () => void;
          const gate = new Promise<void>((resolve) => {
            release = resolve;
          });
          await page.route('**/api/chat/online/user', async (route) => {
            requests++;
            if (phase === 'loading') await gate;
            await route.fulfill({
              status: phase === 'error' ? 503 : 200,
              json: { code: 0, data: [] },
            });
          });
          const panel = page.getByRole('complementary', { name: '在线成员', exact: true });
          const trigger = page.getByRole('button', { name: '群聊详情', exact: true });
          const tap = async (locator: ReturnType<typeof page.getByRole>) => {
            if (width <= 760) await locator.tap();
            else await locator.click();
          };
          const noOverflow = async () => {
            expect(
              await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            ).toBe(true);
            expect(await panel.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
          };
          const send = (type: string, data: unknown) => socket.send(JSON.stringify({ type, data }));
          const members = Array.from({ length: 36 }, (_, i) => ({
            id: `presence-${i}`,
            name: `合成在线成员${i}`,
            level: 1,
          }));
          try {
            await page.goto('/chat');
            const draft = page.getByRole('textbox', { name: '消息草稿', exact: true });
            await draft.fill('合成实时名单草稿');
            await expect.poll(() => connections).toBe(1);
            await tap(trigger);
            await expect(panel.getByRole('status')).toHaveText('正在获取在线成员…');
            await noOverflow();
            await page.screenshot({ path: info.outputPath('loading.png') });
            phase = 'error';
            release();
            await expect(panel.getByRole('alert')).toContainText('在线成员加载失败');
            await noOverflow();
            await page.screenshot({ path: info.outputPath('error.png') });
            phase = 'empty';
            await tap(panel.getByRole('button', { name: '重试', exact: true }));
            await expect(panel.getByRole('status')).toContainText('暂无在线成员');
            await noOverflow();
            await page.screenshot({ path: info.outputPath('empty.png') });
            send('userOnline', []);
            send('userOnline', members);
            send('userOnline', members);
            await expect(panel.getByRole('heading', { name: '在线成员（36）' })).toBeVisible();
            await tap(panel.getByRole('button', { name: '查看更多', exact: true }));
            await expect(panel.getByRole('listitem')).toHaveCount(36);
            const scroll = panel.getByRole('region', { name: '全部在线成员', exact: true });
            await scroll.hover();
            const track = scroll.locator('..').locator(':scope > [data-orientation="vertical"]');
            await expect(track).toHaveCSS('visibility', width <= 760 ? 'hidden' : 'visible');
            if (width <= 760) {
              const session = await page.context().newCDPSession(page);
              const bounds = (await scroll.boundingBox())!;
              const x = bounds.x + bounds.width / 2;
              const y = bounds.y + bounds.height - 12;
              await session.send('Input.dispatchTouchEvent', {
                type: 'touchStart',
                touchPoints: [{ x, y }],
              });
              // A slow swipe with a held release checks touch scrolling without a native fling.
              for (let step = 1; step <= 5; step++) {
                await session.send('Input.dispatchTouchEvent', {
                  type: 'touchMove',
                  touchPoints: [{ x, y: y - step * 25 }],
                });
                await page.waitForTimeout(60);
              }
              await page.waitForTimeout(200);
              await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
              await session.detach();
            } else await page.mouse.wheel(0, 180);
            await expect.poll(() => scroll.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
            let previousTop = -1;
            let stableSamples = 0;
            await expect
              .poll(
                async () => {
                  const top = await scroll.evaluate((e) => e.scrollTop);
                  stableSamples = top === previousTop ? stableSamples + 1 : 0;
                  previousTop = top;
                  return stableSamples;
                },
                { intervals: [100] },
              )
              .toBeGreaterThanOrEqual(3);
            await scroll.evaluate((e) => {
              e.scrollTop = e.scrollHeight;
            });
            await expect(panel.getByRole('listitem').last()).toBeInViewport();
            await scroll.evaluate((e) => {
              e.scrollTop = 80;
            });
            const position = await scroll.evaluate((e) => e.scrollTop);
            send('userOnline', [{ id: 'new', name: '合成新上线成员', level: 1 }]);
            await expect(panel.getByRole('listitem')).toHaveCount(37);
            expect(await scroll.evaluate((e) => e.scrollTop)).toBe(position);
            send('userOffline', 'new');
            send('userOffline', 'new');
            await expect(panel.getByRole('listitem')).toHaveCount(36);
            send('userOnline', [{ ...members[0], name: '合成更新昵称', level: 7 }]);
            await expect(panel.getByRole('listitem')).toHaveCount(36);
            await scroll.evaluate((e) => {
              e.scrollTop = 0;
            });
            await expect(panel.getByText('合成更新昵称', { exact: true })).toBeVisible();
            await noOverflow();
            await page.screenshot({ path: info.outputPath('success.png') });
            await tap(panel.getByRole('button', { name: '关闭在线列表', exact: true }));
            await expect(trigger).toBeFocused();
            send('userOffline', members[0]!.id);
            await tap(trigger);
            await expect(panel.getByRole('heading', { name: '在线成员（35）' })).toBeVisible();
            await tap(panel.getByRole('button', { name: '关闭在线列表', exact: true }));
            if (skin.id === 'moyu-island' && width > 760) {
              const classic = page.getByRole('complementary', {
                name: '经典在线成员',
                exact: true,
              });
              await expect(classic.getByRole('heading')).toHaveText('在线成员 (35)');
              await expect(classic.getByText('合成更新昵称', { exact: true })).toHaveCount(0);
              await page.screenshot({ path: info.outputPath('classic-success.png') });
            }
            socket.close({ code: 1011, reason: 'synthetic reconnect' });
            await expect.poll(() => connections).toBe(2);
            send('userOnline', [{ id: 'reconnected', name: '合成重连成员', level: 2 }]);
            await tap(trigger);
            await expect(panel.getByRole('heading', { name: '在线成员（1）' })).toBeVisible();
            await expect(panel.getByText('合成重连成员', { exact: true })).toBeVisible();
            await expect(panel.getByRole('listitem')).toHaveCount(1);
            await tap(panel.getByRole('button', { name: '关闭在线列表', exact: true }));
            await expect(draft).toHaveText('合成实时名单草稿');
            await draft.fill('@合成重连');
            const mentions = page.getByRole('region', { name: '提及在线成员', exact: true });
            await expect(mentions.getByRole('option')).toHaveText(['合成重连成员']);
            send('userOffline', 'reconnected');
            await expect(mentions).toContainText('暂无在线成员');
            send('userOnline', [{ id: 'reconnected', name: '合成重连成员', level: 2 }]);
            await expect(mentions.getByRole('option')).toHaveText(['合成重连成员']);
            await draft.press('Escape');
            await draft.fill('合成实时名单草稿');
            if (width <= 760 || skin.id === 'wps') {
              const listTrigger = page.getByRole('button', { name: '查看聊天列表', exact: true });
              await tap(listTrigger);
              const list = page.getByRole('dialog', { name: '聊天列表', exact: true });
              const contact = list.getByRole('button', {
                name: '查看合成重连成员的用户卡片',
                exact: true,
              });
              await expect(contact).toBeVisible();
              send('userOffline', 'reconnected');
              await expect(contact).toHaveCount(0);
              send('userOnline', [{ id: 'reconnected', name: '合成重连成员', level: 2 }]);
              await expect(contact).toBeVisible();
              await tap(list.getByRole('button', { name: '关闭聊天列表', exact: true }));
              await expect(listTrigger).toBeFocused();
            }
            if (width > 760) {
              await page.getByRole('button', { name: '切换主题', exact: true }).click();
              const picker = page.getByRole('dialog', { name: '主题模式' });
              await picker
                .getByRole('button', {
                  name: mode === 'light' ? '暗夜模式' : '明亮模式',
                  exact: true,
                })
                .click();
              await picker
                .getByRole('button', {
                  name: skin.id === 'wps' ? '微信绿' : 'WPS 表格',
                  exact: true,
                })
                .click();
              send('userOffline', 'reconnected');
              send('userOnline', [{ id: 'theme', name: '合成换肤期间上线', level: 2 }]);
              await picker.getByRole('button', { name: skin.name, exact: true }).click();
              await picker
                .getByRole('button', {
                  name: mode === 'light' ? '明亮模式' : '暗夜模式',
                  exact: true,
                })
                .click();
              await picker.getByRole('button', { name: '关闭', exact: true }).click();
              await expect(draft).toHaveText('合成实时名单草稿');
              await tap(trigger);
              await expect(panel.getByRole('heading', { name: '在线成员（1）' })).toBeVisible();
              await expect(panel.getByText('合成换肤期间上线', { exact: true })).toBeVisible();
              await panel.getByRole('button', { name: '关闭在线列表', exact: true }).click();
            }
            expect(requests).toBe(2);
            expect(connections).toBe(2);
          } finally {
            release();
          }
        });
  });
