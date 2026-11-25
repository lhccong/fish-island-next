import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { mbtiTypes, readMbti, type AuthUser } from '@/domain/auth';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Select } from '@/shared/ui/Select';
import { ProfileImageField } from './ProfileImageField';
import { EmailBinding } from './EmailBinding';
import { ProfileTitles } from './ProfileTitles';
import { ProfileMilestones } from './ProfileMilestones';
import { useAuth } from './use-auth';
import { formatNextRenameTime } from './profile-date';
import styles from './ui/Profile.module.css';

const mbtiOptions = [
  { value: 'unset', label: '未填写' },
  ...mbtiTypes.map((type) => ({ value: type, label: type })),
];

interface ProfileEditorProps {
  user: AuthUser;
  onCancel: () => void;
  onSaved: () => void;
}

export function ProfileEditor({ user, onCancel, onSaved }: ProfileEditorProps) {
  const { updateProfile, pending } = useAuth();
  const [name, setName] = useState(user.name);
  const [profile, setProfile] = useState(user.profile ?? '');
  const [mbti, setMbti] = useState(user.mbti ?? '');
  const [pokeSuffix, setPokeSuffix] = useState(user.pokeSuffix ?? '');
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
        if (pokeSuffix.length > 30) {
          setError('被戳后缀不能超过 30 个字符。');
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
          if (await updateProfile({ name, profile, avatarUrl, coverUrl, pokeSuffix, mbti }))
            onSaved();
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
                <br />
                下次可修改时间：{formatNextRenameTime(user.nextRenameAt)}
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
          <div className={`${styles.label} ${styles.mbtiField}`}>
            <span>MBTI</span>
            <div className={styles.mbtiControls}>
              <Select
                label="MBTI"
                value={mbti || 'unset'}
                options={mbtiOptions}
                disabled={busy}
                onValueChange={(value) => setMbti(readMbti(value))}
              />
              <a
                className={styles.mbtiTestLink}
                href="https://www.16personalities.com/ch/%E4%BA%BA%E6%A0%BC%E6%B5%8B%E8%AF%95"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="打开人格测试（新标签页）"
                title="打开人格测试（新标签页）"
              >
                <ExternalLink size={18} aria-hidden="true" />
              </a>
            </div>
          </div>
          <ProfileMilestones user={user} />
          <label className={styles.label}>
            被戳后缀
            <input
              aria-label="被戳后缀"
              value={pokeSuffix}
              maxLength={30}
              placeholder="最多30个字符，留空不追加文字"
              disabled={busy}
              onChange={(event) => setPokeSuffix(event.target.value)}
              aria-describedby="poke-preview"
            />
            <span className={styles.counter}>{pokeSuffix.length}/30</span>
            <span id="poke-preview" className={styles.ruleHint}>
              岛友拍了拍「{name || '我'}」{pokeSuffix}
            </span>
          </label>
        </div>
      </ScrollArea>
      {uploading && <LoadingIndicator compact>正在上传图片…</LoadingIndicator>}
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
        <Button
          type="submit"
          disabled={busy}
          aria-label={pending === 'profile' ? '保存中…' : '保存修改'}
        >
          {pending === 'profile' ? (
            <LoadingIndicator compact>{'保存中…'}</LoadingIndicator>
          ) : (
            '保存修改'
          )}
        </Button>
      </div>
    </form>
  );
}
