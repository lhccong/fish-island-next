import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { ArrowDown } from 'lucide-react';
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
import { useMessageLocation } from './use-message-location';
import { useMessageViewport } from './use-message-viewport';
import {
  captureReadingAnchor,
  readingAnchorOffset,
  scrollToLatest,
  type MessageReadingAnchor,
} from './message-scroll-position';

const key = (_index: number, id: string) => id;
const listComponents = { Header: HistoryBoundary };
interface RowContext {
  showAvatars: boolean;
  showAvatarFrames: boolean;
  presentation: ChatPresentation;
  firstItemIndex: number;
  compactWorksheet: boolean;
}
const row = (index: number, id: string, context: RowContext) => (
  <MessageRow
    id={id}
    showAvatars={context.showAvatars}
    showAvatarFrames={context.showAvatarFrames}
    presentation={context.presentation}
    compactWorksheet={context.compactWorksheet}
    rowNumber={
      context.presentation === 'worksheet' ? index - context.firstItemIndex + 1 : undefined
    }
  />
);
export function MessageStream({
  presentation = 'conversation',
  compactWorksheet = false,
}: {
  presentation?: ChatPresentation;
  compactWorksheet?: boolean;
}) {
  const { controller, navigation, avatarPreference: avatars } = useChatRealtime();
  const ids = useStore(controller.store, (state) => state.visibleIds);
  const firstItemIndex = useStore(controller.store, (state) => state.viewFirstItemIndex);
  const initialized = useStore(controller.history.store, (state) => state.initialized);
  const rowContext = useMemo(
    () => ({
      showAvatars: avatars.showAvatars,
      showAvatarFrames: !avatars.hideAvatarFrames,
      presentation,
      firstItemIndex,
      compactWorksheet,
    }),
    [avatars.showAvatars, avatars.hideAvatarFrames, presentation, firstItemIndex, compactWorksheet],
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
  const atBottomRef = useRef(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const updateBottom = (bottom: boolean) => {
    atBottomRef.current = bottom;
    setAtBottom(bottom);
    if (bottom) setNewMessageCount(0);
  };
  useEffect(
    () =>
      controller.subscribeIncoming((message) => {
        if (
          !atBottomRef.current &&
          !message.delivery &&
          !controller.store.getState().blockedSenders.has(message.senderId)
        )
          setNewMessageCount((count) => count + 1);
      }),
    [controller],
  );
  const list = useRef<VirtuosoHandle>(null);
  const followingRef = useRef(true);
  const readingAnchor = useRef<MessageReadingAnchor | null>(null);
  const lastReadingAnchor = useRef<MessageReadingAnchor | null>(null);
  const shiftingWindow = useRef(false);
  const previousWindowIndex = useRef(firstItemIndex);
  const followFrame = useRef<number | undefined>(undefined);
  const setFollow = useCallback((value: boolean) => {
    readingAnchor.current = null;
    if (value) lastReadingAnchor.current = null;
    followingRef.current = value;
  }, []);
  const scrollingChanged = useCallback((scrolling: boolean) => {
    if (!scrolling) shiftingWindow.current = false;
  }, []);
  const followMeasuredHeight = useCallback(() => {
    if ((!followingRef.current && !readingAnchor.current) || followFrame.current !== undefined)
      return;
    followFrame.current = requestAnimationFrame(() => {
      followFrame.current = undefined;
      if (followingRef.current && viewport) {
        const state = controller.store.getState();
        const tail = state.visibleIds.at(-1);
        scrollToLatest(viewport, list.current, tail ? state.messages[tail]?.id : undefined);
      } else if (!followingRef.current && viewport && readingAnchor.current) {
        const offset = readingAnchorOffset(viewport, readingAnchor.current);
        if (Math.abs(offset) > 1) list.current?.scrollBy({ top: offset, behavior: 'auto' });
      }
    });
  }, [viewport, controller]);
  useLayoutEffect(() => {
    if (previousWindowIndex.current !== firstItemIndex) shiftingWindow.current = true;
    previousWindowIndex.current = firstItemIndex;
    followMeasuredHeight();
  }, [ids, firstItemIndex, followMeasuredHeight]);
  useMessageViewport(viewport, followMeasuredHeight, followFrame);
  useMessageLocation(viewport, list, setFollow);
  useEffect(() => {
    const unsubscribe = controller.store.subscribe((state, previous) => {
      if (state.firstItemIndex > previous.firstItemIndex && !followingRef.current && viewport)
        readingAnchor.current ??= lastReadingAnchor.current ?? captureReadingAnchor(viewport);
      if (
        state.ids.some((id) => !previous.messages[id] && state.messages[id]?.delivery === 'sending')
      ) {
        setFollow(true);
        followMeasuredHeight();
      }
    });
    return unsubscribe;
  }, [controller, setFollow, followMeasuredHeight, viewport]);
  useLayoutEffect(() => {
    if (!viewport) return;
    let previousTop = viewport.scrollTop;
    let previousHeight = viewport.scrollHeight;
    let previousClientHeight = viewport.clientHeight;
    let previousFirstItemIndex = controller.store.getState().viewFirstItemIndex;
    let touching = false;
    let touchTop = 0;
    let followedBeforeTouch = false;
    const startTouch = () => {
      touching = true;
      touchTop = viewport.scrollTop;
      followedBeforeTouch = followingRef.current;
      setFollow(false);
    };
    const endTouch = () => {
      touching = false;
      if (
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= 1 ||
        (followedBeforeTouch && Math.abs(viewport.scrollTop - touchTop) <= 1)
      )
        setFollow(true);
    };
    const wheel = (event: WheelEvent) => {
      if (event.deltaY < 0) setFollow(false);
      else if (event.deltaY > 0) readingAnchor.current = null;
    };
    const keyDown = (event: KeyboardEvent) => {
      if (['ArrowUp', 'PageUp', 'Home'].includes(event.key)) setFollow(false);
      else if (['ArrowDown', 'PageDown', 'End'].includes(event.key)) readingAnchor.current = null;
    };
    const pointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest('button[aria-expanded]:not([aria-haspopup])')
      ) {
        readingAnchor.current = null;
        shiftingWindow.current = true;
      }
      if (event.target instanceof Element && event.target.closest('[data-orientation="vertical"]'))
        setFollow(false);
    };
    const trackPosition = () => {
      const top = viewport.scrollTop;
      const height = viewport.scrollHeight;
      const clientHeight = viewport.clientHeight;
      const resized = height !== previousHeight || clientHeight !== previousClientHeight;
      const currentFirstItemIndex = controller.store.getState().viewFirstItemIndex;
      const windowMoved = currentFirstItemIndex !== previousFirstItemIndex;
      if (top < previousTop && top === 0 && !resized && !windowMoved && !shiftingWindow.current)
        setFollow(false);
      else if (
        !touching &&
        !resized &&
        !shiftingWindow.current &&
        !readingAnchor.current &&
        top > previousTop &&
        height - top - clientHeight <= 64
      )
        setFollow(true);
      previousTop = top;
      previousHeight = height;
      previousClientHeight = clientHeight;
      previousFirstItemIndex = currentFirstItemIndex;
      if (!followingRef.current && !shiftingWindow.current && !windowMoved)
        lastReadingAnchor.current = captureReadingAnchor(viewport);
      if (
        (followingRef.current || readingAnchor.current) &&
        (resized || windowMoved || shiftingWindow.current)
      )
        followMeasuredHeight();
    };
    viewport.addEventListener('scroll', trackPosition);
    viewport.parentElement?.addEventListener('wheel', wheel, { passive: true });
    viewport.addEventListener('keydown', keyDown);
    viewport.parentElement?.addEventListener('pointerdown', pointerDown);
    viewport.addEventListener('touchstart', startTouch, { passive: true });
    viewport.addEventListener('touchend', endTouch, { passive: true });
    viewport.addEventListener('touchcancel', endTouch, { passive: true });
    return () => {
      viewport.removeEventListener('scroll', trackPosition);
      viewport.parentElement?.removeEventListener('wheel', wheel);
      viewport.removeEventListener('keydown', keyDown);
      viewport.parentElement?.removeEventListener('pointerdown', pointerDown);
      viewport.removeEventListener('touchstart', startTouch);
      viewport.removeEventListener('touchend', endTouch);
      viewport.removeEventListener('touchcancel', endTouch);
    };
  }, [viewport, setFollow, controller, followMeasuredHeight]);
  return (
    <section className={styles.stream} aria-label="群聊实时消息" data-presentation={presentation}>
      <ConnectionStatus />
      {presentation === 'worksheet' && <WorksheetHeader compact={compactWorksheet} />}
      <div className={styles.list}>
        <ScrollArea
          label="群聊消息区"
          viewportRef={setViewport}
          gutter={compactWorksheet ? 'reserved' : 'overlay'}
        >
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
                // Dense worksheet rows use Virtuoso's frame scheduling to batch cell resizing.
                // Conversation/image rows retain synchronous anchor compensation (ADR-089).
                skipAnimationFrameInResizeObserver={!compactWorksheet}
                atBottomThreshold={1}
                atBottomStateChange={updateBottom}
                isScrolling={scrollingChanged}
                // Follow late row measurements through Virtuoso, preserving its anchor ownership.
                totalListHeightChanged={followMeasuredHeight}
                followOutput={false}
              />
            )
          )}
        </ScrollArea>
        {!atBottom && ids.length > 0 && (
          <div className={styles.latest}>
            <Button
              variant="secondary"
              className={styles.latestButton}
              aria-label="查看最新消息"
              title={newMessageCount > 0 ? `${newMessageCount} 条新消息，点击查看` : '查看最新消息'}
              onClick={() => {
                setFollow(true);
                followMeasuredHeight();
              }}
            >
              <ArrowDown size={18} aria-hidden="true" />
              {newMessageCount > 0 && (
                <span className={styles.latestBadge} aria-label={`${newMessageCount} 条新消息`}>
                  {newMessageCount > 99 ? '99+' : newMessageCount}
                </span>
              )}
            </Button>
          </div>
        )}
      </div>
      <div className={styles.streamFooter}>
        <MessageNavigationNotice />
      </div>
    </section>
  );
}
