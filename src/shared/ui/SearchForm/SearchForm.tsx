import { useRef, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import styles from './SearchForm.module.css';

export function SearchForm({
  label,
  placeholder,
  keyword,
  onSearch,
}: {
  label: string;
  placeholder: string;
  keyword: string;
  onSearch: (keyword: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState('');
  return (
    <form
      className={styles.form}
      role="search"
      aria-label={label}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onSearch(input.trim());
      }}
    >
      <input
        ref={inputRef}
        aria-label={label}
        placeholder={placeholder}
        maxLength={80}
        enterKeyHint="search"
        value={input}
        onChange={(event) => setInput(event.target.value)}
      />
      {(input || keyword) && (
        <Button
          variant="secondary"
          aria-label="清空搜索"
          onClick={() => {
            setInput('');
            if (keyword) onSearch('');
            inputRef.current?.focus();
          }}
        >
          清空
        </Button>
      )}
      <Button type="submit" disabled={!input.trim() && !keyword}>
        搜索
      </Button>
    </form>
  );
}
