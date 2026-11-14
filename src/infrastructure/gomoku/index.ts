import type { ConnectionStatus, GomokuEvent, GomokuPort } from '@/domain/gomoku';
import { decodeGomokuEvent, encodeGomokuCommand } from './protocol';

// Bound by app to the existing account socket; this adapter owns no connection.
export function createGomokuRelay() {
  let state: ConnectionStatus = 'closed';
  let send: ((frame: unknown) => boolean) | null = null;
  const listeners = new Set<{
    event: (event: GomokuEvent) => void;
    status: (state: ConnectionStatus) => void;
  }>();
  const port: GomokuPort = {
    status: () => state,
    send: (command) => state === 'connected' && !!send?.(encodeGomokuCommand(command)),
    subscribe(event, status) {
      const listener = { event, status };
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  return {
    port,
    receive(raw: unknown) {
      const event = decodeGomokuEvent(raw);
      if (event) listeners.forEach((listener) => listener.event(event));
    },
    connection(value: ConnectionStatus, sender: ((frame: unknown) => boolean) | null) {
      state = value;
      send = sender;
      listeners.forEach((listener) => listener.status(value));
    },
  };
}
