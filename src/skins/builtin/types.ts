export type BuiltinSkinId = 'wechat' | 'wecom' | 'feishu' | 'dingtalk';

export interface SkinTokens {
  '--color-accent': string;
  '--color-accent-soft': string;
  '--color-accent-text': string;
  '--color-selected-muted': string;
  '--color-rail': string;
  '--color-sidebar': string;
  '--color-message-outgoing': string;
}

export interface SkinDefinition {
  id: BuiltinSkinId;
  name: string;
  tokens: SkinTokens;
}
