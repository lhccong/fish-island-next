import { BrowserRouter } from 'react-router';
import { SkinProvider } from '@/app/providers/SkinProvider';
import { AuthProvider } from '@/features/auth';
import { authController } from '@/app/config/auth';
import { AppRoutes } from '@/app/AppRoutes';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider controller={authController}>
        <SkinProvider>
          <AppRoutes />
        </SkinProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
