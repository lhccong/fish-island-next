import { useStore } from 'zustand';
import type { ReaderController, ReaderState } from './controller';
export function useReader<T>(controller: ReaderController, selector: (state: ReaderState) => T) {
  return useStore(controller, selector);
}
