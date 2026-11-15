import { useState } from 'react';
import { useStore } from 'zustand';
import { CheckSquare, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { useIsland } from './context';
import styles from './MyIsland.module.css';

export function IslandTasks() {
  const { store, update } = useIsland();
  const tasks = useStore(store, (state) => state.data.tasks);
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);
  const done = tasks.filter((task) => task.done).length;
  return (
    <section className={styles.module} aria-label="今日待办">
      <h3>
        <CheckSquare size={17} aria-hidden="true" />
        今日待办{' '}
        <span>
          {done}/{tasks.length}
        </span>
      </h3>
      <progress aria-label="待办完成进度" max={Math.max(1, tasks.length)} value={done} />
      {!tasks.length && <p className={styles.muted}>给今天安排一件小事吧。</p>}
      <ul className={styles.tasks}>
        {tasks.map((task) => (
          <li key={task.id}>
            <label className={styles.task}>
              <input
                type="checkbox"
                checked={task.done}
                onChange={() =>
                  update((data) => ({
                    tasks: data.tasks.map((item) =>
                      item.id === task.id ? { ...item, done: !item.done } : item,
                    ),
                  }))
                }
              />
              <span data-done={task.done}>{task.text}</span>
            </label>
            <button
              type="button"
              className={styles.icon}
              aria-label={`删除待办：${task.text}`}
              onClick={() =>
                update((data) => ({ tasks: data.tasks.filter((item) => item.id !== task.id) }))
              }
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      {!adding ? (
        <button
          type="button"
          className={styles.addTodo}
          disabled={tasks.length >= 100}
          onClick={() => setAdding(true)}
        >
          <Plus size={14} aria-hidden="true" />
          添加待办
        </button>
      ) : (
        <form
          className={styles.addTask}
          onSubmit={(event) => {
            event.preventDefault();
            if (!text.trim() || tasks.length >= 100) return;
            update((data) => ({
              tasks: [...data.tasks, { id: crypto.randomUUID(), text: text.trim(), done: false }],
            }));
            setText('');
            setAdding(false);
          }}
        >
          <input
            aria-label="新待办"
            placeholder="添加一件小事…"
            value={text}
            maxLength={120}
            disabled={tasks.length >= 100}
            onChange={(event) => setText(event.target.value)}
          />
          <Button type="submit" variant="secondary" disabled={!text.trim() || tasks.length >= 100}>
            <Plus size={15} aria-hidden="true" />
            添加
          </Button>
        </form>
      )}
      {tasks.length >= 100 && (
        <p className={styles.muted}>最多保留 100 条待办，请先清理已完成任务。</p>
      )}
    </section>
  );
}
