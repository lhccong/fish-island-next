import type { BuiltinSkinId, SkinDefinition } from './types';

const workspaceTokens = {
  '--color-rail': '#dfdfdf',
  '--color-sidebar': '#e8e8e8',
  '--color-message-outgoing': '#95ec69',
  '--color-message-incoming': '#ededed',
  '--color-rail-active': '#d3d3d3',
  '--color-hover': '#dcdcdc',
  '--color-canvas': '#f7f7f7',
  '--color-surface': '#fafafa',
};

export const builtinSkins: readonly SkinDefinition[] = [
  {
    id: 'wps',
    name: 'WPS 表格',
    tokens: {
      '--color-rail': '#e2e7ea',
      '--color-sidebar': '#f1f2f3',
      '--color-message-outgoing': '#d9eee4',
      '--color-message-incoming': '#f1f3f4',
      '--color-rail-active': '#cfdcd6',
      '--color-hover': '#e3e9e6',
      '--color-canvas': '#ffffff',
      '--color-surface': '#ffffff',
      '--color-accent': '#00875a',
      '--color-accent-soft': '#e6f3ed',
      '--color-accent-text': '#006b47',
      '--color-selected-muted': '#e5f3ed',
    },
  },
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
      ...workspaceTokens,
      '--color-message-incoming': '#e9eef5',
      '--color-rail-active': '#ced9e8',
      '--color-hover': '#e0e8f2',
      '--color-canvas': '#f5f7fa',
      '--color-surface': '#fafbfd',
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
      '--color-rail': '#e4e9f5',
      '--color-sidebar': '#f0f2f8',
      '--color-message-outgoing': '#dce5ff',
      '--color-message-incoming': '#edf0f7',
      '--color-rail-active': '#d4ddf0',
      '--color-hover': '#e2e8f5',
      '--color-canvas': '#f5f6fa',
      '--color-surface': '#fafbfe',
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
      '--color-rail': '#dfeaf5',
      '--color-sidebar': '#edf4fa',
      '--color-message-outgoing': '#cce8ff',
      '--color-message-incoming': '#e8f0f7',
      '--color-rail-active': '#cbdfee',
      '--color-hover': '#dceaf5',
      '--color-canvas': '#f3f7fb',
      '--color-surface': '#f9fcff',
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
