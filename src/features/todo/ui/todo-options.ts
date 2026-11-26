import type { TodoPriority } from '@/domain/todo';

export const priorityLabels: Record<TodoPriority, string> = {
  low: '低优先级',
  medium: '中优先级',
  high: '高优先级',
};
