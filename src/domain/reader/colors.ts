/** Canonical form keeps CSS-minified palette colors compatible with stored themes. */
export function normalizeReaderColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const color = value.trim().toLowerCase();
  if (/^#[\da-f]{6}$/.test(color)) return color;
  if (/^#[\da-f]{3}$/.test(color))
    return `#${[...color.slice(1)].map((digit) => digit + digit).join('')}`;
  return undefined;
}
