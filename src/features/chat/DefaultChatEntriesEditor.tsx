import { useId, useState } from 'react';
import { GripVertical } from 'lucide-react';
import type { ConversationListEdit } from '@/domain/chat';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { orderConversations, type ConversationEditorRow } from './camouflage-conversations';
import { ChatListOrderButtons } from './ChatListOrderButtons';
import { ConversationEditorToggle } from './ConversationEditorToggle';
import { useConversationDrag } from './use-conversation-drag';
import styles from './ChatListEditor.module.css';

const emptyEdit: ConversationListEdit = { name: '', preview: '' };

export function DefaultChatEntriesEditor({
  entries,
  status,
  order,
  edits,
  onRefresh,
  onOrderChange,
  onEdit,
}: {
  entries: readonly ConversationEditorRow[];
  status: 'loading' | 'error' | 'success';
  order?: string[] | undefined;
  edits?: Record<string, ConversationListEdit> | undefined;
  onRefresh: () => void;
  onOrderChange: (order: string[]) => void;
  onEdit: (key: string, edit: ConversationListEdit) => void;
}) {
  const [expanded, setExpanded] = useState<string>();
  const fieldsId = useId();
  const ordered = orderConversations(entries, order);
  const {
    listRef,
    preview: dragPreview,
    moveAndFocus,
    pointerHandlers,
  } = useConversationDrag(moveConversation);

  function moveConversation(key: string, drop: { key: string; edge: 'before' | 'after' }) {
    const from = ordered.findIndex((row) => row.key === key);
    const target = ordered.findIndex((row) => row.key === drop.key);
    if (from < 0 || target < 0 || from === target) return false;
    const to = target + (drop.edge === 'after' ? 1 : 0) - (from < target ? 1 : 0);
    if (from === to) return false;
    const next = ordered.map((row) => row.key);
    next.splice(from, 1);
    next.splice(to, 0, key);
    const visible = new Set(next);
    onOrderChange([...next, ...(order ?? []).filter((row) => !visible.has(row))]);
    return true;
  }

  if (status === 'loading') return <LoadingIndicator>正在加载列表…</LoadingIndicator>;
  if (status === 'error')
    return (
      <div role="alert" className={styles.notice}>
        <p>暂时无法加载列表，请检查网络后重试</p>
        <Button variant="secondary" onClick={onRefresh}>
          重试
        </Button>
      </div>
    );
  if (!entries.length)
    return (
      <div className={styles.notice}>
        <p role="status">暂无可编辑的对话</p>
        <Button variant="secondary" onClick={onRefresh}>
          刷新列表
        </Button>
      </div>
    );

  return (
    <>
      <Button variant="secondary" disabled={!order?.length} onClick={() => onOrderChange([])}>
        恢复默认顺序
      </Button>
      <ol ref={listRef} className={styles.conversationList} aria-label="对话顺序">
        {ordered.map((entry, index) => {
          const edit = edits?.[entry.key] ?? emptyEdit;
          const name = edit.name.trim() || entry.defaultName || '未命名对话';
          const preview = edit.preview.trim() || entry.defaultPreview;
          const isOpen = expanded === entry.key;
          const toggle = () => setExpanded(isOpen ? undefined : entry.key);
          return (
            <li
              key={entry.key}
              className={styles.conversation}
              data-conversation-key={entry.key}
              data-dragging={dragPreview?.source === entry.key || undefined}
              data-drop-edge={
                dragPreview?.drop?.key === entry.key ? dragPreview.drop.edge : undefined
              }
            >
              <div className={styles.conversationHeader}>
                <ConversationEditorToggle
                  entry={entry}
                  name={name}
                  preview={preview}
                  expanded={isOpen}
                  fieldsId={fieldsId}
                  onToggle={toggle}
                />
                <Button
                  variant="secondary"
                  className={styles.dragHandle}
                  aria-label={`排序${name}`}
                  aria-description={`第 ${index + 1} 项。按上下方向键移动，按回车展开操作。`}
                  aria-keyshortcuts="ArrowUp ArrowDown"
                  title="拖动排序，点击展开操作"
                  {...pointerHandlers(entry.key, toggle)}
                  onKeyDown={(event) => {
                    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
                    event.preventDefault();
                    const direction = event.key === 'ArrowUp' ? -1 : 1;
                    const target = ordered[index + direction];
                    if (target)
                      moveAndFocus(
                        entry.key,
                        { key: target.key, edge: direction === -1 ? 'before' : 'after' },
                        event.currentTarget,
                      );
                  }}
                >
                  <GripVertical size={18} aria-hidden="true" />
                </Button>
              </div>
              {isOpen && (
                <div id={fieldsId} className={styles.conversationFields}>
                  <label className={styles.field}>
                    显示名称
                    <input
                      maxLength={30}
                      placeholder={entry.defaultName || '默认名称'}
                      value={edit.name}
                      onChange={(event) => onEdit(entry.key, { ...edit, name: event.target.value })}
                    />
                  </label>
                  <label className={styles.field}>
                    摘要
                    <input
                      maxLength={100}
                      placeholder={entry.defaultPreview}
                      value={edit.preview}
                      onChange={(event) =>
                        onEdit(entry.key, { ...edit, preview: event.target.value })
                      }
                    />
                  </label>
                  <div className={styles.actions}>
                    <ChatListOrderButtons
                      name={name}
                      index={index}
                      count={ordered.length}
                      onMove={(direction) => {
                        const target = ordered[index + direction];
                        if (target)
                          moveConversation(entry.key, {
                            key: target.key,
                            edge: direction === -1 ? 'before' : 'after',
                          });
                      }}
                    />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}
