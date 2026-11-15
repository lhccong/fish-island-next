import type { ComponentPropsWithoutRef } from 'react';
import { Select } from '@/shared/ui/Select';
import styles from './Admin.module.css';
export function Field({ label, ...props }: ComponentPropsWithoutRef<'input'> & { label: string }) {
  return (
    <label className={styles.field}>
      {label}
      <input {...props} />
    </label>
  );
}
export function TextField({
  label,
  ...props
}: ComponentPropsWithoutRef<'textarea'> & { label: string }) {
  return (
    <label className={`${styles.field} ${styles.full}`}>
      {label}
      <textarea {...props} />
    </label>
  );
}
export function Choice({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <div className={styles.field}>
      <span>{label}</span>
      <Select label={label} value={value} onValueChange={onChange} options={options} />
    </div>
  );
}
