import { campPosition } from '@/domain/pet';

export type CampPoint = { x: number; y: number };
export type CampFacing = 'run' | 'run-left';
const directions: Record<string, CampPoint> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
  KeyW: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
};
export function movementKey(key: string, code: string) {
  if (code in directions) return code;
  if (key in directions) return key;
  const letter = `Key${key.toUpperCase()}`;
  return letter in directions ? letter : null;
}
export function heldDirection(keys: ReadonlySet<string>): CampPoint {
  let x = 0,
    y = 0;
  for (const key of keys) {
    x += directions[key]?.x ?? 0;
    y += directions[key]?.y ?? 0;
  }
  x = Math.sign(x);
  y = Math.sign(y);
  const length = Math.hypot(x, y);
  return length ? { x: x / length, y: y / length } : { x: 0, y: 0 };
}
export function advanceCamp(
  current: CampPoint,
  vector: CampPoint,
  step: number,
  facing: CampFacing,
) {
  const next = campPosition(current.x + vector.x * step, current.y + vector.y * step);
  const dx = next.x - current.x;
  return {
    position: next,
    facing: Math.abs(dx) > 0.00001 ? (dx < 0 ? ('run-left' as const) : ('run' as const)) : facing,
    moving: Math.hypot(dx, next.y - current.y) > 0.00001,
  };
}
