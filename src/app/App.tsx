import { BrowserRouter } from 'react-router';
import { TabIdentityProvider } from '@/app/providers/TabIdentityProvider';
import { SkinProvider } from '@/app/providers/SkinProvider';
import { AuthProvider } from '@/features/auth';
import { authController } from '@/app/config/auth';
import { AppRoutes } from '@/app/AppRoutes';
import { ChatConnectionProvider } from '@/app/providers/ChatConnectionProvider';
import { NotificationSessionProvider } from '@/app/providers/NotificationSessionProvider';
import { SignInSessionProvider } from '@/app/providers/SignInSessionProvider';
import { PageFooterProvider } from '@/shared/ui/PageFooter';
import { SiteFooter } from '@/app/components/SiteFooter';
import { BroadcastSession } from '@/app/components/BroadcastSession';
import { MobileViewport } from '@/app/components/MobileViewport';

export function App() {
  return (
    <BrowserRouter>
      <MobileViewport />
      <TabIdentityProvider />
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
