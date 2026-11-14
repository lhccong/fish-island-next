import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Button } from '@/shared/ui/Button';
import { useChatRealtime } from './realtime-context';
import { MessageNavigationNotice } from './MessageNavigationNotice';
import { MessageRow } from './MessageRow';
import { ConnectionStatus } from './ConnectionStatus';
import { HistoryBoundary } from './HistoryBoundary';
import styles from './MessageStream.module.css';
import { WorksheetHeader } from './WorksheetHeader';
import type { ChatPresentation } from './chat-presentation';

const key = (_index: number, id: string) => id;
const listComponents = { Header: HistoryBoundary };
interface RowContext {
  showAvatars: boolean;
  presentation: ChatPresentation;
  firstItemIndex: number;
}
const row = (index: number, id: string, context: RowContext) => (
  <MessageRow
    id={id}
    showAvatars={context.showAvatars}
    presentation={context.presentation}
    rowNumber={
      context.presentation === 'worksheet' ? index - context.firstItemIndex + 1 : undefined
    }
  />
);
export function MessageStream({
  presentation = 'conversation',
}: {
  presentation?: ChatPresentation;
}) {
  const { controller, navigation, avatarPreference: avatars } = useChatRealtime();
  const ids = useStore(controller.store, (state) => state.visibleIds);
  const target = useStore(navigation.store, (state) => state.target);
  const revision = useStore(navigation.store, (state) => state.revision);
  const firstItemIndex = useStore(controller.store, (state) => state.viewFirstItemIndex);
  const initialized = useStore(controller.history.store, (state) => state.initialized);
  const rowContext = useMemo(
    () => ({ showAvatars: avatars.showAvatars, presentation, firstItemIndex }),
    [avatars.showAvatars, presentation, firstItemIndex],
  );
  useEffect(() => {
    const deactivate = controller.history.activate();
    const retry = setTimeout(() => controller.retry(), 0);
    return () => {
      clearTimeout(retry);
      navigation.cancel();
      deactivate();
    };
  }, [controller, navigation]);
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const list = useRef<VirtuosoHandle>(null);
  const [following, setFollow] = useState(true);
  useEffect(() => {
    if (!target || !viewport) return;
    const state = controller.store.getState();
    const index = state.visibleIds.indexOf(target);
    if (index < 0) return;
    const frame = requestAnimationFrame(() => {
      setFollow(false);
      list.current?.scrollToIndex({
        index,
        align: 'center',
        behavior: 'auto',
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [target, revision, controller, viewport, setFollow]);
  useEffect(() => {
    let frame: number | undefined;
    const unsubscribe = controller.store.subscribe((state, previous) => {
      if (
        state.ids.some((id) => !previous.messages[id] && state.messages[id]?.delivery === 'sending')
      ) {
        setFollow(true);
        if (frame !== undefined) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() =>
          list.current?.scrollToIndex({ index: 'LAST', align: 'end' }),
        );
      }
    });
    return () => {
      unsubscribe();
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [controller, setFollow]);
  useLayoutEffect(() => {
    if (!viewport) return;
    let previousTop = viewport.scrollTop;
    let previousHeight = viewport.scrollHeight;
    let previousClientHeight = viewport.clientHeight;
    const trackPosition = () => {
      const top = viewport.scrollTop;
      const height = viewport.scrollHeight;
      const clientHeight = viewport.clientHeight;
      const resized = height !== previousHeight || clientHeight !== previousClientHeight;
      if (height - top - clientHeight <= 64) setFollow(true);
      else if (top < previousTop && (!resized || top === 0)) setFollow(false);
      previousTop = top;
      previousHeight = height;
      previousClientHeight = clientHeight;
    };
    viewport.addEventListener('scroll', trackPosition);
    return () => viewport.removeEventListener('scroll', trackPosition);
  }, [viewport, setFollow]);
  return (
    <section className={styles.stream} aria-label="群聊实时消息" data-presentation={presentation}>
      <ConnectionStatus />
      {presentation === 'worksheet' && <WorksheetHeader />}
      <div className={styles.list}>
        <ScrollArea label="群聊消息区" viewportRef={setViewport}>
          {ids.length === 0 ? (
            <>
              <HistoryBoundary />
              {initialized && <p className={styles.empty}>暂无消息，连接后将在这里接收新消息</p>}
            </>
          ) : (
            viewport && (
              <Virtuoso
                ref={list}
                customScrollParent={viewport}
                data={ids}
                firstItemIndex={firstItemIndex}
                initialTopMostItemIndex={{ index: 'LAST', align: 'end' }}
                components={listComponents}
                context={rowContext}
                computeItemKey={key}
                itemContent={row}
                atBottomThreshold={64}
                atBottomStateChange={setAtBottom}
                // Let Virtuoso coordinate measurement and scrolling; external resize writes
                // race its anchor compensation when the bounded message window advances.
                followOutput={following ? 'auto' : false}
              />
            )
          )}
        </ScrollArea>
      </div>
      <div className={styles.streamFooter}>
        <MessageNavigationNotice />
        {!atBottom && ids.length > 0 && (
          <div className={styles.latest}>
            <Button
              variant="secondary"
              onClick={() => {
                setFollow(true);
                list.current?.scrollToIndex({ index: 'LAST', align: 'end', behavior: 'auto' });
              }}
            >
              查看最新消息
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
