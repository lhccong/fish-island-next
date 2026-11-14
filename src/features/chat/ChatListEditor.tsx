import { useState } from 'react';
import { Settings2 } from 'lucide-react';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { useChatListAppearance } from './chat-list-context';
import styles from './ChatListEditor.module.css';

export function ChatListEditor() {
  const { appearance, readError, save } = useChatListAppearance();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(appearance);
  const [error, setError] = useState('');
  return (
    <Dialog
      title="自定义聊天列表"
      description="仅修改列表外观，保存在当前浏览器；不创建真实任务或对话。"
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
      dismissLabel="关闭自定义列表"
      trigger={
        <button
          type="button"
          className={styles.trigger}
          aria-label="自定义聊天列表"
          title="自定义聊天列表"
        >
          <Settings2 size={18} aria-hidden="true" />
        </button>
      }
    >
      <div className={styles.scroll}>
        <ScrollArea label="列表设置滚动区" gutter="reserved">
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
            {draft.custom && (
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
