import { expect, type Locator } from '@playwright/test';
import { mbtiTypes } from '../../src/domain/auth';

export async function checkMbtiRow(badge: Locator) {
  const layout = await badge.evaluate((label) => {
    const field = label.parentElement!;
    const area = field.previousElementSibling!;
    const row = field.parentElement!.getBoundingClientRect();
    const tag = label.getBoundingClientRect();
    return {
      offset: Math.abs(field.getBoundingClientRect().top - area.getBoundingClientRect().top),
      separate: tag.left >= area.getBoundingClientRect().right,
      visible: tag.right <= row.right,
    };
  });
  expect(layout.offset).toBeLessThanOrEqual(4);
  expect(layout.separate).toBe(true);
  expect(layout.visible).toBe(true);
}

export async function checkMbtiPalette(badge: Locator) {
  const palette = await badge.evaluate((label, types) => {
    const sample = label.cloneNode() as HTMLElement;
    sample.hidden = true;
    label.after(sample);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    const rgb = (value: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3);
    };
    const luminance = (color: number[]) =>
      color.reduce((sum, value, index) => {
        const unit = value / 255;
        const channel = unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
        return sum + channel * [0.2126, 0.7152, 0.0722][index]!;
      }, 0);
    try {
      return types.map((type) => {
        sample.dataset.mbti = type;
        const style = getComputedStyle(sample);
        const background = rgb(style.backgroundColor);
        const colors = [luminance(background), luminance(rgb(style.color))];
        const contrast = (Math.max(...colors) + 0.05) / (Math.min(...colors) + 0.05);
        return { background: background.join(','), contrast };
      });
    } finally {
      sample.remove();
    }
  }, mbtiTypes);
  expect(new Set(palette.map(({ background }) => background)).size).toBe(mbtiTypes.length);
  expect(Math.min(...palette.map(({ contrast }) => contrast))).toBeGreaterThanOrEqual(4.5);
}
