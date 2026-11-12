export interface AuthUser {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  profile?: string;
  coverUrl?: string;
  email?: string;
  titleId?: string;
  vip?: boolean;
  createdAt?: string;
}
export interface ProfileTitle {
  id: string;
  name: string;
}
export interface Membership {
  type: number;
  permanent: boolean;
  expiresAt: string;
  expired: boolean;
}
export interface ProfileUpdate {
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
export interface AuthResult {
  user: AuthUser;
  token: SessionToken;
}
export interface AuthPort {
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
