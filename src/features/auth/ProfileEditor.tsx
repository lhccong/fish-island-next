import { useState } from 'react';
import type { AuthUser } from '@/domain/auth';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { ProfileImageField } from './ProfileImageField';
import { EmailBinding } from './EmailBinding';
import { ProfileTitles } from './ProfileTitles';
import { ProfileMilestones } from './ProfileMilestones';
import { useAuth } from './use-auth';
import styles from './ui/Profile.module.css';

interface ProfileEditorProps {
  user: AuthUser;
  onCancel: () => void;
  onSaved: () => void;
}

export function ProfileEditor({ user, onCancel, onSaved }: ProfileEditorProps) {
  const { updateProfile, pending } = useAuth();
  const [name, setName] = useState(user.name);
  const [profile, setProfile] = useState(user.profile ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? '');
  const [coverUrl, setCoverUrl] = useState(user.coverUrl ?? '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const busy = pending !== null || uploading;
  return (
    <form
      className={styles.form}
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        if (!name.trim() || /\s/.test(name) || name.length > 10) {
          setError('用户名为 1–10 个字符，不能包含空白。');
          return;
        }
        if (profile.length > 100) {
          setError('个人简介不能超过 100 个字符。');
          return;
        }
        if (
          [avatarUrl, coverUrl].some((url) => {
            if (!url) return false;
            try {
              return !['https:', 'http:'].includes(new URL(url).protocol);
            } catch {
              return true;
            }
          })
        ) {
          setError('图片地址须为有效的 HTTP 或 HTTPS 链接。');
          return;
        }
        setError('');
        try {
          if (await updateProfile({ name, profile, avatarUrl, coverUrl })) onSaved();
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : '保存失败，请重试');
        }
      }}
    >
      <ScrollArea label="个人资料编辑区" gutter="reserved" className={styles.editorScroll ?? ''}>
        <div className={styles.editorBody}>
          <div className={styles.grid}>
            <label className={styles.label} htmlFor="profile-user-name">
              <span>
                <span className={styles.required}>*</span> 用户名{' '}
                <button
                  type="button"
                  className={styles.help}
                  aria-label="用户名修改规则"
                  aria-describedby="profile-name-hint"
                >
                  ?
                </button>
              </span>
              <div className={styles.countedInput}>
                <input
                  aria-label="用户名"
                  id="profile-user-name"
                  value={name}
                  maxLength={10}
                  required
                  disabled={busy}
                  onChange={(event) => setName(event.target.value.replace(/\s/g, ''))}
                  aria-describedby="profile-name-hint"
                />
                <span>{name.length} / 10</span>
              </div>
              <span id="profile-name-hint" className={styles.ruleHint}>
                首次免费，之后每月限改一次，消耗 100 积分。
              </span>
            </label>
            <EmailBinding boundEmail={user.email ?? ''} disabled={busy} />
          </div>
          <ProfileImageField
            label="头像"
            value={avatarUrl}
            onChange={setAvatarUrl}
            disabled={busy}
            onBusy={setUploading}
          />
          <div className={styles.backgroundRow}>
            <ProfileImageField
              label="朋友圈背景"
              value={coverUrl}
              onChange={setCoverUrl}
              disabled={busy}
              onBusy={setUploading}
            />
            <ProfileTitles user={user} disabled={busy} />
          </div>
          <label className={styles.label}>
            个人简介
            <textarea
              value={profile}
              maxLength={100}
              rows={3}
              placeholder="介绍一下自己吧（最多100字）"
              disabled={busy}
              onChange={(event) => setProfile(event.target.value)}
            />
            <span className={styles.counter}>{profile.length}/100</span>
          </label>
          <ProfileMilestones user={user} />
        </div>
      </ScrollArea>
      {uploading && (
        <p className={styles.hint} role="status">
          正在上传图片…
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.editorActions}>
        <Button
          variant="secondary"
          className={styles.cancelEdit}
          onClick={onCancel}
          disabled={pending === 'profile'}
        >
          取消
        </Button>
        <Button type="submit" disabled={busy}>
          {pending === 'profile' ? '保存中…' : '保存修改'}
        </Button>
      </div>
    </form>
  );
}
