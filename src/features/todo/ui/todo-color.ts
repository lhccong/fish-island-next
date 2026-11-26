type Rgb = [number, number, number];
export type Hsv = { hue: number; saturation: number; brightness: number };

function toHex(rgb: Rgb): string {
  return `#${rgb.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function toRgb(color: string): Rgb {
  return [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16)) as Rgb;
}

export function normalizeTodoColor(value: string | undefined): string | undefined {
  const color = value?.trim();
  if (!color) return;
  if (/^#[\da-f]{6}$/i.test(color)) return color.toUpperCase();
  const rgb = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i.exec(color);
  if (rgb) {
    const channels = rgb.slice(1).map(Number) as Rgb;
    if (channels.every((channel) => channel <= 255)) return toHex(channels);
  }
}

export function colorFromHsv({ hue, saturation, brightness }: Hsv): string {
  const channel = (offset: number) => {
    const sector = (offset + hue / 60) % 6;
    return 255 * brightness * (1 - saturation * Math.max(0, Math.min(sector, 4 - sector, 1)));
  };
  return toHex([channel(5), channel(3), channel(1)]);
}

export function colorToHsv(color: string): Hsv {
  const [red, green, blue] = toRgb(color);
  const maximum = Math.max(red, green, blue);
  const span = maximum - Math.min(red, green, blue);
  const sector = !span
    ? 0
    : maximum === red
      ? (green - blue) / span
      : maximum === green
        ? 2 + (blue - red) / span
        : 4 + (red - green) / span;
  return {
    hue: Math.round(sector * 60 + 360) % 360,
    saturation: maximum ? span / maximum : 0,
    brightness: maximum / 255,
  };
}

export function todoColorStyle(value: string | undefined) {
  const backgroundColor = normalizeTodoColor(value);
  if (!backgroundColor) return;
  const linear = (byte: number) => {
    const channel = byte / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  const [red, green, blue] = toRgb(backgroundColor);
  const luminance = 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
  return { backgroundColor, color: luminance >= Math.sqrt(0.0525) - 0.05 ? '#000' : '#fff' };
}
