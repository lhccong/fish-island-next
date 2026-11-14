import { useState } from 'react';
import type { AccountToolsPort } from '@/domain/account-tools';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { useOperation } from './use-operation';
import { Feedback } from './Feedback';
import styles from './Tools.module.css';
export function RedeemForm({ port }: { port: AccountToolsPort }) {
  const [code, setCode] = useState('');
  const operation = useOperation();
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        void operation.run(async (signal) => {
          if (!code.trim()) throw new Error('请输入兑换码');
          const message = await port.redeem(code.trim(), signal);
          if (!signal.aborted) {
            setCode('');
            operation.setNotice(message);
          }
        });
      }}
    >
      <ScrollArea label="兑换码内容" gutter="reserved" className={styles.scroll ?? ''}>
        <div className={styles.fields}>
          <label className={styles.field}>
            兑换码
            <input
              placeholder="输入你的兑换码"
              value={code}
              maxLength={128}
              autoComplete="off"
              disabled={operation.busy}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
        </div>
      </ScrollArea>
      <Feedback {...operation} />
      <div className={styles.actions}>
        <Button type="submit" disabled={operation.busy}>
          立即兑换
        </Button>
      </div>
    </form>
  );
}
