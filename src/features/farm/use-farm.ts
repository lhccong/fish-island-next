import { useCallback, useEffect, useRef, useState } from 'react';
import type { Crop, Farmer, FarmAction, FarmPort, Land } from '@/domain/farm';
interface Snapshot {
  lands: Land[];
  crops: Crop[];
  farmer: Farmer;
  balance: number;
}
export function useFarm(service: FarmPort, friendId: string | null) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const read = useRef<AbortController | null>(null);
  const write = useRef<AbortController | null>(null);
  const nowScope = useRef(friendId);
  const [now, setNow] = useState(Date.now);
  const refresh = useCallback(async () => {
    read.current?.abort();
    const controller = new AbortController();
    read.current = controller;
    setLoading(true);
    setError('');
    try {
      const [lands, crops, farmer, balance] = await Promise.all([
        service.lands(friendId, controller.signal),
        service.crops(controller.signal),
        service.farmer(controller.signal),
        service.balance(controller.signal),
      ]);
      if (!controller.signal.aborted) setData({ lands, crops, farmer, balance });
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(e instanceof Error ? e.message : '农场加载失败，请重试');
        throw e;
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [service, friendId]);
  useEffect(() => {
    nowScope.current = friendId;
    let disposed = false;
    queueMicrotask(() => {
      if (!disposed) void refresh().catch(() => {});
    });
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      disposed = true;
      read.current?.abort();
      write.current?.abort();
      clearInterval(timer);
    };
  }, [refresh, friendId]);
  async function act(action: FarmAction, ids: string[], cropId: string | null = null) {
    if (write.current && !write.current.signal.aborted) return false;
    const controller = new AbortController();
    write.current = controller;
    setBusy(true);
    setNotice('');
    try {
      const message = await service.act(action, ids, cropId, controller.signal);
      if (controller.signal.aborted || nowScope.current !== friendId) return false;
      setNotice(message);
      try {
        await refresh();
      } catch {
        setNotice(`${message}；最新数据同步失败，请刷新核对后再操作`);
      }
      return true;
    } catch (e) {
      if (!controller.signal.aborted)
        setNotice(e instanceof Error ? e.message : '操作失败，请重试');
      return false;
    } finally {
      if (!controller.signal.aborted) {
        write.current = null;
        setBusy(false);
      }
    }
  }
  return {
    data,
    loading,
    error,
    notice,
    busy,
    now,
    refresh: () => {
      setNotice('');
      void refresh().catch(() => {});
    },
    act,
  };
}
