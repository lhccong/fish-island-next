import { useCallback, useEffect, useState } from 'react';
export type Resource<T> =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: T };
export function useResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [revision, setRevision] = useState(0);
  const [snapshot, setSnapshot] = useState<{
    load: typeof load;
    revision: number;
    state: Resource<T>;
  } | null>(null);
  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted)
          setSnapshot({ load, revision, state: { status: 'ready', data } });
      },
      (error) => {
        if (!controller.signal.aborted)
          setSnapshot({
            load,
            revision,
            state: {
              status: 'error',
              message: error instanceof Error ? error.message : '加载失败，请重试',
            },
          });
      },
    );
    return () => controller.abort();
  }, [load, revision]);
  const state: Resource<T> =
    snapshot?.load === load && snapshot.revision === revision
      ? snapshot.state
      : { status: 'loading' };
  return { state, refresh };
}
