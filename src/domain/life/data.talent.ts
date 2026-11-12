import type { Talent } from './data.talent.types';
import entries from './talent.json';
const data = new Map<number, Talent>(entries as [number, Talent][]);
export default data;
