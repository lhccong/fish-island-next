import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { JsonValue } from '@/domain/json-tools';
import styles from './JsonTree.module.css';

function JsonNode({
  label,
  value,
  depth,
  expandDepth,
}: {
  label?: string;
  value: JsonValue;
  depth: number;
  expandDepth: number;
}) {
  const [open, setOpen] = useState(depth < expandDepth);
  const entries = value !== null && typeof value === 'object' ? Object.entries(value) : [];
  const array = Array.isArray(value);
  const name = label !== undefined && <span className={styles.key}>{label}: </span>;
  if (entries.length === 0) {
    return (
      <div className={styles.leaf}>
        {name}
        <span data-json-type={typeof value}>{JSON.stringify(value)}</span>
      </div>
    );
  }
  return (
    <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className={styles.branch}>
        <ChevronRight className={styles.chevron} size={16} aria-hidden="true" />
        <span>
          {name}
          <span className={styles.count}>
            {array ? `[${entries.length}]` : `{${entries.length}}`}
          </span>
        </span>
      </summary>
      {open && (
        <ul className={styles.children} data-indent={depth < 5}>
          {entries.map(([key, child]) => (
            <li key={key}>
              <JsonNode
                label={array ? `[${key}]` : JSON.stringify(key)}
                value={child}
                depth={depth + 1}
                expandDepth={expandDepth}
              />
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

export function JsonTree({ value, expandDepth }: { value: JsonValue; expandDepth: string }) {
  return (
    <div className={styles.tree}>
      <JsonNode value={value} depth={0} expandDepth={Number(expandDepth)} />
    </div>
  );
}
