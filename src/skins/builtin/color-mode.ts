import { getBuiltinSkin } from './registry';
import type { BuiltinSkinId, SkinTokens } from './types';

export type ColorMode = 'light' | 'dark';

const darkAccents: Record<
  BuiltinSkinId,
  Pick<
    SkinTokens,
    | '--color-accent'
    | '--color-accent-soft'
    | '--color-accent-text'
    | '--color-selected-muted'
    | '--color-message-outgoing'
  >
> = {
  wechat: {
    '--color-accent': '#147b4b',
    '--color-accent-soft': '#203c2e',
    '--color-accent-text': '#74dfa7',
    '--color-selected-muted': '#e0f7eb',
    '--color-message-outgoing': '#254b37',
  },
  wecom: {
    '--color-accent': '#2867b8',
    '--color-accent-soft': '#20334b',
    '--color-accent-text': '#97c5ff',
    '--color-selected-muted': '#e4f0ff',
    '--color-message-outgoing': '#263e5b',
  },
  feishu: {
    '--color-accent': '#405ece',
    '--color-accent-soft': '#292f4b',
    '--color-accent-text': '#acbcff',
    '--color-selected-muted': '#ecefff',
    '--color-message-outgoing': '#313d66',
  },
  dingtalk: {
    '--color-accent': '#176a9f',
    '--color-accent-soft': '#1d3544',
    '--color-accent-text': '#8dceff',
    '--color-selected-muted': '#e2f3ff',
    '--color-message-outgoing': '#254657',
  },
  wps: {
    '--color-accent': '#14754f',
    '--color-accent-soft': '#203b30',
    '--color-accent-text': '#78d9ac',
    '--color-selected-muted': '#e1f7ec',
    '--color-message-outgoing': '#264b3b',
  },
};

export function getSkinTokens(id: BuiltinSkinId, mode: ColorMode): SkinTokens {
  const skin = getBuiltinSkin(id);
  if (mode === 'light') return skin.tokens;
  return {
    ...skin.tokens,
    '--color-canvas': '#191a1c',
    '--color-surface': '#222427',
    '--color-rail': '#1e2023',
    '--color-sidebar': '#202225',
    '--color-message-incoming': '#2a2d31',
    '--color-rail-active': '#32363b',
    '--color-hover': '#2e3237',
    ...darkAccents[id],
  };
}
