import { useState } from 'react';
import { LogOut, Pencil, UserRound } from 'lucide-react';
import type { AuthUser } from '@/domain/auth';
import { Dialog } from '@/shared/ui/Dialog';
import { Button } from '@/shared/ui/Button';
import { SourceAvatar } from '@/shared/ui/SourceAvatar';
import { ProfileEditor } from './ProfileEditor';
import { useAuth } from './use-auth';
import styles from './ui/Profile.module.css';
import accountStyles from './ui/AccountControl.module.css';

export function AccountDialog({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const { pending } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      title={editing ? '修改个人信息' : '个人资料'}
      description={
        editing ? '让岛友更好地认识你，保存后同步到摸鱼岛。' : '管理你的摸鱼岛账号与个人信息。'
      }
      className={`${styles.dialog} ${editing ? styles.editorDialog : ''}`}
      showCloseAction={false}
      dismissLabel="关闭个人资料"
      open={open}
      onOpenChange={(value) => {
        if (pending === 'profile') return;
        setOpen(value);
        if (!value) {
          setEditing(false);
          setSaved(false);
        }
      }}
      trigger={
        <button className={accountStyles.trigger} type="button" aria-label="用户菜单">
          <SourceAvatar name={user.name} src={user.avatarUrl} />
        </button>
      }
    >
      {editing ? (
        <ProfileEditor
          user={user}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            setSaved(true);
          }}
        />
      ) : (
        <>
          <div className={styles.identity}>
            <div className={styles.avatar}>
              <SourceAvatar name={user.name} src={user.avatarUrl} />
            </div>
            <div className={styles.identityText}>
              <h3>{user.name}</h3>
              <span>
                <UserRound size={13} aria-hidden="true" /> 账号 ID：{user.id}
              </span>
            </div>
          </div>
          <dl className={styles.details}>
            <div>
              <dt>个人简介</dt>
              <dd>{user.profile || '还没有填写个人简介'}</dd>
            </div>
            <div>
              <dt>绑定邮箱</dt>
              <dd>{user.email || '暂未绑定'}</dd>
            </div>
          </dl>
          {saved && (
            <p className={styles.success} role="status">
              个人信息已保存
            </p>
          )}
          <div className={styles.actions}>
            <Button
              variant="secondary"
              className={styles.logout}
              onClick={onLogout}
              disabled={pending !== null}
            >
              <LogOut size={16} aria-hidden="true" />
              退出登录
            </Button>
            <Button
              onClick={() => {
                setSaved(false);
                setEditing(true);
              }}
              disabled={pending !== null}
            >
              <Pencil size={16} aria-hidden="true" />
              修改信息
            </Button>
          </div>
        </>
      )}
    </Dialog>
  );
}
