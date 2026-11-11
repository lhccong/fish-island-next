import type { ComponentPropsWithRef } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: 'primary' | 'secondary';
}

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button {...props} type={type} className={`${styles.button} ${styles[variant]} ${className}`} />
  );
}
