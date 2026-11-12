import { useCallback, useEffect, useState } from 'react';

type Resource<T> =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; value: T };

export function useProfileResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [resource, setResource] = useState<Resource<T>>({ status: 'loading' });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setResource({ status: 'ready', value });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setResource({
            status: 'error',
            message: error instanceof Error ? error.message : '读取失败，请重试',
          });
      });
    return () => controller.abort();
  }, [load, version]);
  return {
    resource,
    reload: () => {
      setResource({ status: 'loading' });
      reload();
    },
  };
}
