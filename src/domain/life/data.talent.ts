import entries from './talent.json';
import type { Talent } from './data.talent.types';
const data = new Map<number, Talent>(entries as [number, Talent][]);
export default data;
