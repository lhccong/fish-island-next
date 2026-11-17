import { useEffect, type RefObject } from 'react';
import { useStore } from 'zustand';
import type { VirtuosoHandle } from 'react-virtuoso';
import { useChatRealtime } from './realtime-context';

export function useMessageLocation(
  viewport: HTMLDivElement | null,
  list: RefObject<VirtuosoHandle | null>,
  setFollowing: (following: boolean) => void,
) {
  const { controller, navigation } = useChatRealtime();
  const target = useStore(navigation.store, (state) => state.target);
  const revision = useStore(navigation.store, (state) => state.revision);
  useEffect(() => {
    if (!target || !viewport) return;
    const index = controller.store.getState().visibleIds.indexOf(target);
    if (index < 0) return;
    const frame = requestAnimationFrame(() => {
      setFollowing(false);
      list.current?.scrollToIndex({ index, align: 'center', behavior: 'auto' });
    });
    return () => cancelAnimationFrame(frame);
  }, [target, revision, controller, viewport, list, setFollowing]);
}
