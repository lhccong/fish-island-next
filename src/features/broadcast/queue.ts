import type { Broadcast } from '@/domain/broadcast';

export function createBroadcastQueue() {
  let items: readonly Broadcast[] = [];
  const seen = new Set<string>();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  return {
    getSnapshot: () => items,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    enqueue(event: Broadcast) {
      if (seen.has(event.id)) return;
      seen.add(event.id);
      if (seen.size > 200) seen.delete(seen.values().next().value!);
      if (items.length >= 20) return;
      items = [...items, event];
      notify();
    },
    dismiss(id: string) {
      if (items[0]?.id !== id) return;
      items = items.slice(1);
      notify();
    },
  };
}
