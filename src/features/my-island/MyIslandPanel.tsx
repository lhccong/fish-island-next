import { useState } from 'react';
import { useStore } from 'zustand';
import { CheckCircle2, Pencil, SlidersHorizontal } from 'lucide-react';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useIsland } from './context';
import { IslandTasks } from './IslandTasks';
import { IslandNote } from './IslandNote';
import { IslandDock } from './IslandDock';
import { IslandSettings } from './IslandSettings';
import styles from './MyIsland.module.css';

export function MyIslandPanel({
  presentation = 'standalone',
  editing: controlledEditing,
  onEditingChange,
}: {
  presentation?: 'standalone' | 'embedded';
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
}) {
  const { store, flush } = useIsland();
  const name = useStore(store, (state) => state.data.name);
  const motto = useStore(store, (state) => state.data.motto);
  const decoration = useStore(store, (state) => state.data.decoration);
  const modules = useStore(store, (state) => state.data.modules);
  const status = useStore(store, (state) => state.status);
  const error = useStore(store, (state) => state.error);
  const [localEditing, setLocalEditing] = useState(false);
  const editing = controlledEditing ?? localEditing;
  const setEditing = onEditingChange ?? setLocalEditing;
  return (
    <section className={styles.panel} aria-label="我的小岛面板" data-presentation={presentation}>
      <header className={styles.heading} hidden={presentation === 'embedded'}>
        <h2 title={name}>{name}</h2>
        <button
          type="button"
          className={styles.edit}
          aria-label={editing ? '完成小岛编辑' : '编辑我的小岛'}
          aria-expanded={editing}
          onClick={() => setEditing(!editing)}
        >
          <Pencil size={15} aria-hidden="true" />
          {editing ? '完成' : '编辑'}
        </button>
      </header>
      <div className={styles.scroll}>
        <ScrollArea label="我的小岛内容" gutter="reserved">
          <div className={styles.body}>
            {editing ? (
              <>
                <IslandSettings />
                {presentation === 'embedded' && (
                  <Button
                    variant="secondary"
                    aria-label="完成小岛编辑"
                    onClick={() => setEditing(false)}
                  >
                    完成
                  </Button>
                )}
              </>
            ) : (
              <>
                {presentation === 'embedded' && name !== '我的小岛' && (
                  <h3 className={styles.savedName}>{name}</h3>
                )}
                <div className={styles.scene} data-decoration={decoration} aria-hidden="true" />
                <div className={styles.greeting}>
                  <p className={styles.motto}>{motto || '给小岛留一句寄语吧。'}</p>
                  <button
                    type="button"
                    className={styles.decorate}
                    onClick={() => setEditing(true)}
                  >
                    装扮小岛 ›
                  </button>
                </div>
                {modules
                  .filter((module) => module.visible)
                  .map((module) =>
                    module.id === 'tasks' ? (
                      <IslandTasks key={module.id} />
                    ) : module.id === 'note' ? (
                      <IslandNote key={module.id} />
                    ) : (
                      <IslandDock key={module.id} />
                    ),
                  )}
                {modules.every((module) => !module.visible) && (
                  <p className={styles.muted}>小岛很清静。打开自定义模块，选一些喜欢的内容吧。</p>
                )}
                <button type="button" className={styles.customize} onClick={() => setEditing(true)}>
                  <SlidersHorizontal size={17} aria-hidden="true" />
                  自定义模块
                </button>
              </>
            )}
          </div>
        </ScrollArea>
      </div>
      <footer className={styles.feedback}>
        {status === 'saving' ? (
          <LoadingIndicator compact>正在保存到本机…</LoadingIndicator>
        ) : error ? (
          <div role="alert">
            <span>{error}</span>
            <Button variant="secondary" onClick={flush}>
              重试保存
            </Button>
          </div>
        ) : (
          <span role="status">
            <CheckCircle2 size={13} aria-hidden="true" />
            已保存到本机
          </span>
        )}
      </footer>
    </section>
  );
}
