import type { RoomMessage, UndercoverEvent, UndercoverRealtimePort } from '@/domain/undercover';
import { record, text, id } from './decode';
export function decodeUndercoverEvent(raw: unknown): UndercoverEvent | null {
  if (typeof raw === 'string' && raw.length > 262144) return null;
  try {
    const frame = record(typeof raw === 'string' ? JSON.parse(raw) : raw);
    if (frame.type === 'undercover') {
      const d = record(record(frame.data).message);
      const sender = record(d.sender);
      const time = typeof d.timestamp === 'number' ? d.timestamp : Date.parse(text(d.timestamp));
      if (
        !Number.isFinite(time) ||
        !Number.isFinite(new Date(time).getTime()) ||
        !text(d.content) ||
        text(d.content).length > 10000
      )
        return null;
      const roomId = id(d.roomId);
      const senderId = id(sender.id);
      return {
        type: 'message',
        message: {
          roomId,
          senderId,
          id: d.id == null ? `${senderId}:${time}:${text(d.content)}` : id(d.id),
          name: text(sender.name) || '系统',
          content: text(d.content),
          time,
        },
      };
    }
    if (frame.type === 'refreshRoom' || frame.type === 'gameStart') {
      let roomId: string | null = null;
      if (frame.data && typeof frame.data === 'object') {
        const data = record(frame.data);
        const content =
          data.content && typeof data.content === 'object' ? record(data.content) : data;
        if (content.roomId != null) roomId = id(content.roomId);
      }
      return { type: 'refresh', roomId };
    }
    if (frame.type === 'countdown') {
      const data = record(frame.data);
      if (
        typeof data.time !== 'number' ||
        !Number.isInteger(data.time) ||
        data.time < 0 ||
        data.time > 3600
      )
        return null;
      return { type: 'countdown', roomId: id(data.roomId), seconds: data.time };
    }
    if (frame.type === 'error')
      return {
        type: 'error',
        message:
          typeof frame.data === 'string' ? frame.data : '服务端拒绝了消息，请检查禁言状态后重试',
      };
    return null;
  } catch {
    return null;
  }
}
export function createUndercoverChannel() {
  let connected = false;
  let sender: ((packet: unknown) => boolean) | null = null;
  const listeners = new Set<(event: UndercoverEvent) => void>();
  const emit = (event: UndercoverEvent) => listeners.forEach((listener) => listener(event));
  const port: UndercoverRealtimePort = {
    connected: () => connected,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    send(message: RoomMessage, avatar: string | null) {
      if (!connected || !sender) return false;
      return sender({
        type: 2,
        userId: message.senderId,
        data: {
          type: 'undercover',
          content: {
            message: {
              id: message.id,
              roomId: message.roomId,
              content: message.content,
              timestamp: new Date(message.time).toISOString(),
              sender: { id: message.senderId, name: message.name, avatar },
            },
          },
        },
      });
    },
  };
  return {
    port,
    receive(raw: unknown) {
      const event = decodeUndercoverEvent(raw);
      if (event) emit(event);
    },
    connection(state: string, send: ((packet: unknown) => boolean) | null) {
      connected = state === 'connected';
      sender = send;
      emit({ type: 'connection', connected });
    },
  };
}
