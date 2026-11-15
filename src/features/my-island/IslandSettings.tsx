import { useStore } from 'zustand';
import { useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Select } from '@/shared/ui/Select';
import { Switch } from '@/shared/ui/Switch';
import { useIsland } from './context';
import styles from './MyIsland.module.css';
const names = { tasks: '今日待办', note: '随手记', dock: '快捷码头' };
export function IslandSettings() {
  const { store, update } = useIsland();
  const name = useStore(store, (state) => state.data.name);
  const [draftName, setDraftName] = useState(name);
  const motto = useStore(store, (state) => state.data.motto);
  const decoration = useStore(store, (state) => state.data.decoration);
  const modules = useStore(store, (state) => state.data.modules);
  function move(index: number, offset: number) {
    const next = [...modules];
    const other = index + offset;
    if (other < 0 || other >= next.length) return;
    [next[index], next[other]] = [next[other]!, next[index]!];
    update({ modules: next });
  }
  return (
    <section className={styles.fields} aria-label="自定义小岛">
      <label>
        岛名
        <input
          aria-label="岛名"
          maxLength={24}
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          onBlur={() => {
            const next = draftName.trim() || '我的小岛';
            update({ name: next });
            setDraftName(next);
          }}
        />
      </label>
      <label>
        寄语
        <input
          aria-label="小岛寄语"
          maxLength={60}
          value={motto}
          onChange={(event) => update({ motto: event.target.value })}
        />
      </label>
      <Select
        label="小屋装饰"
        value={decoration}
        options={[
          { value: 'cabin', label: '海边小屋' },
          { value: 'palms', label: '椰树小屋' },
          { value: 'harbor', label: '钓鱼码头' },
        ]}
        onValueChange={(value) => {
          if (value === 'cabin' || value === 'palms' || value === 'harbor')
            update({ decoration: value });
        }}
      />
      <h3>模块顺序与显示</h3>
      {modules.map((module, index) => (
        <div className={styles.moduleSetting} key={module.id}>
          <span>{names[module.id]}</span>
          <Switch
            label={`显示${names[module.id]}`}
            checked={module.visible}
            onCheckedChange={(visible) =>
              update({
                modules: modules.map((item) =>
                  item.id === module.id ? { ...item, visible } : item,
                ),
              })
            }
          />
          <button
            className={styles.icon}
            type="button"
            disabled={index === 0}
            aria-label={`上移${names[module.id]}`}
            onClick={() => move(index, -1)}
          >
            <ArrowUp size={16} aria-hidden="true" />
          </button>
          <button
            className={styles.icon}
            type="button"
            disabled={index === modules.length - 1}
            aria-label={`下移${names[module.id]}`}
            onClick={() => move(index, 1)}
          >
            <ArrowDown size={16} aria-hidden="true" />
          </button>
        </div>
      ))}
    </section>
  );
}
