import { BrowserRouter } from 'react-router';
import { SkinProvider } from '@/app/providers/SkinProvider';
import { AuthProvider } from '@/features/auth';
import { authController } from '@/app/config/auth';
import { AppRoutes } from '@/app/AppRoutes';
import { ChatConnectionProvider } from '@/app/providers/ChatConnectionProvider';
import { NotificationSessionProvider } from '@/app/providers/NotificationSessionProvider';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider controller={authController}>
        <ChatConnectionProvider>
          <SkinProvider>
            <NotificationSessionProvider>
              <AppRoutes />
            </NotificationSessionProvider>
          </SkinProvider>
        </ChatConnectionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
