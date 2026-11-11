import { useEffect, type ReactNode } from 'react';
import type { AuthController } from './model/auth-controller';
import { AuthContext } from './context';

export function AuthProvider({
  controller,
  children,
}: {
  controller: AuthController;
  children: ReactNode;
}) {
  useEffect(() => {
    void controller.restore();
    return controller.subscribe(() => {
      void controller.restore(true);
    });
  }, [controller]);
  return <AuthContext.Provider value={controller}>{children}</AuthContext.Provider>;
}
