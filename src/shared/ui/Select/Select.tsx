import * as Primitive from '@radix-ui/react-select';
import { useEffect, useRef } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import styles from './Select.module.css';

interface SelectProps {
  label: string;
  value: string;
  options: readonly { value: string; label: string; disabled?: boolean }[];
  disabled?: boolean;
  appearance?: 'default' | 'pixel';
  placeholder?: string;
  onValueChange: (value: string) => void;
}

export function Select({
  label,
  value,
  options,
  disabled = false,
  appearance = 'default',
  placeholder = '请选择',
  onValueChange,
}: SelectProps) {
  const selected = options.find((option) => option.value === value);
  const trigger = useRef<HTMLButtonElement>(null);
  const focusAfterPending = useRef(false);
  useEffect(() => {
    if (!disabled && focusAfterPending.current) {
      focusAfterPending.current = false;
      trigger.current?.focus();
    }
  }, [disabled]);
  return (
    <Primitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <Primitive.Trigger
        ref={trigger}
        className={`${styles.trigger} ${appearance === 'pixel' ? styles.pixel : ''}`}
        aria-label={label}
      >
        <Primitive.Value placeholder={placeholder}>
          {selected?.label ?? placeholder}
        </Primitive.Value>
        <Primitive.Icon className={styles.icon}>
          <ChevronDown size={16} aria-hidden="true" />
        </Primitive.Icon>
      </Primitive.Trigger>
      <Primitive.Portal>
        <Primitive.Content
          className={`${styles.content} ${appearance === 'pixel' ? styles.pixel : ''}`}
          position="popper"
          sideOffset={6}
          collisionPadding={8}
          aria-label={label}
          onCloseAutoFocus={(event) => {
            // Async selection can disable the trigger before Radix restores focus.
            if (trigger.current?.disabled) {
              event.preventDefault();
              focusAfterPending.current = true;
            }
          }}
        >
          <Primitive.ScrollUpButton className={styles.scroll}>
            <ChevronUp size={16} aria-hidden="true" />
          </Primitive.ScrollUpButton>
          <Primitive.Viewport className={styles.viewport}>
            {options.map((option) => (
              <Primitive.Item
                className={styles.option}
                value={option.value}
                key={option.value}
                disabled={option.disabled}
              >
                <Primitive.ItemText>{option.label}</Primitive.ItemText>
                <Primitive.ItemIndicator className={styles.indicator}>
                  <Check size={16} aria-hidden="true" />
                </Primitive.ItemIndicator>
              </Primitive.Item>
            ))}
          </Primitive.Viewport>
          <Primitive.ScrollDownButton className={styles.scroll}>
            <ChevronDown size={16} aria-hidden="true" />
          </Primitive.ScrollDownButton>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
