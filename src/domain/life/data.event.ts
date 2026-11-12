import type { Event } from './data.event.types';
import entries from './event.json';
const data = new Map<number, Event>(entries as [number, Event][]);
export default data;
