import { expect, test, type Route } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
import { changeAppearance } from './undercover-fixture';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    test(`${skin.id} ${mode}: invitation tags and invited room lifecycle`, async ({
      page,
    }, info) => {
      test.setTimeout(60_000);
      const fixture = await setupChatMenu(page, skin.id, mode);
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      await draft.fill('合成保留草稿');
      fixture.push(
        '1',
        [
          '一起玩 [invite/chess]Room-1[/invite] [emoticon_1]',
          '[invite/draw]draw_2[/invite]',
          '[invite/landlords]table_3[/invite]',
          '[invite/chineseChess]4[/invite]',
          '<undercover>我邀请你加入谁是卧底游戏！房间ID: spy_5</undercover>',
          '[invite/unknown]6[/invite]',
        ].join('\n'),
      );
      const button = page.getByRole('button', { name: '进入谁是卧底房间 spy_5', exact: true });
      await expect(button).toBeVisible();
      await expect(page.getByText('中国象棋暂未接入', { exact: true })).toBeVisible();
      await expect(page.getByText('[invite/unknown]6[/invite]', { exact: true })).toBeVisible();
      for (const name of [
        '进入五子棋房间 Room-1',
        '进入你画我猜房间 draw_2',
        '进入斗地主房间 table_3',
      ]) {
        const entry = page.getByRole('button', { name, exact: true });
        await entry.scrollIntoViewIfNeeded();
        await expect(entry).toBeVisible();
        expect((await entry.boundingBox())!.height).toBe(
          page.viewportSize()!.width <= 760 ? 44 : 32,
        );
      }
      await button.scrollIntoViewIfNeeded();
      await button.focus();
      await expect(button).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(
        await page
          .locator('[data-message-id]')
          .evaluateAll((rows) => rows.every((row) => row.scrollWidth <= row.clientWidth)),
      ).toBe(true);
      await page.screenshot({ path: info.outputPath('invitations.png') });
      const before = fixture.stats();
      await changeAppearance(
        page,
        skin.id === 'wps' ? '微信绿' : 'WPS 表格',
        mode === 'light' ? 'dark' : 'light',
      );
      await expect(draft).toHaveText('合成保留草稿');
      await expect(button).toBeVisible();
      await changeAppearance(page, skin.name, mode);
      expect(fixture.stats().connections).toBe(before.connections);
      expect(fixture.stats().historyRequests).toBe(before.historyRequests);

      for (const [name, url] of [
        ['进入五子棋房间 Room-1', '/game/piece?roomId=Room-1&mode=online'],
        ['进入你画我猜房间 draw_2', '/game/draw/draw_2'],
        ['进入斗地主房间 table_3', '/game/landlords/table_3'],
      ]) {
        await page.getByRole('button', { name: name!, exact: true }).click();
        await expect(page).toHaveURL(url!);
        await page.goBack();
        await expect(draft).toHaveText('合成保留草稿');
      }

      let response: Route | undefined;
      let mutations = 0;
      await page.route('**/api/undercover/**', (route) => {
        if (route.request().method() !== 'GET') mutations++;
        if (route.request().url().includes('/room/list'))
          return route.fulfill({ json: { code: 0, data: [] } });
        if (route.request().url().includes('/room/byId')) {
          response = route;
          return;
        }
        return route.fulfill({ json: { code: 0, data: [] } });
      });
      if (page.viewportSize()!.width <= 760) await button.tap();
      else {
        await button.focus();
        await page.keyboard.press('Enter');
      }
      await expect(page).toHaveURL('/game/undercover?roomId=spy_5');
      await expect(page.getByRole('status').filter({ hasText: '正在同步房间' })).toBeVisible();
      await expect.poll(() => !!response).toBe(true);
      await response!.fulfill({ status: 503 });
      await expect(page.getByRole('alert')).toContainText('HTTP 503');
      response = undefined;
      await page.getByRole('button', { name: '重试同步', exact: true }).click();
      await expect.poll(() => !!response).toBe(true);
      await response!.fulfill({
        json: {
          code: 0,
          data: {
            roomId: 'spy_5',
            creatorId: '456',
            creatorName: '合成房主',
            status: 'WAITING',
            maxPlayers: 6,
            gameMode: 1,
            participants: [{ userId: '456', userName: '合成房主' }],
          },
        },
      });
      await expect(page.getByRole('button', { name: '加入房间', exact: true })).toBeVisible();
      expect(mutations).toBe(0);
      response = undefined;
      await page.getByRole('button', { name: '刷新房间', exact: true }).click();
      await expect.poll(() => !!response).toBe(true);
      await response!.fulfill({ json: { code: 0, data: null } });
      await expect(page.getByText('游戏已结束', { exact: true })).toBeVisible();
      await page.goBack();
      await expect(draft).toHaveText('合成保留草稿');
      response = undefined;
      await button.click();
      await expect.poll(() => !!response).toBe(true);
      await response!.fulfill({ json: { code: 0, data: null } });
      await expect(page.getByRole('heading', { name: '还没有房间', exact: true })).toBeVisible();
      await expect(page.getByText('房间已结束或已解散，已返回大厅', { exact: true })).toBeVisible();
    });
