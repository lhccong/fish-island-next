export type PetSpriteAction = 'idle' | 'run' | 'run-left' | 'pat';

// Existing atlases do not all share the same left/right row order.
const directionRows: Readonly<Record<string, { left: number; right: number }>> = {
  'luobo.webp': { left: 2, right: 1 },
  'wutiaowu.webp': { left: 1, right: 2 },
};
export function petSpriteAction(url: string, action: PetSpriteAction) {
  const file = url.split(/[?#]/)[0]?.split('/').pop()?.toLowerCase() ?? '';
  const rows = directionRows[file] ?? { left: 2, right: 1 };
  return {
    row:
      action === 'run-left' ? rows.left : action === 'run' ? rows.right : action === 'pat' ? 3 : 0,
    frames: action === 'run' || action === 'run-left' ? 8 : action === 'pat' ? 4 : 6,
  };
}
