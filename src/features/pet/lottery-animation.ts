const sequence = [0, 1, 2, 5, 8, 7, 6, 3, 4];
export async function animateLottery(
  target: number,
  signal: AbortSignal,
  highlight: (index: number) => void,
) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    highlight(target);
    return;
  }
  const end = sequence.length * 3 + sequence.indexOf(target);
  for (let step = 0; step <= end; step++) {
    signal.throwIfAborted();
    highlight(sequence[step % sequence.length]!);
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        window.clearTimeout(timer);
        reject(signal.reason);
      };
      const timer = window.setTimeout(
        () => {
          signal.removeEventListener('abort', abort);
          resolve();
        },
        step > end - 8 ? 80 + (8 - (end - step)) * 60 : 80,
      );
      signal.addEventListener('abort', abort, { once: true });
    });
  }
}
