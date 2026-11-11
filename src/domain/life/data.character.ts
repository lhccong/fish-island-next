import entries from './character.json';
import type { Character } from './data.character.types';
const data = new Map<number, Character>(entries as [number, Character][]);
export default data;
