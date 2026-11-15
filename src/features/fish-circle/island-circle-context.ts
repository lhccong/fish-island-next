import { createContext, useContext } from 'react';
import type { AuthUser } from '@/domain/auth';
import type { FishCirclePort, Moment } from '@/domain/fish-circle';
import type { usePage } from './use-page';
export interface IslandCircleValue {
  page: ReturnType<typeof usePage<Moment>>;
  service: FishCirclePort;
  user: AuthUser;
  overrides: Record<string, Partial<Pick<Moment, 'liked' | 'likes' | 'comments'>>>;
  patch: (id: string, change: Partial<Pick<Moment, 'liked' | 'likes' | 'comments'>>) => void;
  publish: (trigger: HTMLButtonElement) => void;
  onViewUser: (id: string) => void;
}
export const IslandCircleContext = createContext<IslandCircleValue | null>(null);
export function useIslandCircle() {
  const value = useContext(IslandCircleContext);
  if (!value) throw new Error('IslandCircleProvider required');
  return value;
}
