import type { BuiltinSkinId, SkinDefinition } from './types';

const workspaceTokens = {
  '--color-rail': '#dfdfdf',
  '--color-sidebar': '#e8e8e8',
  '--color-message-outgoing': '#95ec69',
};

export const builtinSkins: readonly SkinDefinition[] = [
  {
    id: 'wechat',
    name: '微信绿',
    tokens: {
      ...workspaceTokens,
      '--color-accent': '#10b46c',
      '--color-accent-soft': '#e9f5ee',
      '--color-accent-text': '#087c46',
      '--color-selected-muted': '#e8f8f0',
    },
  },
  {
    id: 'wecom',
    name: '企业微信',
    tokens: {
      '--color-accent': '#2678df',
      '--color-accent-soft': '#e8f1ff',
      '--color-accent-text': '#185aaa',
      '--color-selected-muted': '#edf4ff',
      '--color-rail': '#e0e6ee',
      '--color-sidebar': '#eff2f6',
      '--color-message-outgoing': '#cce6ff',
    },
  },
  {
    id: 'feishu',
    name: '飞书蓝',
    tokens: {
      ...workspaceTokens,
      '--color-accent': '#315bd6',
      '--color-accent-soft': '#ebf0ff',
      '--color-accent-text': '#2549b0',
      '--color-selected-muted': '#edf1ff',
    },
  },
  {
    id: 'dingtalk',
    name: '钉钉蓝',
    tokens: {
      ...workspaceTokens,
      '--color-accent': '#076aab',
      '--color-accent-soft': '#e6f3fc',
      '--color-accent-text': '#075589',
      '--color-selected-muted': '#e6f3fc',
    },
  },
];

export function getBuiltinSkin(id: BuiltinSkinId): SkinDefinition {
  const skin = builtinSkins.find((item) => item.id === id);
  if (!skin) throw new Error(`Unknown built-in skin: ${id}`);
  return skin;
}
