import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setup, noOverflow, post } from './fish-circle-fixture';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: cover tools and interaction notifications`, async ({
      page,
    }, info) => {
      test.setTimeout(60000);
      await page.addInitScript(
        ({ skinId, colorMode }) => {
          localStorage.setItem('fish-island:skin', skinId);
          localStorage.setItem('fish-island:color-mode', colorMode);
        },
        { skinId: skin.id, colorMode: mode },
      );
      const feed = await setup(page, false, { visual: true });
      let status = 'ready';
      let delay = 300;
      let read = false;
      let deleted = false;
      let mutationFail = false;
      let requests = 0;
      let current = 1;
      await page.route('**/api/event_remind/**', async (route) => {
        requests++;
        const path = new URL(route.request().url()).pathname;
        if (path.endsWith('/count'))
          return route.fulfill({ json: { code: 0, data: read || deleted ? 0 : 11 } });
        const body = route.request().postDataJSON();
        expect(route.request().headers()['test-session']).toBe('synthetic-value');
        if (path.endsWith('/page')) {
          current = body.current;
          await new Promise((resolve) => setTimeout(resolve, delay));
          if (status === 'error') return route.fulfill({ status: 503, json: {} });
          return route.fulfill({
            json: {
              code: 0,
              data: {
                total: deleted || status === 'empty' ? 0 : 11,
                records:
                  deleted || status === 'empty'
                    ? []
                    : [
                        {
                          id: current === 1 ? '801' : '802',
                          senderUser: {
                            userName: '通知测试岛友',
                            userAvatar: 'https://circle.test/avatar.svg',
                          },
                          action: 'comment',
                          sourceContent:
                            '来看看新的海边照片 [img]https://circle.test/post.svg[/img]',
                          sourceType: 4,
                          sourceId: '1001',
                          state: read ? 1 : 0,
                          createTime: '2026-11-12 08:00:00',
                        },
                      ],
              },
            },
          });
        }
        if (mutationFail) return route.fulfill({ json: { code: 40000, message: '通知操作失败' } });
        if (path.endsWith('/batch/delete') || path.endsWith('/batch/read'))
          expect(body.ids.length).toBeGreaterThan(0);
        if (path.endsWith('/read')) read = true;
        if (path.endsWith('/delete')) deleted = true;
        return route.fulfill({ json: { code: 0, data: true } });
      });
      await page.route('**/api/moments/detail?*', (r) =>
        r.fulfill({ json: { code: 0, data: post } }),
      );
      const cover = page.getByRole('region', { name: '鱼小圈封面', exact: true });
      for (const name of ['全部动态', '我的鱼小圈', '刷新动态', '消息通知', '发布动态']) {
        await expect(cover.getByRole('button', { name, exact: true })).toBeVisible();
        const box = await cover.getByRole('button', { name, exact: true }).boundingBox();
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
      await cover.getByRole('button', { name: '消息通知', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: '全部互动消息', exact: true });
      await dialog.getByRole('button', { name: '更多通知操作' }).click();
      await page.getByRole('menuitem', { name: '刷新消息通知', exact: true }).click();
      await expect(
        dialog.getByRole('status').filter({ hasText: '正在加载消息通知' }),
      ).toBeVisible();
      await expect(dialog.getByText('通知测试岛友', { exact: true }).first()).toBeVisible();
      delay = 0;
      await noOverflow(page);
      await page.screenshot({ path: info.outputPath('notifications-ready.png') });
      await dialog.locator('[data-scroll-pagination="通知"]').scrollIntoViewIfNeeded();
      await expect(dialog.locator('[data-scroll-pagination="通知"]')).toContainText('已全部加载');
      await expect(dialog.getByText('通知测试岛友', { exact: true }).first()).toBeVisible();
      expect(current).toBeGreaterThanOrEqual(2);
      mutationFail = true;
      await dialog.getByRole('button', { name: '更多通知操作' }).click();
      await page.getByRole('menuitem', { name: '全部已读', exact: true }).click();
      await expect(dialog.getByRole('alert')).toHaveText('通知操作失败');
      mutationFail = false;
      await dialog.getByRole('button', { name: '更多通知操作' }).click();
      await page.getByRole('menuitem', { name: '全部已读', exact: true }).click();
      await expect(dialog.getByText('全部消息已标为已读', { exact: true })).toBeVisible();
      expect(read).toBe(true);
      await dialog.getByRole('button').filter({ hasText: '通知测试岛友' }).first().click();
      const detail = page.getByRole('region', { name: '动态详情', exact: true });
      await expect(detail.getByText(post.content, { exact: true })).toBeVisible();
      await detail.getByRole('button', { name: '返回鱼小圈' }).click();
      await cover.getByRole('button', { name: '消息通知', exact: true }).click();
      await dialog.getByRole('button', { name: '更多通知操作' }).click();
      await page.getByRole('menuitem', { name: '管理', exact: true }).click();
      await dialog.getByRole('checkbox', { name: '选择通知 801' }).check();
      await dialog.getByRole('button', { name: '确认删除', exact: true }).click();
      await expect(dialog.getByText('暂无互动消息', { exact: true })).toBeVisible();
      expect(deleted).toBe(true);
      status = 'error';
      await dialog.getByRole('button', { name: '更多通知操作' }).click();
      await page.getByRole('menuitem', { name: '刷新消息通知', exact: true }).click();
      await expect(dialog.getByRole('button', { name: '重试通知', exact: true })).toBeVisible();
      await page.screenshot({ path: info.outputPath('notifications-error.png') });
      status = 'empty';
      await dialog.getByRole('button', { name: '重试通知', exact: true }).click();
      await expect(dialog.getByText('暂无互动消息', { exact: true })).toBeVisible();
      await page.screenshot({ path: info.outputPath('notifications-empty.png') });
      await dialog.getByRole('button', { name: '关闭消息通知' }).click();
      await expect(cover.getByRole('button', { name: '消息通知', exact: true })).toBeFocused();
      await cover.getByRole('button', { name: '发布动态', exact: true }).click();
      const editor = page.getByRole('dialog', { name: '发布朋友圈', exact: true });
      await expect(editor).toBeVisible();
      await expect(editor.getByRole('button', { name: '发布', exact: true })).toBeDisabled();
      await expect(editor.getByRole('textbox', { name: '动态内容' })).toHaveAttribute(
        'placeholder',
        '分享新鲜事...',
      );
      await page.screenshot({ path: info.outputPath('editor-empty.png') });
      await editor.getByRole('textbox', { name: '动态内容' }).fill('新版发布弹窗测试');
      await editor.locator('input[type=file]').setInputFiles({
        name: 'synthetic.png',
        mimeType: 'image/png',
        buffer: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+afo0AAAAASUVORK5CYII=',
          'base64',
        ),
      });
      await expect(editor.getByRole('img', { name: '待发布图片 1' })).toBeVisible();
      await editor.getByRole('textbox', { name: '位置' }).fill('海边');
      await page.screenshot({ path: info.outputPath('editor-ready.png') });
      await editor.getByRole('button', { name: '移除附件 1' }).click();
      await expect(editor.getByRole('img')).toHaveCount(0);
      feed.mutationFailure = true;
      await editor.getByRole('button', { name: '发布', exact: true }).click();
      await expect(editor.getByRole('alert')).toHaveText('合成操作失败');
      await expect(editor.getByRole('textbox', { name: '动态内容' })).toHaveValue(
        '新版发布弹窗测试',
      );
      await page.screenshot({ path: info.outputPath('editor-error.png') });
      feed.mutationFailure = false;
      await editor.getByRole('button', { name: '发布', exact: true }).click();
      await expect(editor).toBeHidden();
      expect(feed.published).toBe(true);
      await cover.getByRole('button', { name: '发布动态', exact: true }).click();
      await page.keyboard.press('Escape');
      await cover.getByRole('button', { name: '我的鱼小圈', exact: true }).click();
      await expect(cover.getByRole('button', { name: '我的鱼小圈', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await cover.getByRole('button', { name: '返回全部动态' }).click();
      await expect(cover.getByRole('button', { name: '全部动态', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      feed.delay = 400;
      await cover.getByRole('button', { name: '刷新动态', exact: true }).click();
      await expect(page.getByRole('status').filter({ hasText: '正在加载鱼小圈' })).toBeVisible();
      await expect(page.getByRole('article').first()).toBeVisible();
      feed.delay = 0;
      feed.fail = true;
      await cover.getByRole('button', { name: '刷新动态', exact: true }).click();
      await expect(page.getByRole('button', { name: '重试动态', exact: true })).toBeVisible();
      feed.fail = false;
      feed.empty = true;
      await cover.getByRole('button', { name: '刷新动态', exact: true }).click();
      await expect(page.getByText('还没有动态，分享第一条摸鱼日常吧')).toBeVisible();
      await noOverflow(page);
      expect(requests).toBeGreaterThan(0);
    });
  }
