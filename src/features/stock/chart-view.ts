import type { Candle, Trade } from '@/domain/stock';
export function expandedCandles(candles: Candle[], history: number) {
  const extra = Math.max(
    0,
    Math.min(candles.length - 20, Math.floor(Number.isFinite(history) ? history : 0)),
  );
  return candles.slice(-Math.min(candles.length, 20 + extra));
}
export interface ChartMarker {
  date: string;
  type: 'B' | 'S';
  trades: Trade[];
  x: number;
  price: number;
}
export function layoutMarkers(
  groups: { date: string; type: 'B' | 'S'; trades: Trade[] }[],
  candles: Candle[],
  width: number,
): ChartMarker[] {
  if (!candles.length || width <= 0) return [];
  const datePositions = new Map(candles.map((c, i) => [c.date, i]));
  const result: ChartMarker[] = [];
  for (const type of ['B', 'S'] as const) {
    let current: ChartMarker | undefined;
    let first = '';
    for (const group of groups
      .filter((g) => g.type === type)
      .sort((a, b) => a.date.localeCompare(b.date))) {
      const index = datePositions.get(group.date);
      if (index === undefined) continue;
      const px = ((index + 0.5) / candles.length) * width;
      if (current && px - current.x < 56) {
        current.trades.push(...group.trades);
        current.date = first === group.date ? first : `${first} 至 ${group.date}`;
      } else {
        first = group.date;
        current = {
          date: group.date,
          type,
          trades: [...group.trades],
          x: px,
          price: group.trades[0]!.price,
        };
        result.push(current);
      }
    }
  }
  return result.map((marker) => ({ ...marker, x: (marker.x / width) * 100 }));
}

export function projectTrades(candles: Candle[], trades: Trade[]) {
  const dates = new Map(candles.map((c, i) => [c.date, i]));
  return trades.flatMap((trade) => {
    const index = dates.get(trade.time.slice(0, 10));
    return index === undefined ? [] : [{ ...trade, x: ((index + 0.5) / candles.length) * 100 }];
  });
}
export function priceScale(candles: Candle[], trades: { price: number }[]) {
  const high = Math.max(...candles.map((c) => c.high), ...trades.map((t) => t.price));
  const low = Math.min(...candles.map((c) => c.low), ...trades.map((t) => t.price));
  const span = Math.max(high - low, high * 0.005);
  return { high, span, y: (price: number) => 30 + ((high - price) / span) * 240 };
}
export interface PositionedMarker extends ChartMarker {
  labelX: number;
  labelY: number;
  pointY: number;
}
export function positionMarkers(
  markers: ChartMarker[],
  width: number,
  y: (price: number) => number,
): PositionedMarker[] {
  const placed: { x: number; y: number }[] = [];
  return markers.map((marker) => {
    const anchorX = (marker.x / 100) * width;
    const pointY = y(marker.price);
    const clampX = (x: number) => Math.max(4, Math.min(width - 48, x));
    const clampY = (y: number) => Math.max(4, Math.min(252, y));
    const base = marker.type === 'B' ? pointY + 10 : pointY - 54;
    const opposite = marker.type === 'B' ? pointY - 54 : pointY + 10;
    const candidates = [
      base,
      opposite,
      pointY + 62,
      pointY - 106,
      4,
      56,
      108,
      160,
      212,
      252,
    ].flatMap((top) =>
      [0, -56, 56, -112, 112].map((dx) => ({ x: clampX(anchorX - 22 + dx), y: clampY(top) })),
    );
    const box =
      candidates.find(
        (box) =>
          !(
            anchorX >= box.x - 5 &&
            anchorX <= box.x + 49 &&
            pointY >= box.y - 5 &&
            pointY <= box.y + 49
          ) &&
          placed.every(
            (other) =>
              box.x + 48 <= other.x ||
              other.x + 48 <= box.x ||
              box.y + 48 <= other.y ||
              other.y + 48 <= box.y,
          ),
      ) ?? candidates[0]!;
    placed.push(box);
    return { ...marker, labelX: ((box.x + 22) / width) * 100, labelY: box.y, pointY };
  });
}
