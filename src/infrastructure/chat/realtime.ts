import type { ChatConnectionState, ChatRealtimePort } from '@/domain/chat';
import type { SessionToken } from '@/domain/auth';
import { decodeChatEvent } from './protocol';

export function createChatRealtime(
  baseUrl: string,
  credential: () => SessionToken | null,
  onExpired: () => void,
): ChatRealtimePort {
  return {
    connect(onEvent, onState) {
      let socket: WebSocket | null = null;
      let stopped = false;
      let unauthorized = false;
      let attempt = 0;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let deadline: ReturnType<typeof setTimeout> | undefined;
      let heartbeat: ReturnType<typeof setInterval> | undefined;
      const state = (value: ChatConnectionState) => onState(value);
      const disposeSocket = () => {
        clearTimeout(deadline);
        clearInterval(heartbeat);
        if (socket) {
          socket.onopen = socket.onclose = socket.onerror = socket.onmessage = null;
          socket.close();
          socket = null;
        }
      };
      const expire = () => {
        unauthorized = true;
        state('unauthorized');
        onExpired();
      };
      const schedule = () => {
        if (stopped || unauthorized) return;
        if (!navigator.onLine) {
          state('offline');
          return;
        }
        state('reconnecting');
        clearTimeout(timer);
        timer = setTimeout(
          open,
          Math.min(30000, 1000 * 2 ** Math.min(attempt++, 5)) * (0.75 + Math.random() * 0.25),
        );
      };
      function open() {
        clearTimeout(timer);
        if (stopped || unauthorized) return;
        disposeSocket();
        if (!navigator.onLine) return state('offline');
        const token = credential();
        if (!token) return expire();
        state(attempt ? 'reconnecting' : 'connecting');
        try {
          const url = new URL('/ws/', baseUrl);
          url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
          url.searchParams.set('token', token.value);
          const current = new WebSocket(url);
          socket = current;
          deadline = setTimeout(() => {
            disposeSocket();
            schedule();
          }, 15000);
          current.onopen = () => {
            clearTimeout(deadline);
            current.send(JSON.stringify({ type: 1 }));
            state('connected');
            // Only a stable connection resets backoff; rapid open/close loops keep backing off.
            deadline = setTimeout(() => {
              attempt = 0;
            }, 30000);
            heartbeat = setInterval(() => {
              if (current.readyState === WebSocket.OPEN) current.send(JSON.stringify({ type: 4 }));
            }, 25000);
          };
          current.onmessage = (event) => {
            const decoded = decodeChatEvent(event.data);
            if (decoded) onEvent(decoded);
          };
          current.onerror = () => {
            disposeSocket();
            schedule();
          };
          current.onclose = (event) => {
            disposeSocket();
            if ([1008, 4001, 4401].includes(event.code)) expire();
            else schedule();
          };
        } catch {
          disposeSocket();
          schedule();
        }
      }
      const offline = () => {
        clearTimeout(timer);
        disposeSocket();
        state('offline');
      };
      const online = () => {
        if (!socket) open();
      };
      window.addEventListener('offline', offline);
      window.addEventListener('online', online);
      // Deferring also prevents StrictMode's setup/cleanup probe opening a socket.
      timer = setTimeout(open, 0);
      return {
        close() {
          stopped = true;
          clearTimeout(timer);
          disposeSocket();
          window.removeEventListener('offline', offline);
          window.removeEventListener('online', online);
          state('closed');
        },
        retry() {
          if (
            !unauthorized &&
            !stopped &&
            socket?.readyState !== WebSocket.OPEN &&
            socket?.readyState !== WebSocket.CONNECTING
          )
            open();
        },
        revoke(id) {
          if (!socket || socket.readyState !== WebSocket.OPEN) return false;
          try {
            socket.send(
              JSON.stringify({
                type: 2,
                userId: -1,
                data: { type: 'userMessageRevoke', content: id },
              }),
            );
            return true;
          } catch {
            return false;
          }
        },
      };
    },
  };
}
