import { useRef, useState } from 'react';
import type { ForumPort, ForumPost, ForumDraft } from '@/domain/forum';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { ForumMarkdown } from './ForumMarkdown';
import { useOperation } from './use-operation';
import styles from './Forum.module.css';

export function ForumEditor({
  service,
  original,
  onSaved,
  onClose,
}: {
  service: ForumPort;
  original: ForumPost | null;
  onSaved: (id: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ForumDraft>(() => ({
    title: original?.title || '',
    content: original?.content || '',
    tags: original?.tags || [],
    coverImage: original?.cover || '',
  }));
  const [preview, setPreview] = useState(false);
  const operation = useOperation();
  const upload = useOperation();
  const input = useRef<HTMLInputElement>(null);
  return (
    <form
      className={styles.editor}
      onSubmit={(e) => {
        e.preventDefault();
        if (!draft.title.trim() || !draft.content.trim()) return;
        void operation.run(async (signal) => {
          const id = await service.save(
            { ...draft, title: draft.title.trim(), content: draft.content.trim() },
            original?.id || null,
            signal,
          );
          if (!signal.aborted) onSaved(id);
        });
      }}
    >
      <ScrollArea label="帖子编辑正文" gutter="reserved" className={styles.scroll ?? ''}>
        <div className={styles.page}>
          <h1>{original ? '编辑帖子' : '发布帖子'}</h1>
          <label className={styles.field}>
            标题
            <input
              required
              maxLength={80}
              value={draft.title}
              disabled={operation.busy}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="给话题起个标题"
            />
          </label>
          <div className={styles.actions}>
            <Button
              variant="secondary"
              aria-pressed={preview}
              onClick={() => setPreview((v) => !v)}
            >
              {preview ? '继续编辑' : '预览正文'}
            </Button>
            <Button
              variant="secondary"
              disabled={operation.busy || upload.busy}
              onClick={() => input.current?.click()}
            >
              上传图片
            </Button>
            <input
              hidden
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              ref={input}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file)
                  void upload.run(async (signal) => {
                    const url = await service.upload(file, signal);
                    if (!signal.aborted)
                      setDraft((d) => ({ ...d, content: `${d.content}\n\n![图片](${url})\n` }));
                  }, '图片已插入正文');
              }}
            />
          </div>
          {upload.busy && <LoadingIndicator compact>正在上传图片…</LoadingIndicator>}
          {upload.message && <p role="status">{upload.message}</p>}
          {preview ? (
            <ForumMarkdown content={draft.content || '暂无正文'} />
          ) : (
            <label className={styles.field}>
              正文
              <textarea
                required
                rows={16}
                value={draft.content}
                disabled={operation.busy}
                onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
                placeholder="分享你的想法，支持 Markdown"
              />
            </label>
          )}
          <label className={styles.field}>
            标签（用逗号分隔，最多 5 个）
            <input
              value={draft.tags.join(', ')}
              disabled={operation.busy}
              onChange={(e) =>
                setDraft((d) => ({ ...d, tags: e.target.value.split(/[,，]/).slice(0, 5) }))
              }
              onBlur={() =>
                setDraft((d) => ({
                  ...d,
                  tags: [...new Set(d.tags.map((t) => t.trim()).filter(Boolean))],
                }))
              }
            />
          </label>
          <label className={styles.field}>
            封面图片地址（可选）
            <input
              type="url"
              value={draft.coverImage}
              disabled={operation.busy}
              onChange={(e) => setDraft((d) => ({ ...d, coverImage: e.target.value }))}
            />
          </label>
        </div>
      </ScrollArea>
      <footer className={styles.footer}>
        {operation.message && <p role="alert">{operation.message}</p>}
        <div className={styles.actions}>
          <Button variant="secondary" disabled={operation.busy || upload.busy} onClick={onClose}>
            取消
          </Button>
          <Button
            type="submit"
            disabled={operation.busy || upload.busy || !draft.title.trim() || !draft.content.trim()}
          >
            {operation.busy ? (
              <LoadingIndicator compact>正在保存…</LoadingIndicator>
            ) : original ? (
              '保存修改'
            ) : (
              '发布帖子'
            )}
          </Button>
        </div>
      </footer>
    </form>
  );
}
