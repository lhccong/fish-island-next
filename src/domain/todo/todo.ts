export const todoPriorities = ['low', 'medium', 'high'] as const;
export type TodoPriority = (typeof todoPriorities)[number];

export interface TodoTask {
  id: number;
  title: string;
  date: string;
  priority: TodoPriority;
  status: 'pending' | 'completed';
  description?: string;
  note?: string;
  bgColor?: string;
}

export interface TodoSnapshot {
  tasks: readonly TodoTask[];
  save: (tasks: readonly TodoTask[], signal: AbortSignal) => Promise<void>;
}

export interface TodoPort {
  load: (signal: AbortSignal) => Promise<TodoSnapshot>;
}

function dateValue(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function isTodoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = dateValue(value);
  return Number.isFinite(date.getTime()) && dateKey(date) === value;
}

export function todayTodoDate(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${String(now.getFullYear()).padStart(4, '0')}-${month}-${day}`;
}

export function shiftTodoMonth(value: string, offset: number): string {
  const date = dateValue(`${value.slice(0, 7)}-01`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return dateKey(date);
}

export function todoMonthDays(value: string): (string | null)[] {
  const date = dateValue(`${value.slice(0, 7)}-01`);
  const weekdays = (date.getUTCDay() + 6) % 7;
  date.setUTCMonth(date.getUTCMonth() + 1, 0);
  const count = date.getUTCDate();
  return Array.from({ length: weekdays + count }, (_, index) => {
    if (index < weekdays) return null;
    const day = String(index - weekdays + 1).padStart(2, '0');
    return `${value.slice(0, 7)}-${day}`;
  });
}
