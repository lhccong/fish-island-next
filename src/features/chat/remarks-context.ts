import { createContext, useContext, type RefObject } from 'react';
import { useStore } from 'zustand';
import type { RemarksController } from './remarks-controller';

export interface RemarkTarget {
  id: string;
  name: string;
  returnFocusRef: RefObject<HTMLElement | null>;
}
export const RemarksContext = createContext<{
  controller: RemarksController;
  open: (target: RemarkTarget) => void;
} | null>(null);
export function useRemarks() {
  const context = useContext(RemarksContext);
  if (!context) throw new Error('缺少备注上下文');
  return context;
}
export function useRemark(id: string) {
  const { controller } = useRemarks();
  return useStore(controller.store, (state) =>
    Object.hasOwn(state.remarks, id) ? state.remarks[id] : undefined,
  );
}
