import { useCallback, useEffect, useRef, useState } from 'react';
import type { DrawPort, DrawRealtimePort, DrawRoom, DrawGuess } from '@/domain/draw';
export function useDrawRoom(
  service: DrawPort,
  realtime: DrawRealtimePort,
  roomId: string | null,
  userId: string,
) {
  const [rooms, setRooms] = useState<DrawRoom[]>([]);
  const [room, setRoom] = useState<DrawRoom | null>(null);
  const [guesses, setGuesses] = useState<DrawGuess[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const reload = useRef<() => void>(() => {});
  const refresh = useCallback(() => reload.current(), []);
  useEffect(() => {
    const controller = new AbortController();

    let running = false;
    let queued = false;
    async function load() {
      if (running) {
        queued = true;
        return;
      }
      running = true;
      try {
        if (roomId) {
          const [next, records] = await Promise.all([
            service.room(roomId, controller.signal),
            service.guesses(roomId, controller.signal),
          ]);
          if (controller.signal.aborted) return;
          setRoom(next);
          setGuesses(records);
        } else {
          const next = await service.rooms(controller.signal);
          if (controller.signal.aborted) return;
          setRooms(next);
          setRoom(null);
          setGuesses([]);
        }
        setStatus('ready');
        setError('');
      } catch (e) {
        if (!controller.signal.aborted) {
          setStatus('error');
          setError(e instanceof Error ? e.message : '同步失败，请检查网络后重试');
        }
      } finally {
        running = false;
        if (queued && !controller.signal.aborted) {
          queued = false;
          void load();
        }
      }
    }
    if (!userId) return () => controller.abort();
    reload.current = () => void load();
    void load();
    const unsubscribe = realtime.subscribe((id) => {
      if (!id || !roomId || id === roomId) void load();
    });
    const visible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', visible);
    return () => {
      controller.abort();
      unsubscribe();
      document.removeEventListener('visibilitychange', visible);
    };
  }, [service, realtime, roomId, userId]);
  return { rooms, room, guesses, status, error, refresh };
}
