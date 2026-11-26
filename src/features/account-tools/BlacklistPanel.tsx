import { useRef, useState, useSyncExternalStore } from 'react';
import { setUserBlocked, type BlacklistPort, type BlockedUser } from '@/domain/account-tools';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { SourceAvatar } from '@/shared/ui/SourceAvatar';
import styles from './Tools.module.css';
export function BlacklistPanel({ port, account }: { port: BlacklistPort; account: string }) {
  const users = useSyncExternalStore(port.subscribe, () => port.read(account));
  const [target, setTarget] = useState<{ user: BlockedUser; trigger: HTMLButtonElement } | null>(
    null,
  );
  const viewport = useRef<HTMLDivElement>(null);
  return (
    <div className={styles.body}>
      <ScrollArea
        label="黑名单内容"
        gutter="reserved"
        className={styles.scroll ?? ''}
        viewportRef={viewport}
      >
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
              <Button
                variant="secondary"
                onClick={(event) => setTarget({ user, trigger: event.currentTarget })}
              >
                移除
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
      {target && (
        <ConfirmDialog
          layer="nested"
          title="移出黑名单"
          description={`移出后，「${target.user.name}」的聊天消息将在此浏览器恢复显示。`}
          confirmLabel="确认移除"
          errorMessage="无法保存黑名单，请检查浏览器存储权限后重试。"
          returnFocusRef={{
            get current() {
              return target.trigger.isConnected ? target.trigger : viewport.current;
            },
          }}
          onClose={() => setTarget(null)}
          onConfirm={() => setUserBlocked(port, account, target.user, false)}
        />
      )}
    </div>
  );
}
