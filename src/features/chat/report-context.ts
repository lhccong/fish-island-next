import { createContext, useContext, type RefObject } from 'react';

export interface ReportTarget {
  id: string;
  senderId: string;
  returnFocusRef: RefObject<HTMLElement | null>;
}
export const ChatReportContext = createContext<(target: ReportTarget) => void>(() => {});
export const useChatReport = () => useContext(ChatReportContext);
