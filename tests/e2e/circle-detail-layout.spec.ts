import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { noOverflow } from './fish-circle-fixture';
import { setupDetailLayout } from './circle-detail-layout-fixture';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: detail columns, inner comments and reply form`, async ({
      page,
    }, info) => {
      if ((page.viewportSize()?.width ?? 1280) > 760)
        await page.setViewportSize({ width: 1920, height: 1080 });
      await page.addInitScript(
        ({ skin, mode }) => {
          localStorage.setItem('fish-island:skin', skin);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { skin: skin.id, mode },
      );
      const { state, feed, releaseDetail, releaseComments } = await setupDetailLayout(page);
      const mobile = (page.viewportSize()?.width ?? 1280) <= 760;
      const bell = page.getByRole('button', { name: '消息通知', exact: true });
      await bell.click();
      await page
        .getByRole('dialog', { name: '全部互动消息' })
        .getByRole('button')
        .filter({ hasText: state.target })
        .click();
      const detail = page.getByRole('region', { name: '动态详情', exact: true });
      await expect(detail.getByText('正在加载动态详情…')).toBeVisible();
      releaseDetail();
      const post = detail.getByRole('group', { name: '动态内容' });
      const comments = detail.getByRole('region', { name: '评论区', exact: true });
      const list = comments.getByRole('region', { name: '评论列表', exact: true });
      const outer = detail.getByRole('region', { name: '动态详情内容', exact: true });
      await expect(comments.getByText('正在加载评论…')).toBeVisible();
      await page.screenshot({ path: info.outputPath('comments-loading.png') });
      releaseComments();
      await expect(comments.getByRole('button', { name: '重试评论' })).toBeVisible();
      await page.screenshot({ path: info.outputPath('comments-error.png') });
      state.commentFailure = false;
      state.pages.length = 0;
      await comments.getByRole('button', { name: '重试评论' }).click();
      const target = comments.locator('[data-comment-target="true"]');
      await expect(target).toHaveAttribute('data-comment-id', '5000');
      await expect(target).toBeFocused();
      await expect(target).toBeInViewport();
      expect(state.pages).toEqual([1, 2]);
      const assertLayout = async () => {
        const left = (await post.boundingBox())!;
        const right = (await comments.boundingBox())!;
        const wide = (await detail.boundingBox())!.width >= 960;
        if (wide) {
          expect(left.x + left.width + 24).toBeLessThanOrEqual(right.x);
          expect(Math.abs(left.y - right.y)).toBeLessThan(8);
        } else expect(right.y).toBeGreaterThanOrEqual(left.y + left.height);
        expect(await list.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
          true,
        );
        expect(await list.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(
          true,
        );
        const max = Math.min(
          mobile ? 420 : 600,
          page.viewportSize()!.height * (mobile ? 0.55 : 0.65),
        );
        expect((await list.boundingBox())!.height).toBeLessThanOrEqual(max + 1);
        expect(
          await list.evaluate((element) => parseFloat(getComputedStyle(element).paddingRight)),
        ).toBe(mobile ? 20 : 24);
        await noOverflow(page);
      };
      await assertLayout();
      if (!mobile) expect(await outer.evaluate((element) => element.scrollTop)).toBe(0);
      const postY = (await post.boundingBox())!.y;
      const innerBefore = await list.evaluate((element) => element.scrollTop);
      expect(innerBefore).toBeGreaterThan(0);
      if (mobile) {
        const session = await page.context().newCDPSession(page);
        const box = (await list.boundingBox())!;
        const x = box.x + box.width / 2;
        const y = box.y + 60;
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x, y }],
        });
        for (let step = 1; step <= 5; step++)
          await session.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x, y: y + step * 40 }],
          });
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await session.detach();
        await expect(comments.locator('[data-orientation="vertical"]')).toBeHidden();
      } else {
        await list.hover();
        await page.mouse.wheel(0, -500);
        await expect(comments.locator('[data-orientation="vertical"]')).toBeVisible();
      }
      await expect
        .poll(() => list.evaluate((element) => element.scrollTop))
        .toBeLessThan(innerBefore);
      expect((await post.boundingBox())!.y).toBeCloseTo(postY, 0);
      await target.getByRole('button', { name: '回复 通知岛友', exact: true }).focus();
      await expect(target).toBeInViewport();
      await page.screenshot({ path: info.outputPath('columns-and-comments.png') });
      await target.getByRole('button', { name: '回复 通知岛友', exact: true }).click();
      const editor = comments.getByRole('textbox', { name: '评论内容' });
      await expect(editor).toBeFocused();
      await editor.fill('切换宽度后仍保留的回复草稿');
      const form = comments.locator('form');
      const cancel = form.getByRole('button', { name: '取消回复' });
      await expect(form.getByText('通知岛友', { exact: true })).toBeVisible();
      await expect(form.getByText(state.target, { exact: true })).toBeVisible();
      await expect(target).toBeInViewport();
      await expect(editor).toBeInViewport();
      await expect(form.getByRole('button', { name: '发送评论' })).toBeInViewport();
      const cancelBox = (await cancel.boundingBox())!;
      expect(cancelBox.height).toBe(mobile ? 44 : 32);
      expect(cancelBox.width).toBeLessThan(120);
      expect(
        (await form.boundingBox())!.y -
          ((await list.boundingBox())!.y + (await list.boundingBox())!.height),
      ).toBeGreaterThanOrEqual(10);
      expect(await form.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      await page.screenshot({ path: info.outputPath('reply-form.png') });
      const detailRequests = state.detailRequests;
      const commentRequests = state.commentRequests;
      if (!mobile) {
        await page.setViewportSize({ width: 1280, height: 800 });
        await assertLayout();
        await expect(editor).toHaveValue('切换宽度后仍保留的回复草稿');
        await page.setViewportSize({ width: 1024, height: 800 });
        await assertLayout();
        await expect(editor).toHaveValue('切换宽度后仍保留的回复草稿');
        await page.screenshot({ path: info.outputPath('narrow-desktop.png') });
        await page.setViewportSize({ width: 1920, height: 1080 });
      }
      expect(state.detailRequests).toBe(detailRequests);
      expect(state.commentRequests).toBe(commentRequests);
      await cancel.click();
      await expect(editor).toHaveValue('切换宽度后仍保留的回复草稿');
      await expect(cancel).toHaveCount(0);
      await target.getByRole('button', { name: '回复 通知岛友', exact: true }).click();
      await form.locator('input[type=file]').setInputFiles({
        name: 'synthetic.png',
        mimeType: 'image/png',
        buffer: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+afo0AAAAASUVORK5CYII=',
          'base64',
        ),
      });
      await expect(form.getByRole('img', { name: '评论附件 1' })).toBeVisible();
      await form.getByRole('button', { name: '移除评论附件 1' }).click();
      feed.mutationFailure = true;
      await form.getByRole('button', { name: '发送评论' }).click();
      await expect(form.getByRole('alert')).toHaveText('合成操作失败');
      await expect(editor).toHaveValue('切换宽度后仍保留的回复草稿');
      feed.mutationFailure = false;
      await form.getByRole('button', { name: '发送评论' }).click();
      await expect(comments.getByRole('status').filter({ hasText: '评论成功' })).toBeVisible();
      expect(feed.replyParent).toBe('5000');
      expect(feed.replyUser).toBe('999');
      const sent = target.locator('[data-comment-id="6000"]');
      await expect(sent.getByText('切换宽度后仍保留的回复草稿', { exact: true })).toBeVisible();
      await expect(sent.getByRole('button', { name: '置顶评论', exact: true })).toHaveCount(0);
      await target.getByRole('button', { name: '收起回复', exact: true }).click();
      await expect(sent).toHaveCount(0);
      await target.getByRole('button', { name: '查看 1 条回复', exact: true }).click();
      await expect(sent).toBeVisible();
      await expect(editor).toHaveValue('');
      await detail.getByRole('button', { name: '返回鱼小圈' }).click();
      state.detailFailure = true;
      await bell.click();
      await page
        .getByRole('dialog', { name: '全部互动消息' })
        .getByRole('button')
        .filter({ hasText: state.target })
        .click();
      await expect(detail.getByRole('alert')).toContainText('合成详情加载失败');
      state.detailFailure = false;
      state.empty = true;
      await detail.getByRole('button', { name: '重试详情' }).click();
      await expect(comments.getByText('暂无评论，来聊两句吧')).toBeVisible();
      expect((await list.boundingBox())!.height).toBeLessThan(180);
      await page.screenshot({ path: info.outputPath('comments-empty.png') });
      await noOverflow(page);
      await detail.getByRole('button', { name: '返回鱼小圈' }).click();
      await expect(bell).toBeFocused();
    });
  }
