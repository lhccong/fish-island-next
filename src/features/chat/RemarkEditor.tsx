import { useId, useState } from 'react';
import { useStore } from 'zustand';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import type { RemarkTarget } from './remarks-context';
import type { RemarksController } from './remarks-controller';
import styles from './Remarks.module.css';

export function RemarkEditor({
  target,
  controller,
  onClose,
}: {
  target: RemarkTarget;
  controller: RemarksController;
  onClose: () => void;
}) {
  const state = useStore(controller.store);
  const [value, setValue] = useState(() =>
    Object.hasOwn(state.remarks, target.id) ? state.remarks[target.id]! : '',
  );
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const id = useId();
  const current = Object.hasOwn(state.remarks, target.id) ? state.remarks[target.id]! : '';
  const draft = dirty ? value : current;
  return (
    <Dialog
      open
      title="设置备注"
      description="仅对自己可见，清空后恢复原名。"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      returnFocusRef={target.returnFocusRef}
      showCloseAction={false}
      dismissLabel="关闭备注设置"
      className={styles.dialog ?? ''}
    >
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          if (state.saving || state.status !== 'ready') return;
          setSaved(false);
          void controller.save(target.id, draft).then((success) => {
            if (success) setSaved(true);
          });
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault();
        }}
      >
        <div className={styles.scroll}>
          <ScrollArea label="备注表单" gutter="reserved">
            <div className={styles.body}>
              <p className={styles.original}>原名：{target.name}</p>
              {state.status === 'loading' && <p role="status">正在加载备注…</p>}
              {state.status === 'error' && (
                <Button variant="secondary" onClick={() => void controller.load()}>
                  重试加载备注
                </Button>
              )}
              <label htmlFor={id}>备注名称</label>
              <input
                id={id}
                value={draft}
                disabled={state.status !== 'ready' || state.saving}
                autoComplete="off"
                placeholder="请输入备注名称"
                onChange={(event) => {
                  setValue(event.target.value);
                  setDirty(true);
                  setSaved(false);
                }}
              />
            </div>
          </ScrollArea>
        </div>
        <div className={styles.feedback}>
          {state.error && <p role="alert">{state.error}</p>}
          {saved && <p role="status">{draft.trim() ? '备注已保存' : '备注已清除'}</p>}
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>
            关闭
          </Button>
          <Button type="submit" disabled={state.status !== 'ready' || state.saving}>
            {state.saving ? '保存中…' : '保存'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
