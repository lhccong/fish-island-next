import type { ColorMode } from './color-mode';
import type { BuiltinSkinId, SkinPresentationTokens } from './types';

export function getSkinPresentationTokens(
  id: BuiltinSkinId,
  mode: ColorMode,
): SkinPresentationTokens {
  if (id === 'moyu-island') {
    const dark = mode === 'dark';
    return {
      '--color-text': dark ? '#e6e8eb' : '#333333',
      '--color-muted': dark ? '#a7acb3' : '#767676',
      '--color-border': dark ? '#393d43' : '#eeeeee',
      '--color-divider': dark ? '#30343a' : '#f0f0f0',
      '--color-rail-text': dark ? '#b8bdc5' : '#606060',
      '--color-rail-highlight': 'var(--color-classic-navigation)',
      '--color-classic-navigation': dark ? '#ffb77c' : '#b85c1c',
      '--color-action': dark ? '#2168bb' : '#096fe3',
      '--color-action-hover': dark ? '#2877cf' : '#0862cc',
      '--color-hot-ribbon': dark ? '#a75c28' : '#ffa768',
      '--color-hot-ribbon-fold': dark ? '#75411f' : '#cb834c',
      '--color-hot-link': dark ? '#8ec9ff' : '#2d5c91',
      '--color-message-surface': 'var(--color-surface)',
      '--radius-control': '8px',
      '--radius-panel': '24px',
      '--shadow-panel': dark ? '0 8px 32px rgb(0 0 0 / 24%)' : '0 8px 32px rgb(0 0 0 / 10%)',
    };
  }
  if (id !== 'pixel-island') return {};
  const dark = mode === 'dark';
  return {
    '--color-text': dark ? '#e6eee7' : '#173e3d',
    '--color-muted': dark ? '#a8bab2' : '#526f66',
    '--color-border': dark ? '#455e56' : '#acc9b9',
    '--color-divider': dark ? '#33463f' : '#d9e5d5',
    '--color-rail-text': dark ? '#b4cec3' : '#305d54',
    '--color-rail-highlight': 'var(--color-accent-text)',
    '--color-scrollbar': dark ? '#557269' : '#8bafa0',
    '--color-scrollbar-hover': dark ? '#8fb5a7' : '#547e6e',
    '--color-message-surface': 'var(--color-surface)',
    '--radius-control': '3px',
    '--radius-panel': '4px',
    '--shadow-panel': '3px 3px 0 var(--color-border)',
  };
}
