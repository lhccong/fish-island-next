import { useEffect, useState, type ReactNode } from 'react';
import type { IslandPreferencesPort } from '@/domain/my-island';
import { createIslandController } from './controller';
import { IslandContext } from './context';
export function MyIslandProvider({
  preferences,
  accountId,
  children,
}: {
  preferences: IslandPreferencesPort;
  accountId: string;
  children: ReactNode;
}) {
  const [controller] = useState(() => createIslandController(preferences, accountId));
  useEffect(() => {
    const flushWhenHidden = () => {
      if (document.hidden) controller.flush();
    };
    window.addEventListener('pagehide', controller.flush);
    document.addEventListener('visibilitychange', flushWhenHidden);
    return () => {
      window.removeEventListener('pagehide', controller.flush);
      document.removeEventListener('visibilitychange', flushWhenHidden);
      controller.dispose();
    };
  }, [controller]);
  return <IslandContext.Provider value={controller}>{children}</IslandContext.Provider>;
}
