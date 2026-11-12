import { expect, test } from '@playwright/test';

test('custom reading themes, credential isolation, speech cleanup and window geometry', async ({
  page,
}, testInfo) => {
  await page.route('**/api/**', (route) => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem(
      'fish-reader-books',
      JSON.stringify([
        {
          id: 'settings-book',
          title: '设置验收',
          source: 'local',
          chapters: [{ index: 0, title: '正文', content: '朗读第一段\n朗读第二段' }],
        },
      ]),
    );
    const calls: string[] = [];
    Object.defineProperty(window, 'readerSpeechCalls', { value: calls });
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        cancel() {
          calls.push('cancel');
        },
        pause() {
          calls.push('pause');
        },
        resume() {
          calls.push('resume');
        },
        getVoices() {
          return [];
        },
        addEventListener() {},
        removeEventListener() {},
        speak(utterance: SpeechSynthesisUtterance) {
          calls.push('speak');
          utterance.onstart?.(new Event('start') as SpeechSynthesisEvent);
        },
      },
      configurable: true,
    });
  });
  await page.goto('/reader');
  await page.getByRole('button', { name: '阅读《设置验收》' }).click();
  const reader = page.getByRole('region', { name: '阅读器', exact: true });
  await expect(reader).toBeVisible();
  if (testInfo.project.name === 'desktop-chromium') {
    const original = (await reader.boundingBox())!;
    const drag = await reader.getByRole('button', { name: '拖动阅读窗口' }).boundingBox();
    await page.mouse.move(drag!.x + 30, drag!.y + 20);
    await page.mouse.down();
    await page.mouse.move(drag!.x + 130, drag!.y + 20, { steps: 5 });
    await page.mouse.up();
    await expect.poll(async () => (await reader.boundingBox())!.x).toBeGreaterThan(original.x + 50);
    await reader.getByRole('button', { name: '切换全屏' }).click();
    expect((await reader.boundingBox())!.width).toBeGreaterThan(original.width);
    await reader.getByRole('button', { name: '切换全屏' }).click();
  }
  await reader.getByRole('button', { name: '阅读器设置' }).click();
  const settings = page.getByRole('dialog', { name: '阅读设置', exact: true });
  await settings.getByText('自定义正文主题', { exact: true }).click();
  await settings.getByLabel('主题名称', { exact: true }).fill('自定义验收主题');
  await settings.getByLabel('背景颜色', { exact: true }).fill('#263238');
  await settings.getByLabel('文字颜色', { exact: true }).fill('#eeeeee');
  await settings.getByRole('button', { name: '保存并应用主题' }).click();
  await expect(settings.getByRole('combobox', { name: '阅读主题' })).toHaveText('自定义验收主题');
  await settings.getByRole('combobox', { name: '朗读功能' }).click();
  await page.getByRole('option', { name: '启用朗读功能', exact: true }).click();
  await settings
    .getByLabel('阅读服务凭证（当前会话覆盖）', { exact: true })
    .fill('synthetic-test-only');
  await settings.getByRole('button', { name: '应用服务配置' }).click();
  expect(await page.evaluate(() => localStorage.getItem('fish-island:reader:v1'))).not.toContain(
    'synthetic-test-only',
  );
  await settings.getByRole('button', { name: '关闭阅读设置' }).click();
  await reader.getByRole('button', { name: '开始朗读' }).click();
  await expect(reader.getByRole('button', { name: '暂停朗读' })).toBeVisible();
  await reader.getByRole('button', { name: '暂停朗读' }).click();
  await reader.getByRole('button', { name: '继续朗读' }).click();
  await reader.getByRole('button', { name: '停止朗读' }).click();
  await reader.getByRole('button', { name: '开始朗读' }).click();
  await reader.getByRole('button', { name: '紧急隐藏' }).click();
  const calls = await page.evaluate(
    () => (window as unknown as { readerSpeechCalls: string[] }).readerSpeechCalls,
  );
  expect(calls).toContain('speak');
  expect(calls).toContain('pause');
  expect(calls).toContain('resume');
  expect(calls.at(-1)).toBe('cancel');
  await page.reload();
  await page.getByRole('button', { name: '阅读设置', exact: true }).click();
  await expect(settings.getByLabel('阅读服务凭证（当前会话覆盖）', { exact: true })).toHaveValue(
    'synthetic-reader-default',
  );
  await expect(settings.getByRole('combobox', { name: '阅读主题' })).toHaveText('自定义验收主题');
});
