import { useState, useSyncExternalStore } from 'react';
import type { BlacklistPort } from '@/domain/account-tools';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Button } from '@/shared/ui/Button';
import { SourceAvatar } from '@/shared/ui/SourceAvatar';
import styles from './Tools.module.css';
export function BlacklistPanel({ port, account }: { port: BlacklistPort; account: string }) {
  const users = useSyncExternalStore(port.subscribe, () => port.read(account));
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  return (
    <div className={styles.body}>
      <ScrollArea label="黑名单内容" gutter="reserved" className={styles.scroll ?? ''}>
        <div className={styles.fields}>
          {users.length === 0 && (
            <div className={styles.empty}>
              <p role="status">暂无黑名单用户。可在聊天消息菜单中屏蔽岛友。</p>
            </div>
          )}
          {users.map((user) => (
            <div className={styles.row} key={user.id}>
              <div className={styles.avatar}>
                <SourceAvatar name={user.name} src={user.avatar ?? null} />
              </div>
              <div className={styles.text}>
                {user.name}
                <p>ID：{user.id}</p>
              </div>
              {confirm === user.id ? (
                <div className={styles.actions}>
                  <Button variant="secondary" onClick={() => setConfirm('')}>
                    取消
                  </Button>
                  <Button
                    onClick={() => {
                      try {
                        port.write(
                          account,
                          users.filter((v) => v.id !== user.id),
                        );
                        setConfirm('');
                        setError('');
                      } catch {
                        setError('无法保存，请检查浏览器存储权限后重试');
                      }
                    }}
                  >
                    确认移除
                  </Button>
                </div>
              ) : (
                <Button variant="secondary" onClick={() => setConfirm(user.id)}>
                  移除
                </Button>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
