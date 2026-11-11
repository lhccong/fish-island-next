import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '@/features/auth';
import { SsoAuthorization } from '@/features/sso';
import { ssoService } from '@/app/config/sso';

export function SsoAuthorizePage() {
  const [params] = useSearchParams();
  const { session, restore } = useAuth();
  const navigate = useNavigate();
  const expired = useCallback(() => {
    void restore();
  }, [restore]);
  if (session.status !== 'authenticated') return null;
  return (
    <SsoAuthorization
      key={params.toString()}
      request={{
        clientId: params.get('client_id') || '',
        redirectUri: params.get('redirect_uri') || '',
        responseType: params.get('response_type') || 'code',
        scope: params.get('scope') || 'read',
        state: params.get('state') || '',
      }}
      user={session.user}
      service={ssoService}
      onExpired={expired}
      onAllow={(url) => window.location.assign(url)}
      onDeny={() => navigate('/')}
    />
  );
}
