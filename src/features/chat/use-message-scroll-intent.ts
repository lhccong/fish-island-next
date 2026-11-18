import { useLayoutEffect, type RefObject } from 'react';
import { useChatRealtime } from './realtime-context';
import { captureReadingAnchor, type MessageReadingAnchor } from './message-scroll-position';

interface ScrollIntent {
  following: RefObject<boolean>;
  downward: RefObject<boolean>;
  changing: RefObject<boolean>;
  reading: RefObject<MessageReadingAnchor | null>;
  lastReading: RefObject<MessageReadingAnchor | null>;
}

export function useMessageScrollIntent(
  viewport: HTMLDivElement | null,
  { following, downward, changing, reading, lastReading }: ScrollIntent,
  setFollowing: (following: boolean) => void,
  onLayoutChange: () => void,
  onPositionChange: () => void,
) {
  const { controller } = useChatRealtime();
  useLayoutEffect(() => {
    if (!viewport) return;
    const root = viewport.parentElement;
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
      followedBeforeTouch = following.current;
      setFollowing(false);
    };
    const endTouch = () => {
      touching = false;
      if (
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= 1 ||
        (followedBeforeTouch && Math.abs(viewport.scrollTop - touchTop) <= 1)
      )
        setFollowing(true);
    };
    const wheel = (event: WheelEvent) => {
      if (event.deltaY < 0) setFollowing(false);
      else if (event.deltaY > 0) {
        downward.current = true;
        reading.current = null;
        if (viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= 1)
          setFollowing(true);
      }
    };
    const keyDown = (event: KeyboardEvent) => {
      if (['ArrowUp', 'PageUp', 'Home'].includes(event.key)) setFollowing(false);
      else if (['ArrowDown', 'PageDown', 'End'].includes(event.key)) {
        downward.current = true;
        reading.current = null;
        if (event.key === 'End') {
          setFollowing(true);
          onLayoutChange();
        }
      }
    };
    const pointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest('button[aria-expanded]:not([aria-haspopup])')) {
        reading.current = null;
        changing.current = true;
      }
      if (event.target.closest('[data-orientation="vertical"]')) {
        setFollowing(false);
        downward.current = true;
      }
    };
    const trackPosition = () => {
      const top = viewport.scrollTop;
      const height = viewport.scrollHeight;
      const clientHeight = viewport.clientHeight;
      const resized = height !== previousHeight || clientHeight !== previousClientHeight;
      const currentFirstItemIndex = controller.store.getState().viewFirstItemIndex;
      const windowMoved = currentFirstItemIndex !== previousFirstItemIndex;
      if (!touching && downward.current && top > previousTop && height - top - clientHeight <= 64)
        setFollowing(true);
      previousTop = top;
      previousHeight = height;
      previousClientHeight = clientHeight;
      previousFirstItemIndex = currentFirstItemIndex;
      if (!following.current && !changing.current && !windowMoved)
        lastReading.current = captureReadingAnchor(viewport);
      if ((following.current || reading.current) && (resized || windowMoved || changing.current))
        onLayoutChange();
      onPositionChange();
    };
    viewport.addEventListener('scroll', trackPosition);
    root?.addEventListener('wheel', wheel, { passive: true });
    viewport.addEventListener('keydown', keyDown);
    root?.addEventListener('pointerdown', pointerDown);
    viewport.addEventListener('touchstart', startTouch, { passive: true });
    viewport.addEventListener('touchend', endTouch, { passive: true });
    viewport.addEventListener('touchcancel', endTouch, { passive: true });
    return () => {
      viewport.removeEventListener('scroll', trackPosition);
      root?.removeEventListener('wheel', wheel);
      viewport.removeEventListener('keydown', keyDown);
      root?.removeEventListener('pointerdown', pointerDown);
      viewport.removeEventListener('touchstart', startTouch);
      viewport.removeEventListener('touchend', endTouch);
      viewport.removeEventListener('touchcancel', endTouch);
    };
  }, [
    viewport,
    controller,
    following,
    downward,
    changing,
    reading,
    lastReading,
    setFollowing,
    onLayoutChange,
    onPositionChange,
  ]);
}
