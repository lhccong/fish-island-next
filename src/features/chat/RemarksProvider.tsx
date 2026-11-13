import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ChatRemarksPort } from '@/domain/chat';
import { createRemarksController } from './remarks-controller';
import { RemarksContext, type RemarkTarget } from './remarks-context';
import { RemarkEditor } from './RemarkEditor';

export function RemarksProvider({
  port,
  userId,
  children,
}: {
  port: ChatRemarksPort;
  userId: string;
  children: ReactNode;
}) {
  const controller = useMemo(() => createRemarksController(port), [port]);
  const [target, setTarget] = useState<RemarkTarget | null>(null);
  const context = useMemo(() => ({ controller, open: setTarget }), [controller]);
  useEffect(() => {
    if (userId) void controller.load();
    return () => controller.dispose();
  }, [controller, userId]);
  return (
    <RemarksContext.Provider value={context}>
      {children}
      {target && (
        <RemarkEditor target={target} controller={controller} onClose={() => setTarget(null)} />
      )}
    </RemarksContext.Provider>
  );
}
