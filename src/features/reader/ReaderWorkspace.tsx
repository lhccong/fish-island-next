import { useEffect, useRef, useState } from 'react';
import { BookOpen, Plus, Settings, Trash2, List } from 'lucide-react';
import { type ReaderService } from '@/domain/reader';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import type { ReaderController } from './controller';
import { useReader } from './use-reader';
import { BookImportDialog } from './BookImportDialog';
import { ReaderSettingsPanel } from './ReaderSettingsPanel';
import styles from './Reader.module.css';

export function ReaderWorkspace({
  controller,
  service,
  onOpen,
}: {
  controller: ReaderController;
  service: ReaderService;
  onOpen: () => void;
}) {
  const books = useReader(controller, (state) => state.books);
  const initialized = useReader(controller, (state) => state.initialized);
  const storageError = useReader(controller, (state) => state.storageError);
  const study = useReader(controller, (state) => state.settings.study);
  const [adding, setAdding] = useState(false);
  const [settings, setSettings] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const addTriggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => controller.getState().initialize(), [controller]);
  const open = (id: string, contents = false) => {
    onOpen();
    void controller.getState().open(id, undefined, contents);
  };
  return (
    <div className={styles.workspace}>
      <div className={styles.shelf}>
        <div className={styles.shelfHeader}>
          <div>
            <h2>{study ? '学习资料' : '我的书架'}</h2>
            <p>把闲暇留给一本好书 · {books.length} 本</p>
          </div>
          <div className={styles.actions}>
            <Button
              variant="secondary"
              onClick={() => {
                const state = controller.getState();
                state.configure({ ...state.settings, study: !study });
              }}
            >
              {study ? '摸鱼阅读' : '努力学习'}
            </Button>
            <Button variant="secondary" aria-label="阅读设置" onClick={() => setSettings(true)}>
              <Settings size={18} />
            </Button>
            <Button ref={addTriggerRef} onClick={() => setAdding(true)}>
              <Plus size={18} />
              添加书籍
            </Button>
          </div>
        </div>
        {storageError && (
          <p role="alert" className={styles.error}>
            {storageError}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        {!initialized ? (
          <p role="status">正在读取书架…</p>
        ) : storageError && books.length === 0 ? (
          <div className={styles.empty}>
            <h3>书架暂时无法读取</h3>
            <p>原数据仍保留在浏览器中，请检查存储后刷新重试。</p>
          </div>
        ) : books.length === 0 ? (
          <div className={styles.empty}>
            <BookOpen size={48} />
            <h3>书架还是空的</h3>
            <p>搜索在线书籍，或导入自己的 TXT 文件开始阅读。</p>
            <Button onClick={() => setAdding(true)}>添加第一本书</Button>
          </div>
        ) : (
          <div className={styles.bookGrid}>
            {books.map((book) => (
              <article className={styles.bookCard} key={book.id}>
                <button
                  className={styles.cover}
                  onClick={() => open(book.id)}
                  aria-label={`阅读《${book.title}》`}
                >
                  {book.cover ? (
                    <img
                      src={book.cover}
                      alt=""
                      onError={(event) => {
                        event.currentTarget.hidden = true;
                      }}
                    />
                  ) : (
                    <BookOpen size={38} />
                  )}
                  <span>{book.title}</span>
                </button>
                <h3>{book.title}</h3>
                <p>{book.author}</p>
                <small>
                  {book.sourceInfo.name} · {book.source === 'local' ? 'TXT' : '在线'}
                </small>
                <p>
                  {book.lastReadTime
                    ? `上次阅读：${new Date(book.lastReadTime).toLocaleString()}`
                    : '尚未阅读'}
                </p>
                {book.lastReadTime > 0 && (
                  <small>
                    {book.chapters.find((chapter) => chapter.index === book.lastReadChapter)?.title}
                  </small>
                )}
                <div className={styles.actions}>
                  <Button onClick={() => open(book.id)}>继续阅读</Button>
                  <Button
                    variant="secondary"
                    aria-label={`《${book.title}》目录`}
                    onClick={() => open(book.id, true)}
                  >
                    <List size={17} />
                  </Button>
                  <Button
                    variant="secondary"
                    aria-label={`删除《${book.title}》`}
                    onClick={() => setDeleting(book.id)}
                  >
                    <Trash2 size={17} />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <BookImportDialog
        controller={controller}
        service={service}
        open={adding}
        onOpenChange={setAdding}
        onImported={setNotice}
        returnFocusRef={addTriggerRef}
      />
      {settings && (
        <ReaderSettingsPanel controller={controller} onClose={() => setSettings(false)} />
      )}
      <Dialog
        open={deleting !== null}
        onOpenChange={(value) => {
          if (!value) setDeleting(null);
        }}
        title="删除书籍"
        description="删除此浏览器中的书籍、章节缓存及阅读进度？"
      >
        <Button
          onClick={() => {
            if (deleting) controller.getState().deleteBook(deleting);
            setDeleting(null);
            setNotice('书籍已删除');
          }}
        >
          确认删除
        </Button>
      </Dialog>
    </div>
  );
}
