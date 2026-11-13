const percentStats = new Set([
  '暴击率',
  '闪避率',
  '格挡率',
  '连击率',
  '生命汲取',
  '暴击抵抗',
  '闪避抵抗',
  '格挡抵抗',
  '连击抵抗',
  '汲取抵抗',
]);
const numeric = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2, useGrouping: false });

export function formatPetNumber(value: number) {
  return numeric.format(Object.is(value, -0) ? 0 : value);
}

export function formatPetStat(label: string, value: number, signed = false) {
  const percent = percentStats.has(label);
  const display = formatPetNumber(percent ? value * 100 : value);
  return `${signed && value >= 0 ? '+' : ''}${display}${percent ? '%' : ''}`;
}
