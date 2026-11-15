export type BuiltinSkinId = 'wechat' | 'wecom' | 'feishu' | 'dingtalk' | 'wps' | 'pixel-island';

// Trusted built-in presentation overrides; never part of the import whitelist.
export type SkinPresentationTokens = Partial<
  Record<
    | '--color-text'
    | '--color-muted'
    | '--color-border'
    | '--color-divider'
    | '--color-rail-text'
    | '--color-rail-highlight'
    | '--color-scrollbar'
    | '--color-scrollbar-hover'
    | '--color-message-surface'
    | '--radius-control'
    | '--radius-panel'
    | '--shadow-panel',
    string
  >
>;

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
