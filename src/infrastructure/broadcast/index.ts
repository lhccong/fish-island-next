import type { Broadcast, BroadcastPort } from '@/domain/broadcast';

export function decodeBroadcast(raw: unknown): Broadcast | null {
  if (typeof raw !== 'string' || raw.length > 4096) return null;
  try {
    const frame: unknown = JSON.parse(raw);
    if (!frame || typeof frame !== 'object' || !('type' in frame) || frame.type !== 'broadcast')
      return null;
    if (!('data' in frame) || !frame.data || typeof frame.data !== 'object') return null;
    const data = frame.data;
    if (!('id' in data) || typeof data.id !== 'string' || !/^[a-zA-Z0-9-]{1,64}$/.test(data.id))
      return null;
    if (
      !('content' in data) ||
      typeof data.content !== 'string' ||
      !data.content.trim() ||
      data.content.length > 200 ||
      Array.from(data.content).some((character) => {
        const code = character.charCodeAt(0);
        return (code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127;
      })
    )
      return null;
    if (
      !('publishedAt' in data) ||
      typeof data.publishedAt !== 'number' ||
      !Number.isSafeInteger(data.publishedAt) ||
      data.publishedAt <= 0
    )
      return null;
    return { id: data.id, content: data.content.trim(), publishedAt: data.publishedAt };
  } catch {
    return null;
  }
}

export function createBroadcastChannel(): BroadcastPort & { receive(raw: unknown): void } {
  const listeners = new Set<(event: Broadcast) => void>();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    receive(raw) {
      const event = decodeBroadcast(raw);
      if (event) listeners.forEach((listener) => listener(event));
    },
  };
}
