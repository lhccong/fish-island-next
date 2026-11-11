// Game states contain only structured data (objects, Map and Set).
export function produce<T>(state: T, update: (draft: T) => void): T {
 const draft = structuredClone(state);
 update(draft);
 return draft;
}
