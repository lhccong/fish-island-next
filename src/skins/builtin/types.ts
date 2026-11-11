export type BuiltinSkinId = 'wechat' | 'wecom' | 'feishu' | 'dingtalk' | 'wps';

export interface SkinTokens {
  '--color-accent': string;
  '--color-accent-soft': string;
  '--color-accent-text': string;
  '--color-selected-muted': string;
  '--color-rail': string;
  '--color-sidebar': string;
  '--color-message-outgoing': string;
  '--color-message-incoming': string;
  '--color-rail-active': string;
  '--color-hover': string;
  '--color-canvas': string;
  '--color-surface': string;
}

export interface SkinDefinition {
  id: BuiltinSkinId;
  name: string;
  tokens: SkinTokens;
}
