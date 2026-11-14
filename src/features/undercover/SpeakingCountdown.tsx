import { useEffect, useState } from 'react';
import type { UndercoverRealtimePort } from '@/domain/undercover';
export function SpeakingCountdown({
  realtime,
  roomId,
}: {
  realtime: UndercoverRealtimePort;
  roomId: string;
}) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = realtime.subscribe((event) => {
      if (event.type === 'countdown' && event.roomId === roomId) {
        clearInterval(timer);
        const end = Date.now() + event.seconds * 1000;
        setSeconds(event.seconds);
        timer = setInterval(() => {
          const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));
          setSeconds(remaining);
          if (!remaining) clearInterval(timer);
        }, 1000);
      }
      if (event.type === 'connection' && !event.connected) {
        clearInterval(timer);
        setSeconds(0);
      }
    });
    return () => {
      stop();
      clearInterval(timer);
    };
  }, [realtime, roomId]);
  return seconds > 0 ? <p>轮到你发言 · 剩余 {seconds} 秒</p> : null;
}
