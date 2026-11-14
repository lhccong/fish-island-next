import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import {
  undercoverFixture,
  selectValue,
  assertUndercoverLayout,
  changeAppearance,
  closeUndercoverFixture,
} from './undercover-fixture';
test.use({ hasTouch: true });
test.afterEach(async ({ page }) => {
  await closeUndercoverFixture(page);
});
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width} 同屏与联机完整流程`, async ({ page }, info) => {
        test.setTimeout(120000);
        await page.setViewportSize({ width, height: 900 });
        await page.addInitScript(
          ({ skin, mode }) => {
            localStorage.setItem('fish-island:skin', skin);
            localStorage.setItem('fish-island:color-mode', mode);
          },
          { skin: skin.id, mode },
        );
        const fixture = await undercoverFixture(page);
        await page.goto('/game/draw');
        await expect(page).toHaveURL('/game/undercover');
        await selectValue(page, '玩家人数', '3 人');
        await selectValue(page, '词语来源', '自定义词对');
        await page.getByRole('textbox', { name: '平民词', exact: true }).fill('苹果');
        await page.getByRole('textbox', { name: '卧底词', exact: true }).fill('橙子');
        await assertUndercoverLayout(page, width);
        await page.getByRole('button', { name: '开始发牌' }).click();
        let spy = '';
        for (let i = 1; i <= 3; i++) {
          const button = page.getByRole('button', { name: `我是玩家${i}，查看词语`, exact: true });
          if (width < 760) await button.tap();
          else await button.click();
          const word = await page
            .locator('strong')
            .filter({ hasText: /^(苹果|橙子)$/ })
            .innerText();
          if (word === '橙子') spy = String(i);
          await expect(page.getByText('你的身份：卧底', { exact: true })).toHaveCount(0);
          await page.getByRole('button', { name: '记住了，隐藏并继续' }).click();
        }
        for (let i = 1; i <= 3; i++) {
          await page.getByRole('button', { name: `我是玩家${i}，开始发言` }).click();
          await page.getByRole('textbox', { name: '描述你的词语' }).fill(`第${i}个合成描述`);
          await page.getByRole('button', { name: '发言结束' }).click();
        }
        for (let i = 1; i <= 3; i++) {
          await page.getByRole('button', { name: `我是玩家${i}，开始投票` }).click();
          await selectValue(
            page,
            '投票给谁',
            `玩家${String(i) === spy ? (spy === '1' ? '2' : '1') : spy}`,
          );
          await page.getByRole('button', { name: '确认投票并交接' }).click();
        }
        await expect(page.getByRole('heading', { name: '平民获胜', exact: true })).toBeVisible();
        await page.getByRole('button', { name: '再来一局' }).click();
        await fixture.login();
        fixture.state.delay = 300;
        await page.getByRole('button', { name: '联机房间', exact: true }).click();
        await expect(page.getByRole('status').filter({ hasText: '正在同步房间' })).toBeVisible();
        await expect(page.getByRole('heading', { name: '还没有房间' })).toBeVisible();
        fixture.state.delay = 0;
        fixture.state.fail = true;
        await page.getByRole('button', { name: '刷新房间' }).click();
        await expect(page.getByRole('alert')).toContainText('HTTP 503');
        fixture.state.fail = false;
        await page.getByRole('button', { name: '重试同步' }).click();
        await page.getByRole('button', { name: '创建房间', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: '创建联机房间' });
        await selectValue(page, '游戏模式', '卧底猜词模式');
        await dialog.getByRole('combobox', { name: '房间人数上限' }).click();
        await page.keyboard.press('End');
        await page.keyboard.press('Enter');
        await expect(dialog.getByRole('combobox', { name: '房间人数上限' })).toBeFocused();
        fixture.state.actionFail = true;
        await dialog.getByRole('button', { name: '创建房间', exact: true }).click();
        await expect(dialog.getByRole('alert')).toContainText('合成操作失败');
        fixture.state.actionFail = false;
        await dialog.getByRole('button', { name: '创建房间', exact: true }).click();
        await expect(dialog).toHaveCount(0);
        await page.getByRole('button', { name: '开始游戏', exact: true }).click();
        await page.getByRole('button', { name: '查看我的词语', exact: true }).click();
        await expect(page.getByText('你的身份：卧底', { exact: true })).toBeVisible();
        const draft = page.getByRole('textbox', { name: '房间发言内容' });
        await draft.fill('保留的合成草稿');
        const requests = fixture.state.calls;
        const connections = fixture.state.connected;
        await changeAppearance(
          page,
          skin.id === 'wps' ? '微信绿' : 'WPS 表格',
          mode === 'dark' ? 'light' : 'dark',
        );
        await expect(draft).toHaveValue('保留的合成草稿');
        expect(fixture.state.calls).toBe(requests);
        expect(fixture.state.connected).toBe(connections);
        await changeAppearance(page, skin.name, mode);
        const other = {
          type: 'undercover',
          data: {
            message: {
              id: 'm1',
              roomId: 'other-room',
              content: '别的房间消息',
              timestamp: new Date().toISOString(),
              sender: { id: '456', name: '合成玩家2' },
            },
          },
        };
        fixture.emit(other);
        const ownRoom = {
          ...other,
          data: {
            message: { ...other.data.message, roomId: 'synthetic-room', content: '同房间合成发言' },
          },
        };
        fixture.emit(ownRoom);
        fixture.emit(ownRoom);
        await expect(page.getByText('同房间合成发言', { exact: true })).toHaveCount(1);
        await expect(page.getByText('别的房间消息', { exact: true })).toHaveCount(0);
        await page.getByRole('button', { name: '发送发言', exact: true }).click();
        await expect(draft).toHaveValue('');
        expect(
          fixture.state.sends.some(
            (f) => (f.data as { type?: string } | undefined)?.type === 'undercover',
          ),
        ).toBe(true);
        await selectValue(page, '联机投票目标', '合成玩家2');
        await page.getByRole('button', { name: '提交投票', exact: true }).click();
        await page
          .getByRole('dialog', { name: '确认投票？' })
          .getByRole('button', { name: '确认投票', exact: true })
          .click();
        await expect(page.getByText('本轮已投票，等待结算。')).toBeVisible();
        await page.getByRole('textbox', { name: '猜测平民词' }).fill('香蕉');
        await page.getByRole('button', { name: '提交猜词' }).click();
        await expect(page.getByText('没有猜中，请留意剩余次数')).toBeVisible();
        await page.getByRole('textbox', { name: '猜测平民词' }).fill('苹果');
        await page.getByRole('button', { name: '提交猜词' }).click();
        await expect(page.getByText('卧底猜对了平民词，卧底获胜', { exact: true })).toBeVisible();
        await assertUndercoverLayout(page, width);
        expect(fixture.state.connected).toBe(connections);
        if (skin.id === 'wechat' && mode === 'dark')
          await page.screenshot({
            path: info.outputPath(`online-${width}.png`),
            fullPage: true,
          });
      });
    }
