import { useEffect, useRef, useState } from 'react';
import type { PointsShopPort, ShopBubble } from '@/domain/points-shop';

type Catalog =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: ShopBubble[] };
type ShopAction =
  | { kind: 'exchange'; item: ShopBubble }
  | { kind: 'equip'; id: string | null }
  | { kind: 'balance' };

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useBubbleShop(
  service: PointsShopPort,
  onPurchased: (signal: AbortSignal) => Promise<void>,
) {
  const [catalog, setCatalog] = useState<Catalog>({ status: 'loading' });
  const [revision, setRevision] = useState(0);
  const [now, setNow] = useState(Date.now);
  const [pending, setPending] = useState<ShopAction['kind'] | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [balanceError, setBalanceError] = useState(false);
  const operation = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void service.bubbles(controller.signal).then(
      (items) => {
        if (controller.signal.aborted) return;
        setCatalog({ status: 'ready', items });
        setNow(Date.now());
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setCatalog({ status: 'error', message: errorText(error, '读取气泡失败，请重试') });
      },
    );
    return () => controller.abort();
  }, [service, revision]);

  useEffect(() => () => operation.current?.abort(), []);

  useEffect(() => {
    if (catalog.status !== 'ready') return;
    const next = Math.min(
      ...catalog.items.flatMap(({ expiresAt }) =>
        expiresAt !== null && expiresAt > now ? [expiresAt] : [],
      ),
    );
    if (!Number.isFinite(next)) return;
    const timer = window.setTimeout(
      () => setNow(Date.now()),
      Math.min(Math.max(next - Date.now(), 0), 2 ** 31 - 1),
    );
    return () => window.clearTimeout(timer);
  }, [catalog, now]);

  function reload() {
    setError('');
    setCatalog({ status: 'loading' });
    setRevision((value) => value + 1);
  }

  async function run(action: ShopAction) {
    if (operation.current) return false;
    const controller = new AbortController();
    const { signal } = controller;
    operation.current = controller;
    setPending(action.kind);
    setError('');
    if (action.kind !== 'balance') setNotice('');
    try {
      if (action.kind !== 'balance') {
        const items =
          action.kind === 'exchange'
            ? await service.exchangeBubble(action.item.id, action.item.points, signal)
            : await service.equipBubble(action.id, signal);
        if (signal.aborted) return false;
        setCatalog({ status: 'ready', items });
        setNow(Date.now());
        if (action.kind === 'equip') {
          const active = items.find((item) => item.equipped);
          setNotice(active ? `正在使用「${active.name}」` : '已恢复默认气泡');
          return true;
        }
        setNotice(`已兑换「${action.item.name}」`);
      }
      try {
        await onPurchased(signal);
        if (!signal.aborted) setBalanceError(false);
      } catch {
        if (!signal.aborted) setBalanceError(true);
      }
      return !signal.aborted;
    } catch (error) {
      if (!signal.aborted) setError(errorText(error, '气泡操作失败，请重试'));
      return false;
    } finally {
      operation.current = null;
      if (!signal.aborted) setPending(null);
    }
  }

  return { catalog, now, pending, error, notice, balanceError, reload, setError, run };
}
