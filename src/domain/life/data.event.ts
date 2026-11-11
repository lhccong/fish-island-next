import entries from './event.json';
import type { Event } from './data.event.types';
const data = new Map<number, Event>(entries as [number, Event][]);
export default data;
