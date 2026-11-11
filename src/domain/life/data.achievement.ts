import entries from './achievement.json';
import type { Achievement } from './data.achievement.types';
const data = new Map<number, Achievement>(entries as [number, Achievement][]);
export default data;
