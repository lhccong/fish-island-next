import { createStore } from 'zustand/vanilla';
import type {
  RoomSettings,
  UndercoverPort,
  UndercoverRealtimePort,
  UndercoverRoom,
} from '@/domain/undercover';
interface RoomState {
  rooms: UndercoverRoom[];
  activeId: string | null;
  room: UndercoverRoom | null;
  status: 'loading' | 'ready' | 'error';
  error: string;
  pending: boolean;
  actionError: string;
  notice: string;
}
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : '操作失败，请重试';
export function createRoomController(
  service: UndercoverPort,
  realtime: UndercoverRealtimePort,
  userId: string,
) {
  const store = createStore<RoomState>(() => ({
    rooms: [],
    activeId: null,
    room: null,
    status: 'loading',
    error: '',
    pending: false,
    actionError: '',
    notice: '',
  }));
  let sync: AbortController | null = null;
  let mutation: AbortController | null = null;
  let queued = false;
  let recover = true;
  let stopped = false;
  let unsubscribe: (() => void) | undefined;
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  async function refresh() {
    if (stopped) return;
    if (sync) {
      queued = true;
      return;
    }
    const task = new AbortController();
    sync = task;
    store.setState({ status: 'loading', error: '' });
    try {
      const rooms = await service.rooms(task.signal);
      let activeId = store.getState().activeId;
      if (recover) {
        activeId ??=
          rooms.find((r) => r.status !== 'ENDED' && r.players.some((p) => p.id === userId))?.id ??
          null;
      }
      let room = activeId ? await service.room(activeId, task.signal) : null;
      if (task.signal.aborted || stopped) return;
      const previous = store.getState().room;
      if (!room && previous && previous.id === activeId)
        room = {
          ...previous,
          status: 'ENDED',
          result: '房间已结束或已解散，最终结果请查看房间发言。',
        };
      recover = false;
      store.setState({
        rooms,
        room,
        activeId: room ? activeId : null,
        status: 'ready',
        error: '',
        ...(activeId && !room ? { notice: '房间已结束或已解散，已返回大厅' } : {}),
      });
    } catch (error) {
      if (!task.signal.aborted && !stopped) {
        store.setState({ status: 'error', error: errorMessage(error) });
        queued = false;
      }
    } finally {
      if (sync === task) {
        sync = null;
        if (queued && !stopped) {
          queued = false;
          void refresh();
        }
      }
    }
  }
  function select(id: string | null) {
    sync?.abort();
    sync = null;
    queued = false;
    recover = false;
    store.setState({ activeId: id, room: null, actionError: '', notice: '' });
    void refresh();
  }
  async function run(work: (signal: AbortSignal) => Promise<string>, changeRoom?: string | null) {
    if (store.getState().pending || stopped) return false;
    const task = new AbortController();
    mutation = task;
    store.setState({ pending: true, actionError: '', notice: '' });
    try {
      const notice = await work(task.signal);
      if (task.signal.aborted || stopped) return false;
      sync?.abort();
      sync = null;
      queued = false;
      if (changeRoom !== undefined) store.setState({ activeId: changeRoom, room: null });
      store.setState({ notice });
      await refresh();
      return true;
    } catch (error) {
      if (!task.signal.aborted && !stopped) store.setState({ actionError: errorMessage(error) });
      return false;
    } finally {
      if (mutation === task) {
        mutation = null;
        store.setState({ pending: false });
      }
    }
  }
  return {
    store,
    refresh,
    select,
    start() {
      stopped = false;
      unsubscribe = realtime.subscribe((event) => {
        const active = store.getState().activeId;
        if (
          (event.type === 'refresh' && (!active || !event.roomId || event.roomId === active)) ||
          (event.type === 'connection' && event.connected)
        ) {
          clearTimeout(refreshTimer);
          refreshTimer = setTimeout(() => {
            void refresh();
          }, 120);
        }
      });
      void refresh();
      return () => {
        stopped = true;
        sync?.abort();
        sync = null;
        mutation?.abort();
        mutation = null;
        clearTimeout(refreshTimer);
        unsubscribe?.();
      };
    },
    create(settings: RoomSettings) {
      return run(async (signal) => {
        const id = await service.create(settings, signal);
        if (!signal.aborted) {
          store.setState({ activeId: id, room: null });
          recover = false;
        }
        return '房间已创建';
      });
    },
    action(action: 'join' | 'quit' | 'start' | 'end' | 'remove', id: string) {
      return run(
        async (signal) => {
          await service.action(action, id, signal);
          return {
            join: '已加入房间',
            quit: '已退出房间',
            start: '游戏已开始',
            end: '本轮已结算',
            remove: '房间已移除',
          }[action];
        },
        action === 'quit' || action === 'remove' ? null : id,
      );
    },
    vote(targetId: string) {
      const id = store.getState().activeId;
      return id
        ? run(async (signal) => {
            await service.vote(id, targetId, signal);
            return '投票成功';
          })
        : Promise.resolve(false);
    },
    guess(word: string) {
      const id = store.getState().activeId;
      return id
        ? run(async (signal) => {
            const correct = await service.guess(id, word, signal);
            return correct ? '猜对了！查看游戏结果' : '没有猜中，请留意剩余次数';
          })
        : Promise.resolve(false);
    },
  };
}
export type RoomController = ReturnType<typeof createRoomController>;
