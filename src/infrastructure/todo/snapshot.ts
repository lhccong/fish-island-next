import { isTodoDate, type TodoTask } from '@/domain/todo';

function decodeTask(value: unknown): TodoTask | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const { id, title, date, priority, status, description, note, bgColor, type } = value as Record<
    string,
    unknown
  >;
  if (
    type === 'weekly' ||
    typeof id !== 'number' ||
    !Number.isSafeInteger(id) ||
    typeof title !== 'string' ||
    !isTodoDate(date) ||
    (priority !== 'low' && priority !== 'medium' && priority !== 'high') ||
    (status !== 'pending' && status !== 'completed')
  ) {
    return null;
  }
  return {
    id,
    title,
    date,
    priority,
    status,
    ...(typeof description === 'string' ? { description } : {}),
    ...(typeof note === 'string' ? { note } : {}),
    ...(typeof bgColor === 'string' ? { bgColor } : {}),
  };
}

export function decodeTodoSnapshot(value: unknown) {
  const decoded: unknown = typeof value === 'string' ? JSON.parse(value) : value;
  if (decoded !== null && !Array.isArray(decoded)) throw new Error('待办数据格式错误');
  const records: unknown[] = decoded ?? [];
  const ids = new Set<number>();
  const rows = records.map((record) => {
    const task = decodeTask(record);
    if (task) {
      if (ids.has(task.id)) throw new Error('待办数据包含重复编号');
      ids.add(task.id);
    }
    return { record, task };
  });
  return {
    tasks: rows.flatMap(({ task }) => (task ? [task] : [])),
    encode(tasks: readonly TodoTask[]): unknown[] {
      const changes = new Map(tasks.map((task) => [task.id, task]));
      const updated = rows.flatMap(({ record, task }) => {
        if (!task) return [record];
        const next = changes.get(task.id);
        if (!next) return [];
        changes.delete(task.id);
        return [{ ...(record as object), ...next }];
      });
      return [...updated, ...changes.values()];
    },
  };
}
