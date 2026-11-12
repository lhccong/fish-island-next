import type { ReaderSettings } from '@/domain/reader';
import type { CSSProperties } from 'react';
export const readingThemes = [
  ['default', '默认主题'],
  ['night', '夜间模式'],
  ['paper', '纸张'],
  ['ivory', '米白纸质'],
  ['green-soft', '淡绿色护眼'],
  ['warm-night', '暖夜墨棕'],
  ['gray-minimal', '极简冷灰'],
  ['japan-soft', '日系淡雅'],
  ['pink-milk', '草莓牛奶'],
  ['mint-choco', '薄荷巧克力'],
  ['sky-sugar', '蓝天棉花糖'],
  ['lemon-cream', '柠檬奶油'],
].map(([value, label]) => ({ value: value!, label: label! }));
export function readingStyle(settings: ReaderSettings): CSSProperties {
  const custom = settings.customThemes.find((theme) => theme.id === settings.theme);
  const preset = readingThemes.some((theme) => theme.value === settings.theme)
    ? settings.theme
    : 'default';
  return {
    '--reader-paper': custom?.backgroundColor ?? `var(--color-reader-${preset}-paper)`,
    '--reader-ink': custom?.fontColor ?? `var(--color-reader-${preset}-ink)`,
    fontSize: settings.fontSize,
    fontFamily: settings.fontFamily,
    lineHeight: settings.lineHeight,
    letterSpacing: settings.letterSpacing,
    '--reader-indent': `${settings.paragraphIndent}em`,
  } as CSSProperties;
}
export const fontOptions = [
  ['system-ui', '默认'],
  ['Arial, sans-serif', 'Arial'],
  ['"Microsoft YaHei", sans-serif', '微软雅黑'],
  ['SimSun, serif', '宋体'],
  ['KaiTi, serif', '楷体'],
  ['SimHei, sans-serif', '黑体'],
  ['"Source Han Sans CN", sans-serif', '思源黑体'],
  ['"Source Han Serif CN", serif', '思源宋体'],
].map(([value, label]) => ({ value: value!, label: label! }));
export const keyOptions = [
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'KeyA',
  'KeyD',
  'KeyW',
  'KeyS',
  'KeyJ',
  'KeyK',
  'Escape',
  'Space',
].map((value) => ({ value, label: value }));
