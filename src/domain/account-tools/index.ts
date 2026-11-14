export interface DeveloperApp {
  id: string;
  appName: string;
  appDesc: string;
  appWebsite: string;
  redirectUri: string;
  clientId: string;
  status: number;
}
export type AppInput = Pick<DeveloperApp, 'appName' | 'appDesc' | 'appWebsite' | 'redirectUri' | 'status'>;
export interface AccountToolsPort {
  sendCode(email: string, signal: AbortSignal): Promise<void>;
  resetPassword(values: { email: string; code: string; userPassword: string; checkPassword: string }, signal: AbortSignal): Promise<void>;
  redeem(code: string, signal: AbortSignal): Promise<string>;
  apps(signal: AbortSignal): Promise<DeveloperApp[]>;
  saveApp(values: AppInput, id: string | null, signal: AbortSignal): Promise<void>;
  deleteApp(id: string, signal: AbortSignal): Promise<void>;
  secret(id: string, reset: boolean, signal: AbortSignal): Promise<string>;
}
export interface BlockedUser { id: string; name: string; avatar?: string | undefined }
export interface BlacklistPort {
  read(account: string): readonly BlockedUser[];
  write(account: string, users: readonly BlockedUser[]): void;
  subscribe(listener: () => void): () => void;
}
export function safeRedirect(value: string): boolean {
  try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
}
