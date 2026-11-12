import styles from './Switch.module.css';
export function Switch({
  label,
  checked,
  disabled = false,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      className={styles.switch}
      onClick={() => onCheckedChange(!checked)}
    >
      <span className={styles.track}>
        <span className={styles.thumb} />
      </span>
    </button>
  );
}
