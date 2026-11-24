import { useEffect } from 'react';
import { BrowserRouter } from 'react-router';
import { WebsiteSettingsProvider } from '@/app/providers/WebsiteSettingsProvider';
import { SkinProvider } from '@/app/providers/SkinProvider';
import { AuthProvider } from '@/features/auth';
import { authController } from '@/app/config/auth';
import { AppRoutes } from '@/app/AppRoutes';
import { ChatConnectionProvider } from '@/app/providers/ChatConnectionProvider';
import { NotificationSessionProvider } from '@/app/providers/NotificationSessionProvider';
import { SignInSessionProvider } from '@/app/providers/SignInSessionProvider';
import { PageFooterProvider } from '@/shared/ui/PageFooter';
import { trackFocusInput } from '@/shared/ui/FocusOutline';
import { SiteFooter } from '@/app/components/SiteFooter';
import { BroadcastSession } from '@/app/components/BroadcastSession';
import { MobileViewport } from '@/app/components/MobileViewport';

export function App() {
  useEffect(() => trackFocusInput(document), []);
  return (
    <BrowserRouter>
      <MobileViewport />
      <WebsiteSettingsProvider />
      <AuthProvider controller={authController}>
        <ChatConnectionProvider>
          <SkinProvider>
            <BroadcastSession />
            <NotificationSessionProvider>
              <SignInSessionProvider>
                <PageFooterProvider footer={<SiteFooter />}>
                  <AppRoutes />
                </PageFooterProvider>
              </SignInSessionProvider>
            </NotificationSessionProvider>
          </SkinProvider>
        </ChatConnectionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
