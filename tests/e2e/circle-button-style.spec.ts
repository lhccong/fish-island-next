import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setup, noOverflow } from './fish-circle-fixture';
import { checkProfileButtons } from './profile-button-style';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: compact themed publisher and edit actions`, async ({
      page,
    }, info) => {
      await page.addInitScript(
        ({ id, mode }) => {
          localStorage.setItem('fish-island:skin', id);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { id: skin.id, mode },
      );
      await setup(page);
      const publish = page.getByRole('button', { name: '发布动态', exact: true });
      await publish.click();
      const editor = page.getByRole('dialog', { name: '发布朋友圈', exact: true });
      await expect(editor.getByRole('button', { name: '发布', exact: true })).toBeDisabled();
      await editor.getByRole('textbox', { name: '动态内容', exact: true }).fill('合成按钮样式验证');
      await checkProfileButtons(page, '发布');
      await noOverflow(page);
      await page.screenshot({ path: info.outputPath('publisher-buttons.png') });
      await editor.getByRole('button', { name: '取消', exact: true }).click();
      await expect(editor).toHaveCount(0);
      await expect(publish).toBeFocused();
      await page.getByRole('button', { name: '更多动态操作', exact: true }).first().click();
      await page.getByRole('menuitem', { name: '修改', exact: true }).click();
      const edit = page.getByRole('dialog', { name: '编辑动态', exact: true });
      await expect(edit).toBeVisible();
      await checkProfileButtons(page);
      await noOverflow(page);
      await page.screenshot({ path: info.outputPath('edit-buttons.png') });
      await edit.getByRole('button', { name: '取消', exact: true }).click();
      await expect(edit).toHaveCount(0);
    });
  }
