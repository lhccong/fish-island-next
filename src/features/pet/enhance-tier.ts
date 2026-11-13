export function enhanceTier(level: number) {
  if (!Number.isSafeInteger(level) || level <= 0) return 0;
  if (level <= 3) return 1;
  if (level <= 6) return 2;
  if (level <= 9) return 3;
  if (level <= 14) return 4;
  return 5;
}
