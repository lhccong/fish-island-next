import { useId } from 'react';
import type { Land } from '@/domain/farm';
import styles from './Farm.module.css';
export function FieldGround({ lands, columns }: { lands: Land[]; columns: number }) {
  const pattern = useId();
  const rows = Math.ceil(lands.length / columns);
  const open = new Set(lands.flatMap((l, i) => (!l.locked ? [i] : [])));
  const edges: string[] = [];
  for (const index of open) {
    const col = index % columns;
    const x = col * 100;
    const y = Math.floor(index / columns) * 100;
    if (!open.has(index - columns)) edges.push(`M${x} ${y}h100`);
    if (!open.has(index + columns)) edges.push(`M${x} ${y + 100}h100`);
    if (col === 0 || !open.has(index - 1)) edges.push(`M${x} ${y}v100`);
    if (col === columns - 1 || !open.has(index + 1)) edges.push(`M${x + 100} ${y}v100`);
  }
  return (
    <svg
      className={`${styles.ground} ${columns === 6 ? styles.desktopGround : styles.mobileGround}`}
      viewBox={`-3 -3 ${columns * 100 + 6} ${rows * 100 + 6}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <pattern id={pattern} width="100" height="20" patternUnits="userSpaceOnUse">
          <rect width="100" height="20" fill="var(--color-farm-soil)" />
          <path d="M0 16H100" stroke="var(--color-farm-furrow)" strokeWidth="3" />
          <path d="M0 4H100" stroke="var(--color-farm-edge)" strokeWidth="1" opacity="0.4" />
        </pattern>
      </defs>
      {Array.from(open).map((index) => (
        <rect
          key={index}
          x={(index % columns) * 100}
          y={Math.floor(index / columns) * 100}
          width="100"
          height="100"
          fill={`url(#${pattern})`}
        />
      ))}
      <path
        d={edges.join('')}
        fill="none"
        stroke="var(--color-farm-edge)"
        strokeWidth="5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
