import { useRef } from 'react';
import { useRemark } from './remarks-context';
import { useUserCard } from './user-card-context';
import styles from './Remarks.module.css';

export function RemarkName({
  id,
  name,
  interactive = true,
  level,
  titleId,
  region,
}: {
  id: string;
  name: string;
  interactive?: boolean;
  level?: number | undefined;
  titleId?: string | undefined;
  region?: string | undefined;
}) {
  const remark = useRemark(id);
  const open = useUserCard();
  const ref = useRef<HTMLButtonElement>(null);
  if (!interactive)
    return <span title={remark ? `${remark}（${name}）` : name}>{remark || name}</span>;
  return (
    <button
      ref={ref}
      type="button"
      className={styles.name}
      title={remark ? `${remark}（${name}）` : name}
      aria-label={`查看${name}的用户卡片`}
      onClick={() => open({ id, name, level, titleId, region, returnFocusRef: ref })}
    >
      {remark || name}
    </button>
  );
}
