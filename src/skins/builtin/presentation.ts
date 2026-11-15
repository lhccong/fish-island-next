import type { ColorMode } from './color-mode';
import type { BuiltinSkinId, SkinPresentationTokens } from './types';

export function getSkinPresentationTokens(
  id: BuiltinSkinId,
  mode: ColorMode,
): SkinPresentationTokens {
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
