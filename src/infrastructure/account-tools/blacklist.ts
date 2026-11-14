import type { BlacklistPort, BlockedUser } from '@/domain/account-tools';

export function createBlacklistStorage(): BlacklistPort {
  const listeners = new Set<() => void>();
  const cache = new Map<string, readonly BlockedUser[]>();
  const key = (account: string) => `fish-island:blacklist:${encodeURIComponent(account)}`;
  const notify = () => { cache.clear(); listeners.forEach((listener) => listener()); };
  function read(account: string): readonly BlockedUser[] {
    if (cache.has(account)) return cache.get(account)!;
    let users: BlockedUser[] = [];
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(key(account)) ?? 'null');
      if (Array.isArray(saved)) users = saved.filter((v): v is BlockedUser => !!v && typeof v.id === 'string' && typeof v.name === 'string');
      else {
        const old: unknown = JSON.parse(localStorage.getItem('fish-chat-blacklist') ?? '[]');
        if (Array.isArray(old)) users = old.filter((id) => typeof id === 'string' || typeof id === 'number').map((id) => ({id: String(id), name: `岛友 ${String(id)}`}));
      }
    } catch { /* 损坏的本机旧数据不阻断聊天。 */ }
    const result = [...new Map(users.map((user) => [user.id, user])).values()];
    cache.set(account, result);
    return result;
  }
  return {
    read,
    write(account, users) { localStorage.setItem(key(account), JSON.stringify(users)); notify(); },
    subscribe(listener) {
      if (!listeners.size) window.addEventListener('storage', notify);
      listeners.add(listener);
      return () => { listeners.delete(listener); if (!listeners.size) window.removeEventListener('storage', notify); };
    },
  };
}
