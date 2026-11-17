import { createStore } from 'zustand/vanilla';
import type { OnlineMember, OnlineMembersEvent, OnlineMembersPort } from '@/domain/chat';

export type MembersState =
  | { status: 'idle' | 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; members: readonly OnlineMember[]; updatedAt: number };

export function createMembersController(port?: OnlineMembersPort) {
  const store = createStore<{ state: MembersState }>(() => ({ state: { status: 'idle' } }));
  let request: AbortController | null = null;
  // Only changes received during the current HTTP request need replaying.
  const changes = new Map<string, OnlineMember | null>();
  const success = (members: readonly OnlineMember[]) =>
    store.setState({ state: { status: 'success', members, updatedAt: Date.now() } });
  const merge = (members: readonly OnlineMember[]) => {
    const merged = new Map(members.map((member) => [member.id, member]));
    for (const [id, member] of changes) {
      if (member) merged.set(id, member);
      else merged.delete(id);
    }
    return [...merged.values()];
  };
  const refresh = async () => {
    if (!port || request) return;
    const current = new AbortController();
    request = current;
    changes.clear();
    store.setState({ state: { status: 'loading' } });
    try {
      const members = await port.loadOnlineMembers(current.signal);
      if (!current.signal.aborted) success(merge(members));
    } catch (error) {
      if (!current.signal.aborted)
        store.setState({
          state: {
            status: 'error',
            message: error instanceof Error ? error.message : '在线成员加载失败，请重试',
          },
        });
    } finally {
      if (request === current) {
        request = null;
        changes.clear();
      }
    }
  };
  return {
    store,
    refresh,
    load() {
      if (store.getState().state.status === 'idle') void refresh();
    },
    receive(event: OnlineMembersEvent) {
      if (event.type === 'members-snapshot') {
        request?.abort();
        request = null;
        changes.clear();
        success([...new Map(event.members.map((member) => [member.id, member])).values()]);
        return;
      }
      const delta = new Map<string, OnlineMember | null>();
      if (event.type === 'member-offline') delta.set(event.id, null);
      else event.members.forEach((member) => delta.set(member.id, member));
      if (request) delta.forEach((member, id) => changes.set(id, member));
      const state = store.getState().state;
      if (state.status !== 'success') return;
      const members = new Map(state.members.map((member) => [member.id, member]));
      delta.forEach((member, id) => {
        if (member) members.set(id, member);
        else members.delete(id);
      });
      success([...members.values()]);
    },
    reset() {
      request?.abort();
      request = null;
      changes.clear();
      store.setState({ state: { status: 'idle' } });
    },
  };
}
export type MembersController = ReturnType<typeof createMembersController>;
