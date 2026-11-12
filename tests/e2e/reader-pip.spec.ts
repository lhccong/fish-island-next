import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: real document picture in picture lifecycle`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop-chromium', '文档画中画仅在桌面浏览器验收');
      await page.route('**/api/**', (route) => route.abort());
      await page.addInitScript(
        ({ skin, mode }) => {
          localStorage.setItem('fish-island:skin', skin);
          localStorage.setItem('fish-island:color-mode', mode);
          localStorage.setItem(
            'fish-reader-books',
            JSON.stringify([
              {
                id: 'pip-book',
                title: '画中画验收',
                source: 'local',
                chapters: [
                  { index: 0, title: '第一章', content: '第一章正文\n用于真实画中画测试' },
                  { index: 2, title: '第二章', content: '第二章正文\n验证切章同步' },
                ],
              },
            ]),
          );
        },
        { skin: skin.id, mode },
      );
      await page.goto('/reader');
      await page.getByRole('button', { name: '阅读《画中画验收》' }).click();
      const reader = page.getByRole('region', { name: '阅读器', exact: true });
      await expect(reader.getByText('第一章正文', { exact: true })).toBeVisible();
      await reader.getByRole('button', { name: '画中画', exact: true }).click();
      await expect
        .poll(() =>
          page.evaluate(() => {
            const api = (window as unknown as { documentPictureInPicture: { window?: Window } })
              .documentPictureInPicture;
            return api?.window?.document.body.textContent || '';
          }),
        )
        .toContain('第一章正文');
      await expect(reader).toHaveCount(0);
      const pipState = await page.evaluate(() => {
        const pip = (window as unknown as { documentPictureInPicture: { window: Window } })
          .documentPictureInPicture.window;
        const element = pip.document.querySelector('[aria-label="阅读器"]')!;
        return {
          skin: pip.document.documentElement.dataset.skin,
          mode: pip.document.documentElement.dataset.colorMode,
          background: pip.getComputedStyle(element).backgroundColor,
          width: pip.document.documentElement.scrollWidth <= pip.innerWidth,
        };
      });
      expect(pipState.skin).toBe(skin.id);
      expect(pipState.mode).toBe(mode);
      expect(pipState.width).toBe(true);
      expect(pipState.background).toBe(mode === 'dark' ? 'rgb(25, 26, 28)' : 'rgb(245, 245, 245)');
      await page.evaluate(() => {
        const pip = (window as unknown as { documentPictureInPicture: { window: Window } })
          .documentPictureInPicture.window;
        (
          pip.document.querySelector(
            '[aria-label="阅读器"] button:last-child',
          ) as HTMLElement | null
        )?.blur();
        const next = [...pip.document.querySelectorAll('button')].find(
          (element) => element.textContent === '下一章',
        );
        next?.click();
      });
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              (window as unknown as { documentPictureInPicture: { window: Window } })
                .documentPictureInPicture.window.document.body.textContent,
          ),
        )
        .toContain('第二章正文');
      await page.getByRole('button', { name: '切换主题', exact: true }).click();
      const appearance = page.getByRole('dialog', { name: '主题模式' });
      await appearance
        .getByRole('button', { name: skin.id === 'wps' ? '微信绿' : 'WPS 表格', exact: true })
        .click();
      await appearance.getByRole('button', { name: skin.name, exact: true }).click();
      await appearance.getByRole('button', { name: '关闭', exact: true }).click();
      await page.evaluate(() =>
        (
          window as unknown as { documentPictureInPicture: { window: Window } }
        ).documentPictureInPicture.window.close(),
      );
      await expect(reader.getByText('第二章正文', { exact: true })).toBeVisible();
      await reader.getByRole('button', { name: '画中画', exact: true }).click();
      await expect
        .poll(() =>
          page.evaluate(() =>
            Boolean(
              (window as unknown as { documentPictureInPicture: { window?: Window } })
                .documentPictureInPicture.window,
            ),
          ),
        )
        .toBe(true);
      await page.evaluate(() => {
        const pip = (window as unknown as { documentPictureInPicture: { window: Window } })
          .documentPictureInPicture.window;
        (
          pip.document.querySelector('button[aria-label="阅读器设置"]') as HTMLButtonElement
        ).click();
      });
      await expect(page.getByRole('dialog', { name: '阅读设置', exact: true })).toBeVisible();
      await page.getByRole('dialog', { name: '阅读设置', exact: true }).press('Escape');
      await expect(reader).toBeVisible();
    });
  }
