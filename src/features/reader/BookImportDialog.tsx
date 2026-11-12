import { useRef, useState, type RefObject } from 'react';
import { FileUp } from 'lucide-react';
import { importTextBook, type ReaderService } from '@/domain/reader';
import { Dialog } from '@/shared/ui/Dialog';
import { Button } from '@/shared/ui/Button';
import type { ReaderController } from './controller';
import { OnlineSearch } from './OnlineSearch';
import styles from './BookImportDialog.module.css';

export function BookImportDialog({
  controller,
  service,
  open,
  onOpenChange,
  onImported,
  returnFocusRef,
}: {
  controller: ReaderController;
  service: ReaderService;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (message: string) => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const changeOpen = (value: boolean) => {
    if (!value) setError('');
    onOpenChange(value);
  };
  return (
    <Dialog
      open={open}
      onOpenChange={changeOpen}
      returnFocusRef={returnFocusRef}
      title="添加书籍"
      description="搜索喜欢的书名或作者，从多个书源挑选并加入书架。"
      dismissLabel="关闭添加书籍"
      showCloseAction={false}
      className={styles.dialog ?? ''}
    >
      {open && <OnlineSearch controller={controller} service={service} />}
      <div className={styles.footer}>
        <div className={styles.import}>
          <Button variant="secondary" disabled={importing} onClick={() => fileRef.current?.click()}>
            <FileUp size={16} aria-hidden="true" />
            {importing ? '正在导入…' : '导入 TXT'}
          </Button>
          <span>本地文件 · UTF-8 / GB18030 · 最大 10 MB</span>
        </div>
        <Button variant="secondary" onClick={() => changeOpen(false)}>
          关闭
        </Button>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <input
        hidden
        ref={fileRef}
        type="file"
        accept=".txt,text/plain"
        onChange={async (event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (!file) return;
          setImporting(true);
          setError('');
          try {
            if (!/\.txt$/i.test(file.name) || file.size > 10 * 1024 * 1024)
              throw new Error('请选择不超过 10 MB 的 TXT 文件');
            const data = await file.arrayBuffer();
            let text = new TextDecoder('utf-8').decode(data);
            if (text.includes('\uFFFD')) text = new TextDecoder('gb18030').decode(data);
            controller.getState().addBook(importTextBook(file.name, text, crypto.randomUUID()));
            onImported('TXT 已导入书架');
            onOpenChange(false);
          } catch (error) {
            setError(error instanceof Error ? error.message : '导入失败，请重试');
          } finally {
            setImporting(false);
          }
        }}
      />
    </Dialog>
  );
}
