export interface AuthorizationRequest {
  clientId: string;
  redirectUri: string;
  responseType: string;
  scope: string;
  state: string;
}
export interface SsoApplication {
  name: string;
  website: string;
  description: string;
}
export interface SsoPort {
  application(clientId: string, signal: AbortSignal): Promise<SsoApplication | null>;
  authorize(request: AuthorizationRequest, signal: AbortSignal): Promise<string>;
}
