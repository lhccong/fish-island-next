import {
  emptyTable,
  mergeTable,
  type LandlordsEvent,
  type LandlordsPort,
  type Room,
  type TableState,
} from '@/domain/landlords';
interface Snapshot {
  table: TableState;
  rooms: Room[];
  restriction: string;
  connected: boolean;
  loading: boolean;
  pending: string;
  error: string;
  notice: string;
}
export function createLandlordsModel(port: LandlordsPort, userId: string) {
  let snapshot: Snapshot = {
    table: emptyTable(),
    rooms: [],
    restriction: '',
    connected: port.connected(),
    loading: true,
    pending: '',
    error: '',
    notice: '',
  };
  let scope = '';
  let navigate: (id: string | null) => void = () => {};
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  const update = (patch: Partial<Snapshot>) => {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((l) => l());
  };
  const confirm = () => {
    clearTimeout(deadline);
    update({ pending: '', loading: false });
  };
  const expire = () =>
    update({ pending: '', loading: false, error: '服务端确认超时，请同步房间查看结果后重试' });
  function send(command: string, body: Record<string, unknown> = {}) {
    if (snapshot.pending) return false;
    if (!port.send(userId, command, { ...(scope ? { roomId: scope } : {}), ...body })) {
      update({ error: '连接尚未就绪，请等待重连后同步房间', loading: false });
      return false;
    }
    update({ pending: command, error: '' });
    clearTimeout(deadline);
    deadline = setTimeout(expire, 12000);
    return true;
  }
  function sync() {
    confirm();
    update({ loading: true });
    send(
      scope ? 'gameJoinRoom' : 'gameRoomList',
      scope ? { roomId: scope } : { gameType: 'LANDLORDS_CLASSIC' },
    );
  }
  function receive(e: LandlordsEvent) {
    if (e.type === 'closed') {
      if (scope === e.roomId) {
        confirm();
        scope = '';
        update({ table: emptyTable(), notice: '房间已关闭', restriction: '' });
        navigate(null);
      } else if (!scope && !snapshot.pending) sync();
      return;
    }
    if (e.type === 'player') {
      if (!scope) return;
      if (e.leave && e.id === userId) {
        confirm();
        scope = '';
        navigate(null);
      }
      update({ table: mergeTable(snapshot.table, e, userId) });
      return;
    }
    if (e.type === 'error') {
      if (snapshot.pending) {
        confirm();
        update({ error: e.message });
      }
      return;
    }
    if (e.type === 'rooms') {
      if (scope) return;
      confirm();
      update({ rooms: e.rooms, restriction: e.restriction });
      return;
    }
    if (e.type === 'refresh') {
      if (!scope && !snapshot.pending) sync();
      return;
    }
    if (e.type === 'left') {
      confirm();
      scope = '';
      update({ table: emptyTable(), restriction: e.restriction });
      navigate(null);
      sync();
      return;
    }
    if (e.type === 'state') {
      if (e.patch.roomId && scope && e.patch.roomId !== scope) return;
      if (!scope && !['gameCreateRoom', 'gameJoinRoom'].includes(snapshot.pending)) return;
      if (e.action === 'CREATE' || (e.action === 'JOIN' && !scope)) {
        if (!e.patch.roomId) return;
        scope = e.patch.roomId;
        navigate(scope);
      }
      if (e.patch.roomId && e.patch.roomId !== scope) return;
      const command = snapshot.pending;
      if (['CREATE', 'JOIN', 'RECONNECT', command].includes(e.action) || e.action === 'RESULT')
        confirm();
      update({ table: mergeTable(snapshot.table, e, userId), loading: false });
      return;
    }
    if (e.type === 'played' && scope) {
      if (e.id === userId) confirm();
      update({ table: mergeTable(snapshot.table, e, userId), notice: e.message });
    }
    if (e.type === 'ack' && e.command === snapshot.pending) confirm();
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(l: () => void) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    start(onRoom: (id: string | null) => void) {
      navigate = onRoom;
      if (snapshot.pending) deadline = setTimeout(expire, 12000);
      const stop = port.subscribe(receive, (connected) => {
        update({ connected });
        if (connected) sync();
        else {
          confirm();
          update({ error: '连接已断开，正在等待账号连接恢复' });
        }
      });
      return () => {
        stop();
        clearTimeout(deadline);
      };
    },
    enter(roomId: string | null) {
      const next = roomId ?? '';
      if (next === scope && (snapshot.pending || !snapshot.loading)) return;
      scope = next;
      update({ table: scope === snapshot.table.roomId ? snapshot.table : emptyTable(), error: '' });
      if (port.connected()) sync();
    },
    send,
    sync,
  };
}
