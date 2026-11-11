export type BuiltinSkinId = 'wechat' | 'feishu' | 'dingtalk';

export interface SkinTokens {
  '--color-accent': string;
  '--color-accent-soft': string;
}

export interface SkinDefinition {
  id: BuiltinSkinId;
  name: string;
  tokens: SkinTokens;
}
