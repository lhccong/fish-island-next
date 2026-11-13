import { useRef } from 'react';
import { useRemark, useRemarks } from './remarks-context';
import styles from './Remarks.module.css';

export function RemarkName({
  id,
  name,
  interactive = true,
}: {
  id: string;
  name: string;
  interactive?: boolean;
}) {
  const remark = useRemark(id);
  const { open } = useRemarks();
  const ref = useRef<HTMLButtonElement>(null);
  if (!interactive)
    return <span title={remark ? `${remark}（${name}）` : name}>{remark || name}</span>;
  return (
    <button
      ref={ref}
      type="button"
      className={styles.name}
      title={remark ? `${remark}（${name}）· 修改备注` : `${name} · 设置备注`}
      aria-label={`设置${name}的备注`}
      onClick={() => open({ id, name, returnFocusRef: ref })}
    >
      {remark || name}
    </button>
  );
}
