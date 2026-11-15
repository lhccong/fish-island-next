import { useState } from 'react';
import { PawPrint } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import styles from './PetWorkspace.module.css';

export function PetWelcome({
  pending,
  disabled,
  onCreate,
}: {
  pending: boolean;
  disabled: boolean;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState('');
  return (
    <section className={styles.welcome}>
      <PawPrint size={32} aria-hidden="true" />
      <h2>营地正等着第一位伙伴</h2>
      <p>给它起个名字，开启你们的岛屿日常。</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onCreate(name.trim());
        }}
      >
        <input
          aria-label="新伙伴名字"
          placeholder="输入伙伴名字"
          maxLength={20}
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <Button type="submit" disabled={disabled || !name.trim()}>
          {pending ? <LoadingIndicator compact>正在领养…</LoadingIndicator> : '领养伙伴'}
        </Button>
      </form>
    </section>
  );
}
