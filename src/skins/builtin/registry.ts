import type { BuiltinSkinId, SkinDefinition } from './types';

export const builtinSkins: readonly SkinDefinition[] = [
  {
    id: 'wechat',
    name: '微信绿',
    tokens: { '--color-accent': '#087d51', '--color-accent-soft': '#e6f4ec' },
  },
  {
    id: 'feishu',
    name: '飞书蓝',
    tokens: { '--color-accent': '#315bd6', '--color-accent-soft': '#ebf0ff' },
  },
  {
    id: 'dingtalk',
    name: '钉钉蓝',
    tokens: { '--color-accent': '#076aab', '--color-accent-soft': '#e6f3fc' },
  },
];

export function getBuiltinSkin(id: BuiltinSkinId): SkinDefinition {
  const skin = builtinSkins.find((item) => item.id === id);
  if (!skin) throw new Error(`Unknown built-in skin: ${id}`);
  return skin;
}
