import { create } from 'zustand';

export const defaultTabIdentity = { name: '摸鱼岛', icon: '/favicon.ico?v=moyudao-2' };
export const tabIdentityStorageKey = 'fish-island:tab-identity';
export const defaultFontScale = '100';
export const fontScaleOptions = [
  { value: '90', label: '较小（90%）' },
  { value: defaultFontScale, label: '标准（100%）' },
  { value: '110', label: '较大（110%）' },
  { value: '120', label: '特大（120%）' },
] as const;
type FontScale = (typeof fontScaleOptions)[number]['value'];

export interface TabIdentity {
  name: string;
  icon: string;
}

export const tabIdentityPresets: readonly TabIdentity[] = [
  defaultTabIdentity,
  { name: '百度', icon: '/tab-icons/baidu.ico' },
  { name: '必应', icon: '/tab-icons/bing.ico' },
  { name: '知乎', icon: '/tab-icons/zhihu.ico' },
];

export function isPresetTabIcon(value: string): boolean {
  return tabIdentityPresets.some(({ icon }) => icon === value);
}

export function isTabIcon(value: string): boolean {
  if (isPresetTabIcon(value)) return true;
  if (
    /^data:image\/(png|jpeg|webp|x-icon|vnd.microsoft.icon);base64,[A-Za-z0-9+/]+=*$/.test(value)
  ) {
    return value.length <= 350000;
  }
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && value.length <= 2048;
  } catch {
    return false;
  }
}

export function normalizeTabIdentity(value: unknown): TabIdentity | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<TabIdentity>;
  if (typeof item.name !== 'string' || typeof item.icon !== 'string') return null;
  const name = item.name.trim();
  const storedIcon = item.icon.trim();
  const icon = storedIcon === '/favicon.ico?v=moyudao' ? defaultTabIdentity.icon : storedIcon;
  return name && name.length <= 60 && isTabIcon(icon) ? { name, icon } : null;
}

export function isFontScale(value: unknown): value is FontScale {
  return fontScaleOptions.some((option) => option.value === value);
}

interface WebsitePreferences {
  identity: TabIdentity;
  fontScale: FontScale;
}

function readPreferences(): WebsitePreferences {
  const defaults: WebsitePreferences = {
    identity: defaultTabIdentity,
    fontScale: defaultFontScale,
  };
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(tabIdentityStorageKey) ?? 'null');
    if (!stored || typeof stored !== 'object') return defaults;
    return {
      identity: normalizeTabIdentity(stored) ?? defaultTabIdentity,
      fontScale:
        'fontScale' in stored && isFontScale(stored.fontScale)
          ? stored.fontScale
          : defaultFontScale,
    };
  } catch {
    return defaults;
  }
}

interface WebsiteSettingsState extends WebsitePreferences {
  save: (identity: TabIdentity, fontScale: FontScale) => void;
}

export const useWebsiteSettingsStore = create<WebsiteSettingsState>((set) => ({
  ...readPreferences(),
  save: (value, fontScale) => {
    const identity = normalizeTabIdentity(value);
    if (!identity)
      throw new Error('请输入 1～60 字的网站名称和有效的 HTTPS 图标地址，或选择本地图片。');
    try {
      localStorage.setItem(tabIdentityStorageKey, JSON.stringify({ ...identity, fontScale }));
    } catch {
      throw new Error('本地保存失败，请检查浏览器存储权限或释放空间后重试。');
    }
    set((state) => ({
      identity:
        identity.name === state.identity.name && identity.icon === state.identity.icon
          ? state.identity
          : identity,
      fontScale,
    }));
  },
}));
