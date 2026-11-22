import type { DrawRealtimePort, DrawMessage } from '@/domain/draw';
import { record, id, text } from './decode';
export function createDrawChannel() {
  const listeners = new Set<(roomId: string | null) => void>();
  const messages = new Set<(message: DrawMessage) => void>();
  const port: DrawRealtimePort = {
    messages(listener) {
      messages.add(listener);
      return () => {
        messages.delete(listener);
      };
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  return {
    port,
    connection(state: string) {
      if (state === 'connected') listeners.forEach((listener) => listener(null));
    },
    receive(raw: unknown) {
      try {
        if (typeof raw === 'string' && raw.length > 262144) return;
        const frame = record(typeof raw === 'string' ? JSON.parse(raw) : raw);
        let roomId: string | null = null;
        if (frame.type === 'refreshDraw' || frame.type === 'clearDraw') {
          if (typeof frame.data === 'string') roomId = id(frame.data);
        } else if (frame.type === 'draw') {
          const data = record(record(frame.data).message);
          roomId = id(data.roomId);
          const sender = record(data.sender);
          const time =
            typeof data.timestamp === 'number' ? data.timestamp : Date.parse(text(data.timestamp));
          const content = text(data.content);
          if (!Number.isFinite(time) || !content || content.length > 10000) return;
          const message = {
            id: `${id(sender.id)}:${time}:${content}`,
            roomId,
            name: text(sender.name) || '系统',
            content,
          };
          messages.forEach((listener) => listener(message));
          return;
        } else if (frame.type !== 'refreshRoom' && frame.type !== 'gameStart') return;
        listeners.forEach((listener) => listener(roomId));
      } catch {
        /* 忽略其他游戏或无效事件。 */
      }
    },
  };
}
