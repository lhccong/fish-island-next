export const mbtiTypes = [
  'ISTJ',
  'ISFJ',
  'INFJ',
  'INTJ',
  'ISTP',
  'ISFP',
  'INFP',
  'INTP',
  'ESTP',
  'ESFP',
  'ENFP',
  'ENTP',
  'ESTJ',
  'ESFJ',
  'ENFJ',
  'ENTJ',
] as const;
export type Mbti = (typeof mbtiTypes)[number];

export function readMbti(value: unknown): Mbti | '' {
  return mbtiTypes.find((type) => type === value) ?? '';
}

export interface AuthUser {
  id: string;
  name: string;
  avatarUrl: string | null;
  avatarFrameUrl?: string;
  points?: number;
  usedPoints?: number;
  role: string;
  profile?: string;
  mbti?: Mbti | '';
  pokeSuffix?: string;
  coverUrl?: string;
  email?: string;
  titleId?: string;
  vip?: boolean;
  createdAt?: string;
  /** null means available now; undefined means the server did not provide a valid status. */
  nextRenameAt?: string | null | undefined;
}
export interface ProfileTitle {
  id: string;
  name: string;
}
export interface AvatarFrame {
  id: string;
  name: string;
  url: string;
  points: number;
  owned: boolean;
}
export interface Membership {
  type: number;
  permanent: boolean;
  expiresAt: string;
  expired: boolean;
}
export interface ProfileUpdate {
  pokeSuffix?: string;
  mbti?: Mbti | '';
  name: string;
  avatarUrl: string;
  coverUrl: string;
  profile: string;
}
export interface SessionToken {
  name: string;
  value: string;
}
export interface LoginCredentials {
  account: string;
  password: string;
}
export interface RegistrationValues {
  account: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  code: string;
  inviteCode?: string;
}
export const invitationCodePattern = /^(?:[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}|[0-9A-F]{16})$/i;
export interface AuthResult {
  user: AuthUser;
  token: SessionToken;
}
export interface AuthPort {
  invitation(token: SessionToken, signal: AbortSignal): Promise<string>;
  register(values: RegistrationValues, signal: AbortSignal): Promise<void>;
  sendRegistrationCode(email: string, signal: AbortSignal): Promise<void>;
  avatarFrames(
    page: number,
    token: SessionToken,
    signal: AbortSignal,
  ): Promise<{ items: AvatarFrame[]; total: number }>;
  exchangeAvatarFrame(id: string, token: SessionToken, signal: AbortSignal): Promise<void>;
  setAvatarFrame(id: string, token: SessionToken, signal: AbortSignal): Promise<void>;
  login(credentials: LoginCredentials, signal: AbortSignal): Promise<AuthResult>;
  current(token: SessionToken, signal: AbortSignal): Promise<AuthUser>;
  logout(token: SessionToken, signal: AbortSignal): Promise<void>;
  updateProfile(values: ProfileUpdate, token: SessionToken, signal: AbortSignal): Promise<void>;
  uploadProfileImage(file: File, token: SessionToken, signal: AbortSignal): Promise<string>;
  titles(token: SessionToken, signal: AbortSignal): Promise<ProfileTitle[]>;
  membership(token: SessionToken, signal: AbortSignal): Promise<Membership | null>;
  setTitle(id: string, token: SessionToken, signal: AbortSignal): Promise<void>;
  sendEmailCode(email: string, token: SessionToken, signal: AbortSignal): Promise<void>;
  bindEmail(email: string, code: string, token: SessionToken, signal: AbortSignal): Promise<void>;
}
export interface SessionVault {
  read(): SessionToken | null;
  write(token: SessionToken, remember: boolean): void;
  clear(): void;
  subscribe(listener: () => void): () => void;
}
export class AuthError extends Error {
  readonly kind: 'unauthorized' | 'network' | 'invalid-response' | 'rejected';
  constructor(kind: AuthError['kind'], message: string) {
    super(message);
    this.kind = kind;
    this.name = 'AuthError';
  }
}
