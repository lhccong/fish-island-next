import type { ReactNode } from 'react';
export interface AdminColumn<T> {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
  sortField?: string;
  width?: number;
  primary?: boolean;
}
