export type { FollowRelationship, UserCard, UserCardPort, UserMute } from './user-card';
export type FollowKind = 'following' | 'followers';
export interface FollowListTarget {
  id: string;
  name: string;
  kind: FollowKind;
}
export interface DeveloperApp {
  id: string;
  appName: string;
  appDesc: string;
  appWebsite: string;
  redirectUri: string;
  clientId: string;
  status: number;
}
export { defaultSchedule, timeMinute, validSchedule, isWorkDay } from './work-time';
export type { WorkSchedule } from './work-time';
export { getHolidayCountdown } from './holiday';
export type { HolidayCountdown } from './holiday';
export type AppInput = Pick<
  DeveloperApp,
  'appName' | 'appDesc' | 'appWebsite' | 'redirectUri' | 'status'
>;
export interface AccountToolsPort {
  card(id: string, signal: AbortSignal): Promise<PersonalStats>;
  follows(
    kind: FollowKind,
    page: number,
    signal: AbortSignal,
    ownerId?: string,
  ): Promise<{ items: FollowUser[]; total: number }>;
  toggleFollow(id: string, signal: AbortSignal): Promise<boolean>;
  sendCode(email: string, signal: AbortSignal): Promise<void>;
  resetPassword(
    values: { email: string; code: string; userPassword: string; checkPassword: string },
    signal: AbortSignal,
  ): Promise<void>;
  redeem(code: string, signal: AbortSignal): Promise<string>;
  apps(signal: AbortSignal): Promise<DeveloperApp[]>;
  saveApp(values: AppInput, id: string | null, signal: AbortSignal): Promise<void>;
  deleteApp(id: string, signal: AbortSignal): Promise<void>;
  secret(id: string, reset: boolean, signal: AbortSignal): Promise<string>;
}
export interface PersonalStats {
  points: number | undefined;
  level: number | undefined;
  followers: number | undefined;
  following: number | undefined;
  region: string;
}
export interface FollowUser {
  id: string;
  name: string;
  profile: string;
  avatar: string;
  mutual: boolean;
}
export interface BlockedUser {
  id: string;
  name: string;
  avatar?: string | undefined;
}
export interface BlacklistPort {
  read(account: string): readonly BlockedUser[];
  write(account: string, users: readonly BlockedUser[]): void;
  subscribe(listener: () => void): () => void;
}

export function setUserBlocked(
  port: BlacklistPort,
  account: string,
  user: BlockedUser,
  blocked: boolean,
) {
  const users = port.read(account);
  if (users.some(({ id }) => id === user.id) === blocked) return;
  port.write(account, blocked ? [...users, user] : users.filter(({ id }) => id !== user.id));
}

export function safeRedirect(value: string): boolean {
  try {
    return ['https:', 'http:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
