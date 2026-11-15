import { useStore } from 'zustand';
import { NotebookPen } from 'lucide-react';
import { useIsland } from './context';
import styles from './MyIsland.module.css';
import { useId } from 'react';
export function IslandNote() {
  const { store, update } = useIsland();
  const note = useStore(store, (state) => state.data.note);
  const id = useId();
  return (
    <section className={styles.module} aria-label="随手记">
      <h3>
        <NotebookPen size={17} aria-hidden="true" />
        <label htmlFor={id}>随手记</label>
      </h3>
      <textarea
        id={id}
        aria-label="随手记"
        placeholder="记下此刻的想法…"
        maxLength={5000}
        value={note}
        onChange={(event) => update({ note: event.target.value })}
      />
      <span className={styles.muted}>{note.length}/5000 · 自动保存到本机</span>
    </section>
  );
}
