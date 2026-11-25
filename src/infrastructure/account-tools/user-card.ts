import type { UserCard } from '@/domain/account-tools';
import { readMbti } from '@/domain/auth';
import { decodeTitleId, decodeTitleIds } from '@/domain/chat';

export function readNonNegativeInteger(raw: unknown): number | undefined {
  const value = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : raw;
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

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
  return {
    id: String(v.id),
    name: text('userName') || '岛友',
    avatar: image('userAvatar'),
    frame: image('avatarFramerUrl'),
    cover: image('momentsBgUrl'),
    profile: text('userProfile'),
    mbti: readMbti(v.mbti),
    level: readNonNegativeInteger(v.level),
    followers: readNonNegativeInteger(v.followerCount),
    following: readNonNegativeInteger(v.followingCount),
    region: [text('country').trim(), text('region').trim()].filter(Boolean).join(' · '),
    vip: v.vip === true || v.isVip === true,
    admin: v.userRole === 'admin' || v.isAdmin === true,
    titleId: decodeTitleId(v.titleId),
    titleIds: decodeTitleIds(v.titleIdList),
  };
}
