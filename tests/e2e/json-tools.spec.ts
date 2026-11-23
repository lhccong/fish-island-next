import { expect, test, type Locator } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';

test.setTimeout(60_000);

for (const skin of builtinSkins) {
  for (const colorMode of ['light', 'dark']) {
    test(`${skin.id} ${colorMode}: JSON tools entry and editing`, async ({ page }, info) => {
      const mobile = page.viewportSize()!.width <= 760;
      const activate = (element: Locator) => (mobile ? element.tap() : element.click());
      const button = (name: string) => page.getByRole('button', { name, exact: true });
      await page.addInitScript(
        ({ skinId, mode }) => {
          localStorage.setItem('fish-island:skin', skinId);
          localStorage.setItem('fish-island:color-mode', mode);
          const read = FileReader.prototype.readAsText;
          FileReader.prototype.readAsText = function (file, encoding) {
            if (file instanceof File && file.name === 'unreadable.json') {
              window.addEventListener(
                'fail-json-file-read',
                () => this.dispatchEvent(new ProgressEvent('error')),
                { once: true },
              );
              return;
            }
            read.call(this, file, encoding);
          };
        },
        { skinId: skin.id, mode: colorMode },
      );
      await page.route('**/api/**', (route) => route.fulfill({ json: { code: 0, data: [] } }));
      let release: () => void = () => {};
      const delayed = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route('**/src/features/json-tools/index.ts*', async (route) => {
        await delayed;
        await route.continue();
      });

      await page.goto('/');
      const nav = page.getByRole('navigation', { name: '主要功能' });
      if (mobile) await activate(nav.getByRole('link', { name: '发现', exact: true }));
      const menu = mobile ? page.getByRole('navigation', { name: '发现菜单' }) : nav;
      const tools = menu.getByRole('link', { name: '工具', exact: true });
      await expect(tools).toBeVisible();
      if (mobile) expect((await tools.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await activate(tools);
      const tablist = page.getByRole('tablist', { name: '工具切换' });
      const jsonTab = tablist.getByRole('tab', { name: 'JSON 格式化', exact: true });
      const toolPanel = page.getByRole('tabpanel', { name: 'JSON 格式化' });
      try {
        const loading = toolPanel.getByRole('status').filter({ hasText: '正在打开工具…' });
        await expect(loading).toBeVisible();
        await expect(loading.locator('svg')).toHaveCount(1);
        await expect(jsonTab).toBeVisible();
      } finally {
        release();
      }
      await expect(page).toHaveURL('/utils/json');
      await expect(tablist.getByRole('tab')).toHaveCount(1);
      await expect(jsonTab).toHaveAttribute('aria-selected', 'true');
      await expect(toolPanel).toHaveAttribute('id', (await jsonTab.getAttribute('aria-controls'))!);
      expect((await jsonTab.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      if (!mobile) {
        await jsonTab.hover();
        await expect(jsonTab).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      }
      await jsonTab.focus();
      await jsonTab.press('ArrowRight');
      await expect(jsonTab).toBeFocused();
      await expect(jsonTab).toHaveCSS('outline-style', 'solid');
      await activate(jsonTab);
      await expect(page).toHaveURL('/utils/json');
      await expect(page.locator('html')).toHaveAttribute('data-color-mode', colorMode);
      if (!mobile) await expect(tools).toHaveAttribute('aria-current', 'page');

      const input = page.getByRole('textbox', { name: '输入 JSON' });
      const output = page.getByRole('region', { name: '结果滚动区' });
      const format = page.getByRole('combobox', { name: '输出格式' });
      const openFormat = async (option: string) => {
        await activate(format);
        await activate(page.getByRole('option', { name: option, exact: true }));
        await expect(format).toHaveText(option);
      };
      await expect(output).toContainText('处理结果将显示在这里');
      await expect(button('复制')).toBeDisabled();
      await expect(button('格式化')).toBeDisabled();

      await input.fill('{"incomplete":}');
      await expect(page.getByRole('alert')).toContainText('JSON 格式有误');
      await expect(input).toHaveAttribute('aria-invalid', 'true');
      await expect(button('下载')).toBeDisabled();
      await activate(button('示例'));
      await expect(output).toContainText('"工具"');
      const branch = output.locator('summary').filter({ hasText: '"工具"' });
      await activate(branch);
      await expect(output.locator('summary').filter({ hasText: '[0]' })).toBeVisible();
      const depth = page.getByRole('combobox', { name: '树视图展开层级' });
      await activate(depth);
      await activate(page.getByRole('option', { name: '全部展开', exact: true }));
      await expect(output).toContainText('"可用"');
      await activate(button('校验'));
      await expect(page.getByText('JSON 格式有效')).toBeVisible();

      await activate(button('格式化'));
      await expect(format).toHaveText('格式化 JSON');
      const indent = page.getByRole('combobox', { name: '缩进' });
      await activate(indent);
      await expect(page.getByRole('option', { name: '2 空格', exact: true })).toHaveAttribute(
        'data-state',
        'checked',
      );
      await page.keyboard.press('Escape');
      await expect(indent).toBeFocused();
      await activate(indent);
      await activate(page.getByRole('option', { name: '4 空格', exact: true }));
      await expect(output.locator('pre')).toHaveText(/\n {4}"名称"/);
      await openFormat('压缩 JSON');
      await expect(output.locator('pre')).toHaveText(await input.inputValue());
      await openFormat('YAML');
      await expect(output.locator('pre')).toContainText('名称: 摸鱼岛');
      const downloadEvent = page.waitForEvent('download');
      await activate(button('下载'));
      const download = await downloadEvent;
      expect(download.suggestedFilename()).toBe('formatted.yaml');
      await download.delete();

      const picker = page.locator('input[type=file]');
      const fileChooser = page.waitForEvent('filechooser');
      await activate(button('打开文件'));
      await (
        await fileChooser
      ).setFiles({
        name: 'unreadable.json',
        mimeType: 'application/json',
        buffer: Buffer.from('{}'),
      });
      const loadingFile = page.getByRole('status').filter({ hasText: '正在读取文件…' });
      await expect(loadingFile).toBeVisible();
      await page.evaluate(() => window.dispatchEvent(new Event('fail-json-file-read')));
      await expect(page.getByRole('alert')).toContainText('文件读取失败');
      await picker.setInputFiles({
        name: 'example.json',
        mimeType: 'application/json',
        buffer: Buffer.from('null'),
      });
      await expect(input).toHaveValue('null');
      await openFormat('树视图');
      await expect(output).toHaveText('null');

      await page.evaluate(() => {
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: { writeText: () => Promise.reject(new Error('Clipboard permission denied')) },
        });
      });
      await activate(button('复制'));
      await expect(page.getByRole('alert')).toContainText('复制失败');
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: { writeText: async () => {} },
        });
      });
      await activate(button('复制'));
      await expect(page.getByText('已复制结果')).toBeVisible();

      await activate(page.getByRole('switch', { name: '自动处理' }));
      const large = JSON.stringify(Array.from({ length: 35 }, (_, index) => `条目 ${index}`));
      await input.fill(large);
      await expect(button('复制')).toBeDisabled();
      await activate(button('格式化'));
      await expect(output.locator('pre')).toContainText('条目 34');
      const outputRoot = output.locator('..');
      const track = outputRoot.locator('[data-orientation=vertical]');
      await output.focus();
      await output.press('End');
      await expect.poll(() => output.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
      await expect(track).toHaveCSS('visibility', mobile ? 'hidden' : 'visible');
      if (!mobile) await expect(track).toHaveCSS('opacity', '1');
      const geometry = await output.evaluate((node) => ({
        horizontalOverflow: node.scrollWidth - node.clientWidth,
        gutter: Number.parseInt(getComputedStyle(node).paddingInlineEnd, 10),
      }));
      expect(geometry.horizontalOverflow).toBe(0);
      expect(geometry.gutter).toBe(mobile ? 20 : 24);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        page.viewportSize()!.width,
      );
      if (mobile) {
        await output.scrollIntoViewIfNeeded();
        await output.evaluate((node) => {
          node.scrollTop = 0;
        });
        const bounds = (await output.boundingBox())!;
        const cdp = await page.context().newCDPSession(page);
        const x = bounds.x + bounds.width / 2;
        const y = bounds.y + bounds.height - 24;
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x, y }],
        });
        for (const distance of [20, 45, 70, 95, 120]) {
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x, y: y - distance }],
          });
        }
        await expect.poll(() => output.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
        // Pause with the finger down before releasing, so Chromium does not fling past the footer.
        await output.evaluate(() => new Promise((resolve) => setTimeout(resolve, 160)));
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await cdp.detach();
      }

      if (
        (skin.id === 'moyu-island' && !mobile) ||
        (skin.id === 'pixel-island' && mobile && colorMode === 'dark')
      ) {
        await input.scrollIntoViewIfNeeded();
        await page.screenshot({ path: info.outputPath('json-tools.png') });
      }
      await activate(button('用作输入'));
      await expect(input).toHaveValue(/\n/);
      await activate(button('清空'));
      await expect(output).toContainText('处理结果将显示在这里');
      if (mobile) {
        await activate(page.getByRole('link', { name: '返回发现', exact: true }));
        await expect(page).toHaveURL('/discover');
      }
      await page.goto('/utils');
      await expect(page).toHaveURL('/utils/json');
    });
  }
}

test('theme and mode changes retain the editor draft and output', async ({ page }) => {
  const viewport = page.viewportSize()!;
  await page.addInitScript(() => {
    localStorage.setItem('fish-island:skin', 'wechat');
    localStorage.setItem('fish-island:color-mode', 'light');
  });
  await page.goto('/utils/json');
  const input = page.getByRole('textbox', { name: '输入 JSON' });
  const draft = '{"draft":[1,2,3]}';
  await input.fill(draft);
  await page.getByRole('button', { name: '格式化', exact: true }).click();
  const output = page.getByRole('region', { name: '结果滚动区' }).locator('pre');
  const formatted = await output.textContent();
  expect(formatted).toContain('"draft"');
  if (viewport.width <= 760) await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByRole('button', { name: '切换主题' }).click();
  const picker = page.getByRole('dialog', { name: '主题模式' });
  await picker.getByRole('button', { name: '暗夜模式' }).click();
  await picker.getByRole('button', { name: '摸鱼岛像素风' }).click();
  await picker.getByRole('button', { name: '关闭', exact: true }).click();
  if (viewport.width <= 760) await page.setViewportSize(viewport);
  await expect(page.locator('html')).toHaveAttribute('data-color-mode', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'pixel-island');
  await expect(input).toHaveValue(draft);
  await expect(output).toHaveText(formatted!);
  await expect(page.getByRole('tab', { name: 'JSON 格式化' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: '复制', exact: true }).click();
  await expect(page.getByText('已复制结果')).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied.replaceAll('\r\n', '\n')).toBe(formatted);
});

test('switches registered tools by keyboard, pointer and browser history', async ({ page }) => {
  await page.route('**/src/app/config/tools.ts*', async (route) => {
    const response = await route.fetch();
    const original = await response.text();
    await route.fulfill({
      response,
      body: `${original}\ntools.push({ path: '/utils/test-only', label: '测试工具', Panel: () => '测试工具正文' });`,
    });
  });
  await page.goto('/utils/json');
  const json = page.getByRole('tab', { name: 'JSON 格式化' });
  const second = page.getByRole('tab', { name: '测试工具' });
  await json.focus();
  await json.press('End');
  await expect(second).toBeFocused();
  await expect(second).toHaveAttribute('aria-selected', 'false');
  await second.press('Home');
  await expect(json).toBeFocused();
  await json.press('ArrowLeft');
  await expect(second).toBeFocused();
  await second.press('Enter');
  await expect(page).toHaveURL('/utils/test-only');
  await expect(second).toBeFocused();
  await expect(second).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel', { name: '测试工具' })).toHaveText('测试工具正文');
  await expect(page.getByRole('tabpanel', { name: 'JSON 格式化' })).toHaveCount(0);
  await second.press('ArrowRight');
  await expect(json).toBeFocused();
  await json.press('Space');
  await expect(page).toHaveURL('/utils/json');
  await page.goBack();
  await expect(second).toHaveAttribute('aria-selected', 'true');
  if (page.viewportSize()!.width <= 760) await json.tap();
  else await json.click();
  await expect(page).toHaveURL('/utils/json');
  await expect(json).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel', { name: 'JSON 格式化' })).toBeVisible();
});
