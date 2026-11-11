import { useEffect, useReducer, useState } from 'react';
import type { HotBoardPort, HotSource } from '@/domain/hot-board';

type Resource =
  | { status: 'loading'; sources: readonly HotSource[] }
  | { status: 'ready'; sources: readonly HotSource[] }
  | { status: 'error'; sources: readonly HotSource[]; message: string };

export function useHotBoard(service: HotBoardPort) {
  const [resource, setResource] = useState<Resource>({ status: 'loading', sources: [] });
  const [version, requestReload] = useReducer((value: number) => value + 1, 0);

  useEffect(() => {
    const controller = new AbortController();
    void service.load(controller.signal).then(
      (sources) => {
        if (!controller.signal.aborted) setResource({ status: 'ready', sources });
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setResource((previous) => ({
            status: 'error',
            sources: previous.sources,
            message: error instanceof Error ? error.message : '获取热榜失败，请稍后重试',
          }));
      },
    );
    return () => controller.abort();
  }, [service, version]);

  function refresh() {
    setResource((previous) => ({ status: 'loading', sources: previous.sources }));
    requestReload();
  }

  return { resource, refresh };
}
