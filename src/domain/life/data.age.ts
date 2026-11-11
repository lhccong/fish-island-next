import entries from './age.json';
import type { Age } from './data.age.types';
const data = new Map<number, Age>(entries as [number, Age][]);
export default data;
