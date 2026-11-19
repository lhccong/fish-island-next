import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { useChatListAppearance } from './chat-list-context';
import { moveListItem, type ConversationEditorRow } from './camouflage-conversations';
import { DefaultChatEntriesEditor } from './DefaultChatEntriesEditor';
import { ChatListOrderButtons } from './ChatListOrderButtons';
import styles from './ChatListEditor.module.css';

export function ChatListEditor({
  entries,
  status,
  onRefresh,
}: {
  entries: readonly ConversationEditorRow[];
  status: 'loading' | 'error' | 'success';
  onRefresh: () => void;
}) {
  const { appearance, readError, save } = useChatListAppearance();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(appearance);
  const [error, setError] = useState('');
  return (
    <Dialog
      title="编辑聊天列表"
      description="设置保存在当前浏览器。默认对话的文案留空可恢复原文。"
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setDraft(appearance);
          setError('');
        }
        setOpen(next);
      }}
      className={styles.dialog ?? ''}
      showCloseAction={false}
      dismissLabel="关闭列表编辑"
      trigger={
        <button
          type="button"
          className={styles.trigger}
          aria-label="编辑聊天列表"
          title="编辑聊天列表"
        >
          <Pencil size={18} aria-hidden="true" />
        </button>
      }
    >
      <div className={styles.scroll}>
        <ScrollArea label="列表设置滚动区" gutter="reserved" fillContent>
          <div className={styles.body}>
            <Select
              label="列表显示方式"
              value={draft.custom ? 'custom' : 'default'}
              options={[
                { value: 'default', label: '默认对话列表' },
                { value: 'custom', label: '自定义清单' },
              ]}
              onValueChange={(value) => setDraft({ ...draft, custom: value === 'custom' })}
            />
            <label className={styles.field}>
              群聊摘要
              <input
                maxLength={100}
                value={draft.groupPreview}
                onChange={(event) => setDraft({ ...draft, groupPreview: event.target.value })}
              />
            </label>
            {draft.custom ? (
              <>
                {draft.entries.length === 0 && (
                  <p className={styles.notice} role="status">
                    清单还是空的，添加第一条内容吧
                  </p>
                )}
                {draft.entries.map((entry, index) => (
                  <fieldset key={entry.id} className={styles.entry}>
                    <legend>条目 {index + 1}</legend>
                    <label className={styles.field}>
                      名称
                      <input
                        maxLength={30}
                        value={entry.name}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            entries: draft.entries.map((row) =>
                              row.id === entry.id ? { ...row, name: event.target.value } : row,
                            ),
                          })
                        }
                      />
                    </label>
                    <label className={styles.field}>
                      摘要
                      <input
                        maxLength={100}
                        value={entry.preview}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            entries: draft.entries.map((row) =>
                              row.id === entry.id ? { ...row, preview: event.target.value } : row,
                            ),
                          })
                        }
                      />
                    </label>
                    <div className={styles.actions}>
                      <ChatListOrderButtons
                        name={`条目 ${index + 1}`}
                        index={index}
                        count={draft.entries.length}
                        onMove={(direction) =>
                          setDraft({
                            ...draft,
                            entries: moveListItem(draft.entries, index, direction),
                          })
                        }
                      />
                      <Button
                        variant="secondary"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            entries: draft.entries.filter((row) => row.id !== entry.id),
                          })
                        }
                        aria-label={`删除条目 ${index + 1}`}
                      >
                        删除
                      </Button>
                    </div>
                  </fieldset>
                ))}
                <Button
                  variant="secondary"
                  disabled={draft.entries.length >= 50}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      entries: [
                        ...draft.entries,
                        { id: crypto.randomUUID(), name: '', preview: '' },
                      ],
                    })
                  }
                >
                  添加条目
                </Button>
                {draft.entries.length >= 50 && <p className={styles.notice}>最多添加 50 条</p>}
              </>
            ) : (
              <DefaultChatEntriesEditor
                entries={entries}
                status={status}
                order={draft.conversationOrder}
                edits={draft.conversationEdits}
                onRefresh={onRefresh}
                onOrderChange={(conversationOrder) =>
                  setDraft((current) => ({ ...current, conversationOrder }))
                }
                onEdit={(key, edit) =>
                  setDraft((current) => ({
                    ...current,
                    conversationEdits: { ...current.conversationEdits, [key]: edit },
                  }))
                }
              />
            )}
          </div>
        </ScrollArea>
      </div>
      {(error || readError) && (
        <p className={styles.error} role="alert">
          {error || readError}
        </p>
      )}
      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          取消
        </Button>
        <Button
          onClick={() => {
            try {
              save(draft);
              setOpen(false);
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : '保存失败，请重试');
            }
          }}
        >
          保存
        </Button>
      </div>
    </Dialog>
  );
}
