export const broadcastSpeed = 40;
export const broadcastLeadIn = 1200;

export function broadcastPlayback(distance: number, reducedMotion: boolean, length: number) {
  const scrollDuration = reducedMotion
    ? 0
    : Math.ceil((Math.max(0, distance) / broadcastSpeed) * 1000);
  const duration = reducedMotion
    ? Math.max(3000, length * 100)
    : Math.max(3000, scrollDuration ? broadcastLeadIn + scrollDuration + 1200 : 3000);
  return { distance, scrollDuration, duration, reducedMotion };
}
