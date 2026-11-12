import { useCallback, useEffect, useRef, useState } from 'react';

export type Resource<T> =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: T };
export function usePetResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<Resource<T>>({ status: 'loading' });
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<T>();
  useEffect(() => {
    const request = new AbortController();
    void Promise.resolve().then(async () => {
      if (request.signal.aborted) return;
      setState({ status: 'loading' });
      try {
        const data = await load(request.signal);
        if (!request.signal.aborted) {
          setData(data);
          setState({ status: 'ready', data });
        }
      } catch (error) {
        if (!request.signal.aborted)
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : '读取失败，请重试',
          });
      }
    });
    return () => request.abort();
  }, [load, revision]);
  return { state, data, reload: useCallback(() => setRevision((v) => v + 1), []) };
}
export function usePetOperation() {
  const request = useRef<AbortController | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; message: string } | null>(null);
  useEffect(
    () => () => {
      request.current?.abort();
    },
    [],
  );
  async function run<T>(
    job: (signal: AbortSignal) => Promise<T>,
    message: string,
    after?: (result: T) => void,
  ) {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setNotice(null);
    try {
      const result = await job(controller.signal);
      if (controller.signal.aborted) return;
      setNotice({ error: false, message });
      after?.(result);
    } catch (error) {
      if (!controller.signal.aborted)
        setNotice({
          error: true,
          message: error instanceof Error ? error.message : '操作失败，请稍后重试',
        });
    } finally {
      if (!controller.signal.aborted) {
        request.current = null;
        setPending(false);
      }
    }
  }
  return { pending, notice, run };
}
