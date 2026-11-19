import type { UserCard } from '@/domain/account-tools';

export function decodeUserCard(value: unknown): UserCard | null {
  if (value === null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('用户资料格式不正确');
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string' && typeof v.id !== 'number') throw new Error('用户资料缺少编号');
  const text = (key: string) => (typeof v[key] === 'string' ? (v[key] as string) : '');
  const image = (key: string) => {
    const url = text(key);
    return /^https?:\/\//i.test(url) ? url : null;
  };
  const number = (key: string) => {
    const raw = v[key];
    const value =
      typeof raw === 'number'
        ? raw
        : typeof raw === 'string' && /^\d+$/.test(raw)
          ? Number(raw)
          : NaN;
    return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
  };
  return {
    id: String(v.id),
    name: text('userName') || '岛友',
    avatar: image('userAvatar'),
    frame: image('avatarFramerUrl'),
    cover: image('momentsBgUrl'),
    profile: text('userProfile'),
    level: number('level'),
    followers: number('followerCount'),
    following: number('followingCount'),
    region: [text('country').trim(), text('region').trim()].filter(Boolean).join(' · '),
    vip: v.vip === true || v.isVip === true,
    admin: v.userRole === 'admin' || v.isAdmin === true,
    titleId: typeof v.titleId === 'number' ? String(v.titleId) : text('titleId') || undefined,
  };
}
