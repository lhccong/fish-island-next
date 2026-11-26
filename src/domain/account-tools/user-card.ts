import type { Mbti } from '@/domain/auth';

export interface UserCard {
  id: string;
  name: string;
  avatar: string | null;
  frame: string | null;
  cover: string | null;
  profile: string;
  mbti?: Mbti | '';
  level: number | undefined;
  followers: number | undefined;
  following: number | undefined;
  region: string;
  vip: boolean;
  admin: boolean;
  titleId: string | undefined;
  titleIds: readonly string[] | undefined;
}
export interface UserMute {
  muted: boolean;
  remaining: string;
}
export interface FollowRelationship {
  following: boolean;
  followedBy?: boolean;
}
export interface UserCardPort {
  userCard(id: string, signal: AbortSignal): Promise<UserCard | null>;
  followRelationship(id: string, signal: AbortSignal): Promise<FollowRelationship>;
  addFollow(id: string, signal: AbortSignal): Promise<void>;
  toggleFollow(id: string, signal: AbortSignal): Promise<boolean>;
  muteInfo(id: string, signal: AbortSignal): Promise<UserMute>;
  mute(id: string, duration: number | null, signal: AbortSignal): Promise<void>;
}
