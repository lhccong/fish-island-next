export interface UserCard {
  id: string;
  name: string;
  avatar: string | null;
  frame: string | null;
  cover: string | null;
  profile: string;
  level: number | undefined;
  followers: number | undefined;
  following: number | undefined;
  region: string;
  vip: boolean;
  admin: boolean;
  titleId: string | undefined;
}
export interface UserMute {
  muted: boolean;
  remaining: string;
}
export interface UserCardPort {
  userCard(id: string, signal: AbortSignal): Promise<UserCard | null>;
  followingState(id: string, signal: AbortSignal): Promise<boolean>;
  toggleFollow(id: string, signal: AbortSignal): Promise<boolean>;
  muteInfo(id: string, signal: AbortSignal): Promise<UserMute>;
  mute(id: string, duration: number | null, signal: AbortSignal): Promise<void>;
}
