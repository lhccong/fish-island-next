export interface AuthUser {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
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
