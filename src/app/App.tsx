import { BrowserRouter } from 'react-router';
import { TabIdentityProvider } from '@/app/providers/TabIdentityProvider';
import { SkinProvider } from '@/app/providers/SkinProvider';
import { AuthProvider } from '@/features/auth';
import { authController } from '@/app/config/auth';
import { AppRoutes } from '@/app/AppRoutes';
import { ChatConnectionProvider } from '@/app/providers/ChatConnectionProvider';
import { NotificationSessionProvider } from '@/app/providers/NotificationSessionProvider';
import { SignInSessionProvider } from '@/app/providers/SignInSessionProvider';

export function App() {
  return (
    <BrowserRouter>
      <TabIdentityProvider />
      <AuthProvider controller={authController}>
        <ChatConnectionProvider>
          <SkinProvider>
            <NotificationSessionProvider>
              <SignInSessionProvider>
                <AppRoutes />
              </SignInSessionProvider>
            </NotificationSessionProvider>
          </SkinProvider>
        </ChatConnectionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
