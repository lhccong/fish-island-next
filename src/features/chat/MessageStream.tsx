import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Button } from '@/shared/ui/Button';
import { useChatRealtime } from './realtime-context';
import { MessageRow } from './MessageRow';
import { ConnectionStatus } from './ConnectionStatus';
import { HistoryBoundary } from './HistoryBoundary';
import styles from './MessageStream.module.css';

const key = (_index: number, id: string) => id;
const listComponents = { Header: HistoryBoundary };
const row = (_index: number, id: string, showAvatars: boolean) => (
  <MessageRow id={id} showAvatars={showAvatars} />
);
export function MessageStream() {
  const { controller, avatarPreference: avatars } = useChatRealtime();
  const ids = useStore(controller.store, (state) => state.visibleIds);
  const firstItemIndex = useStore(controller.store, (state) => state.viewFirstItemIndex);
  const initialized = useStore(controller.history.store, (state) => state.initialized);
  useEffect(() => {
    const deactivate = controller.history.activate();
    const retry = setTimeout(() => controller.retry(), 0);
    return () => {
      clearTimeout(retry);
      deactivate();
    };
  }, [controller]);
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const list = useRef<VirtuosoHandle>(null);
  const follow = useRef(true);
  useEffect(() => {
    let frame: number | undefined;
    const unsubscribe = controller.store.subscribe((state, previous) => {
      if (
        state.ids.some((id) => !previous.messages[id] && state.messages[id]?.delivery === 'sending')
      ) {
        follow.current = true;
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
  }, [controller]);
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
      if (height - top - clientHeight <= 64) follow.current = true;
      else if (top < previousTop && (!resized || top === 0)) follow.current = false;
      previousTop = top;
      previousHeight = height;
      previousClientHeight = clientHeight;
    };
    viewport.addEventListener('scroll', trackPosition);
    let resizeFrame: number | undefined;
    const observer = new ResizeObserver(() => {
      if (resizeFrame !== undefined) cancelAnimationFrame(resizeFrame);
      // Apply scroll writes after measurement, including menu/composer size changes.
      resizeFrame = requestAnimationFrame(() => {
        trackPosition();
        if (follow.current) {
          viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'instant' });
          previousTop = viewport.scrollTop;
        }
      });
    });
    if (viewport.firstElementChild) observer.observe(viewport.firstElementChild);
    return () => {
      viewport.removeEventListener('scroll', trackPosition);
      observer.disconnect();
      if (resizeFrame !== undefined) cancelAnimationFrame(resizeFrame);
    };
  }, [viewport]);
  return (
    <section className={styles.stream} aria-label="群聊实时消息">
      <ConnectionStatus />
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
                context={avatars.showAvatars}
                computeItemKey={key}
                itemContent={row}
                atBottomThreshold={64}
                atBottomStateChange={setAtBottom}
                followOutput={false}
              />
            )
          )}
        </ScrollArea>
        {!atBottom && ids.length > 0 && (
          <div className={styles.latest}>
            <Button
              variant="secondary"
              onClick={() => {
                follow.current = true;
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
