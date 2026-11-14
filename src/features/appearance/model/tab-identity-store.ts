import { create } from 'zustand';

export const defaultTabIdentity = { name: '摸鱼岛', icon: '/favicon.ico?v=moyudao' };
export const tabIdentityStorageKey = 'fish-island:tab-identity';
export interface TabIdentity {
  name: string;
  icon: string;
}

export function isTabIcon(value: string): boolean {
  if (value === defaultTabIdentity.icon) return true;
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
  const icon = item.icon.trim();
  return name && name.length <= 60 && isTabIcon(icon) ? { name, icon } : null;
}

function readIdentity(): TabIdentity {
  try {
    return (
      normalizeTabIdentity(JSON.parse(localStorage.getItem(tabIdentityStorageKey) ?? 'null')) ??
      defaultTabIdentity
    );
  } catch {
    return defaultTabIdentity;
  }
}

interface TabIdentityState {
  identity: TabIdentity;
  save: (identity: TabIdentity) => void;
}

export const useTabIdentityStore = create<TabIdentityState>((set) => ({
  identity: readIdentity(),
  save: (value) => {
    const identity = normalizeTabIdentity(value);
    if (!identity)
      throw new Error('请输入 1～60 字的网站名称和有效的 HTTPS 图标地址，或选择本地图片。');
    try {
      localStorage.setItem(tabIdentityStorageKey, JSON.stringify(identity));
    } catch {
      throw new Error('本地保存失败，请检查浏览器存储权限或释放空间后重试。');
    }
    set({ identity });
  },
}));
