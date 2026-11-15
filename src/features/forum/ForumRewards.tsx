import { useState } from 'react';
import type { ForumPort } from '@/domain/forum';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useOperation } from './use-operation';
import styles from './Forum.module.css';
export function ForumRewards({
  service,
  postId,
  owner,
}: {
  service: ForumPort;
  postId: string;
  owner: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState('1');
  const [result, setResult] = useState<{ name: string; token: string } | null>(null);
  const operation = useOperation();
  function load(action: 'draw' | 'user' | 'token') {
    void operation.run(async (signal) => {
      const value = await service.reward(postId, action, Number(index), signal);
      if (!signal.aborted) setResult(value);
    });
  }
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        帖子抽奖
      </Button>
      {open && (
        <Dialog
          open
          className={styles.dialog ?? ''}
          title="帖子抽奖"
          description="使用旧版点赞抽奖与兑奖服务。"
          dismissLabel="关闭帖子抽奖"
          showCloseAction={false}
          onOpenChange={(v) => {
            if (!operation.busy) {
              setOpen(v);
              setResult(null);
            }
          }}
        >
          <ScrollArea label="帖子抽奖内容" gutter="reserved" className={styles.scroll ?? ''}>
            {owner && (
              <label className={styles.field}>
                抽取点赞序号
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={index}
                  onChange={(e) => setIndex(e.target.value)}
                />
              </label>
            )}
            <div className={styles.actions}>
              {owner && (
                <Button disabled={operation.busy || !index} onClick={() => load('draw')}>
                  抽取点赞用户
                </Button>
              )}
              <Button variant="secondary" disabled={operation.busy} onClick={() => load('user')}>
                查看中奖用户
              </Button>
              <Button variant="secondary" disabled={operation.busy} onClick={() => load('token')}>
                获取兑奖凭证
              </Button>
            </div>
            {operation.busy && <LoadingIndicator>正在查询抽奖…</LoadingIndicator>}
            {result && (
              <div className={styles.markdown}>
                <p>{result.name || '兑奖信息'}</p>
                {result.token && <p>{result.token}</p>}
              </div>
            )}
          </ScrollArea>
          {operation.message && <p role="alert">{operation.message}</p>}
        </Dialog>
      )}
    </>
  );
}
