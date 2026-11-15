import { useState } from 'react';
import { useStore } from 'zustand';
import { Link } from 'react-router';
import { Anchor, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { PixelIcon, type PixelIconName } from '@/shared/ui/PixelIcon';
import { Button } from '@/shared/ui/Button';
import { safeIslandHref } from '@/domain/my-island';
import { Select } from '@/shared/ui/Select';
import { useIsland } from './context';
import styles from './MyIsland.module.css';
const destinations = [
  { value: '/game/farm', label: '农场' },
  { value: '/pet', label: '伙伴' },
  { value: '/discover/games', label: '游戏' },
  { value: '/reader', label: '阅读' },
  { value: '/moments/fish-circle', label: '鱼小圈' },
  { value: '/', label: '热榜' },
  { value: 'custom', label: '自定义链接' },
];
function ShortcutIcon({ href }: { href: string }) {
  const name: PixelIconName =
    href === '/game/farm'
      ? 'garden'
      : href === '/pet'
        ? 'cat'
        : href === '/reader'
          ? 'book'
          : href === '/discover/games' || href.startsWith('/game/')
            ? 'gamepad'
            : href === '/moments/fish-circle'
              ? 'message'
              : href === '/'
                ? 'flame'
                : 'link';
  return <PixelIcon name={name} size={32} />;
}
export function IslandDock() {
  const { store, update } = useIsland();
  const shortcuts = useStore(store, (state) => state.data.shortcuts);
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState('/game/farm');
  const [label, setLabel] = useState('');
  const [href, setHref] = useState('');
  const [error, setError] = useState('');
  return (
    <section className={styles.module} aria-label="快捷码头">
      <h3>
        <Anchor size={17} aria-hidden="true" />
        快捷码头
        <button
          className={styles.icon}
          type="button"
          aria-label="编辑快捷码头"
          aria-expanded={editing}
          onClick={() => setEditing(!editing)}
        >
          <Pencil size={15} aria-hidden="true" />
        </button>
      </h3>
      <div className={styles.dock}>
        {shortcuts.map((shortcut) => (
          <div className={styles.dockItem} key={shortcut.id}>
            {shortcut.href.startsWith('/') ? (
              <Link to={shortcut.href}>
                <ShortcutIcon href={shortcut.href} />
                <span className={styles.shortcutLabel}>{shortcut.label}</span>
              </Link>
            ) : (
              <a
                href={shortcut.href}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
              >
                <ShortcutIcon href={shortcut.href} />
                <span className={styles.shortcutLabel}>{shortcut.label}</span>
                <ExternalLink size={12} aria-hidden="true" />
              </a>
            )}
            {editing && (
              <button
                className={styles.icon}
                type="button"
                aria-label={`移除快捷入口：${shortcut.label}`}
                onClick={() =>
                  update((data) => ({
                    shortcuts: data.shortcuts.filter((item) => item.id !== shortcut.id),
                  }))
                }
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
        {!editing && shortcuts.length < 12 && (
          <button type="button" className={styles.addDock} onClick={() => setEditing(true)}>
            <Plus size={16} aria-hidden="true" />
            添加
          </button>
        )}
      </div>
      {!shortcuts.length && <p className={styles.muted}>码头还空着，添加一个常用入口吧。</p>}
      {editing && (
        <form
          className={styles.fields}
          onSubmit={(event) => {
            event.preventDefault();
            const url = target === 'custom' ? href.trim() : target;
            const name =
              label.trim() || destinations.find((item) => item.value === target)?.label || '';
            if (!safeIslandHref(url) || (target === 'custom' && !label.trim()))
              return setError('请输入名称与有效的 HTTP(S) 或站内链接。');
            if (shortcuts.length >= 12) return setError('最多添加 12 个快捷入口。');
            update((data) => ({
              shortcuts: [...data.shortcuts, { id: crypto.randomUUID(), label: name, href: url }],
            }));
            setError('');
            setLabel('');
            setHref('');
          }}
        >
          <Select
            label="快捷入口功能"
            value={target}
            options={destinations}
            onValueChange={setTarget}
          />
          <input
            aria-label="快捷入口名称"
            placeholder="入口名称（可自定义）"
            maxLength={20}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
          {target === 'custom' && (
            <input
              aria-label="快捷入口链接"
              placeholder="https://… 或 /站内路径"
              maxLength={2048}
              value={href}
              onChange={(event) => setHref(event.target.value)}
            />
          )}
          {error && <p role="alert">{error}</p>}
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              完成
            </Button>
            <Button type="submit" disabled={shortcuts.length >= 12}>
              <Plus size={14} aria-hidden="true" />
              添加入口
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
