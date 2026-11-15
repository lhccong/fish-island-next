import { useRef, useState } from 'react';
import type { AdminPort, AdminUser } from '@/domain/admin';
import { Button } from '@/shared/ui/Button';
import { EditorFrame } from './EditorFrame';
import { UserTitles } from './UserTitles';
import styles from './Admin.module.css';
export function UserActions({ port, user }: { port: AdminPort; user: AdminUser }) {
  const [action, setAction] = useState<'titles' | 'mark' | 'unmark' | null>(null);
  const [notice, setNotice] = useState('');
  const origin = useRef<HTMLElement | null>(null);
  return (
    <>
      <Button
        variant="secondary"
        onClick={(e) => {
          origin.current = e.currentTarget;
          setAction('titles');
        }}
      >
        查看称号
      </Button>
      <Button
        variant="secondary"
        onClick={(e) => {
          origin.current = e.currentTarget;
          setAction('mark');
        }}
      >
        封禁脚本
      </Button>
      <Button
        variant="secondary"
        onClick={(e) => {
          origin.current = e.currentTarget;
          setAction('unmark');
        }}
      >
        解禁脚本
      </Button>
      {notice && <span role="status">{notice}</span>}
      {action === 'titles' && (
        <UserTitles
          port={port}
          user={user}
          onClose={() => setAction(null)}
          returnFocusRef={origin}
        />
      )}
      {(action === 'mark' || action === 'unmark') && (
        <EditorFrame
          title={action === 'mark' ? '封禁脚本' : '解禁脚本'}
          submitLabel="确认"
          returnFocusRef={origin}
          onClose={() => setAction(null)}
          onSaved={() => {
            setAction(null);
            setNotice('操作成功');
          }}
          onSubmit={(s) => port.markScript(user.id, action === 'mark', s)}
        >
          <p className={styles.full}>
            确定{action === 'mark' ? '封禁' : '解禁'}用户「{user.name || user.account}
            」的抢红包脚本？
          </p>
        </EditorFrame>
      )}
    </>
  );
}
