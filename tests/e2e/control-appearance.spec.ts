import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setup, noOverflow } from './fish-circle-fixture';

test.setTimeout(60_000);

for (const skin of builtinSkins) {
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: comment upload control and lifecycle`, async ({ page }, info) => {
      await page.addInitScript(
        ({ id, mode }) => {
          localStorage.setItem('fish-island:skin', id);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { id: skin.id, mode },
      );
      const state = await setup(page);
      let fail = true;
      let hold = false;
      let release: (() => void) | undefined;
      let uploaded = 0;
      const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+afo0AAAAASUVORK5CYII=',
        'base64',
      );
      await page.route('https://circle.test/image.png?*', (route) =>
        route.fulfill({ contentType: 'image/png', body: png }),
      );
      await page.route('**/api/file/minio/upload?biz=user_post', async (route) => {
        if (hold)
          await new Promise<void>((resolve) => {
            release = resolve;
          });
        await route.fulfill({
          json: fail
            ? { code: 40000, message: '合成图片上传失败' }
            : { code: 0, data: `https://circle.test/image.png?image=${++uploaded}` },
        });
      });
      await page.getByRole('button', { name: '评论 0', exact: true }).click();
      const upload = page.getByRole('button', { name: '添加评论图片', exact: true });
      const input = page.getByLabel('评论图片', { exact: true });
      await expect(input).toBeHidden();
      await expect(upload).toBeVisible();
      expect((await upload.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await expect(page.getByText('0/3 张图片', { exact: true })).toBeVisible();
      const file = { name: 'synthetic.png', mimeType: 'image/png', buffer: png };
      const chooserPromise = page.waitForEvent('filechooser');
      await upload.click();
      await (await chooserPromise).setFiles(file);
      await expect(page.getByRole('alert')).toContainText('合成图片上传失败');
      await expect(upload).toBeEnabled();
      fail = false;
      hold = true;
      await input.setInputFiles(file);
      await expect(page.getByRole('status')).toContainText('正在上传评论图片');
      await expect(upload).toBeDisabled();
      await expect.poll(() => Boolean(release)).toBe(true);
      release!();
      hold = false;
      await expect(page.getByAltText('评论附件 1', { exact: true })).toBeVisible();
      await expect(page.getByText('1/3 张图片', { exact: true })).toBeVisible();
      for (let count = 2; count <= 3; count++) {
        await input.setInputFiles(file);
        await expect(page.getByText(`${count}/3 张图片`, { exact: true })).toBeVisible();
      }
      await expect(upload).toBeDisabled();
      await page.getByRole('button', { name: '移除评论附件 3', exact: true }).click();
      await expect(upload).toBeEnabled();
      await page.getByRole('textbox', { name: '评论内容' }).fill('合成的图片评论');
      await noOverflow(page);
      await page.screenshot({ path: info.outputPath('comment-upload.png') });
      state.mutationFailure = true;
      await page.getByRole('button', { name: '发送评论', exact: true }).click();
      await expect(page.getByRole('alert')).toContainText('合成操作失败');
      await expect(page.getByRole('textbox', { name: '评论内容' })).toHaveValue('合成的图片评论');
      await expect(page.getByText('2/3 张图片', { exact: true })).toBeVisible();
      state.mutationFailure = false;
      await page.getByRole('button', { name: '发送评论', exact: true }).click();
      await expect(page.getByText('0/3 张图片', { exact: true })).toBeVisible();
      await expect(page.getByRole('textbox', { name: '评论内容' })).toHaveValue('');
      expect(state.comment).toContain('合成的图片评论');
      await noOverflow(page);
    });
  }
}

for (const mode of ['light', 'dark']) {
  test(`wps ${mode}: select panels, long lists, keys and filtering`, async ({ page }, info) => {
    await page.addInitScript((mode) => {
      localStorage.setItem('fish-island:skin', 'wps');
      localStorage.setItem('fish-island:color-mode', mode);
    }, mode);
    await page.route('**/api/hot/list', (route) =>
      route.fulfill({
        json: {
          code: 0,
          data: Array.from({ length: 30 }, (_, i) => ({
            id: String(i),
            name: `合成来源 ${i + 1}`,
            categoryName: i % 2 ? '社交平台' : '综合资讯',
            data: [{ title: `合成榜单条目 ${i + 1}` }],
          })),
        },
      }),
    );
    await page.goto('/');
    const source = page.getByRole('combobox', { name: '筛选热榜来源' });
    const category = page.getByRole('combobox', { name: '筛选热榜分类' });
    await page.getByRole('searchbox', { name: '查找热榜' }).fill('合成');
    await source.click();
    const list = page.getByRole('listbox', { name: '筛选热榜来源' });
    await expect(list).toBeVisible();
    const bounds = (await list.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    await page.screenshot({ path: info.outputPath('source-options.png') });
    await page.keyboard.press('End');
    await expect(page.getByRole('option', { name: '合成来源 30', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(source).toHaveText('合成来源 30');
    await expect(source).toBeFocused();
    await expect(page.getByRole('searchbox', { name: '查找热榜' })).toHaveValue('合成');
    await expect(page.getByRole('table')).toContainText('合成榜单条目 30');
    await expect(page.getByRole('table').getByRole('row')).toHaveCount(2);
    await source.press('ArrowDown');
    await page.keyboard.press('Escape');
    await expect(list).toHaveCount(0);
    await expect(source).toBeFocused();
    await source.click();
    await page.keyboard.press('Home');
    await expect(page.getByRole('option', { name: '全部来源', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await category.click();
    await page.getByRole('option', { name: '社交平台', exact: true }).click();
    await expect(page.getByRole('table').getByRole('row')).toHaveCount(16);
    await category.click();
    await page.keyboard.press('Escape');
    await expect(category).toBeFocused();
    await noOverflow(page);
  });
}
