import { useEffect, useRef, useState } from 'react';
import type { TodoPort, TodoSnapshot, TodoTask } from '@/domain/todo';

type LoadState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; snapshot: TodoSnapshot };

export function nextTodoId(tasks: readonly TodoTask[]): number {
  let id = Date.now();
  while (tasks.some((task) => task.id === id)) id++;
  return id;
}

export function useTodo(service: TodoPort) {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const pending = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void service.load(controller.signal).then(
      (snapshot) => {
        if (!controller.signal.aborted) setLoad({ status: 'ready', snapshot });
      },
      () => {
        if (!controller.signal.aborted) setLoad({ status: 'error' });
      },
    );
    return () => {
      controller.abort();
      pending.current?.abort();
    };
  }, [attempt, service]);

  async function save(tasks: readonly TodoTask[], onSuccess?: () => void) {
    if (load.status !== 'ready' || pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setSaving(true);
    setSaveError(false);
    try {
      await load.snapshot.save(tasks, controller.signal);
      if (!controller.signal.aborted) {
        setLoad({ status: 'ready', snapshot: { ...load.snapshot, tasks } });
        onSuccess?.();
      }
    } catch {
      if (!controller.signal.aborted) setSaveError(true);
    } finally {
      pending.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  return {
    load,
    reload() {
      setLoad({ status: 'loading' });
      setAttempt((value) => value + 1);
    },
    saving,
    saveError,
    clearSaveError: () => setSaveError(false),
    save,
  };
}
