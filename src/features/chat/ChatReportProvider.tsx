import { useState, type ReactNode } from 'react';
import type { ChatReportPort } from '@/domain/chat';
import { ChatReportContext, type ReportTarget } from './report-context';
import { MessageReportDialog } from './MessageReportDialog';

export function ChatReportProvider({
  port,
  children,
}: {
  port: ChatReportPort;
  children: ReactNode;
}) {
  const [target, setTarget] = useState<ReportTarget | null>(null);
  return (
    <ChatReportContext.Provider value={setTarget}>
      {children}
      {target && (
        <MessageReportDialog port={port} target={target} onClose={() => setTarget(null)} />
      )}
    </ChatReportContext.Provider>
  );
}
