import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import styles from './LoginForm.module.css';

export function RegistrationPassword({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <div className={styles.field}>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          required
          minLength={8}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder={label === '密码' ? '至少 8 位' : '请再次输入密码'}
        />
        <button
          type="button"
          aria-label={`${visible ? '隐藏' : '显示'}${label}`}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
    </>
  );
}
