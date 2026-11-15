import { createIslandPreferences } from '@/infrastructure/my-island';
export const islandPreferences = createIslandPreferences({
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
});
