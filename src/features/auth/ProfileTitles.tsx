import { useState } from 'react';
import type { AuthUser } from '@/domain/auth';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { useAuth } from './use-auth';
import { useProfileResource } from './use-profile-resource';
import styles from './ui/Profile.module.css';

export function ProfileTitles({ user, disabled }: { user: AuthUser; disabled: boolean }) {
  const { titles, setTitle } = useAuth();
  const { resource, reload } = useProfileResource(titles);
  const [error, setError] = useState('');
  const options =
    resource.status === 'ready'
      ? Array.from(
          new Map(
            [
              { id: '0', name: '等级称号' },
              ...(user.role === 'admin' ? [{ id: '-1', name: '摸鱼监督员' }] : []),
              ...resource.value,
            ].map((title) => [title.id, title]),
          ).values(),
        )
      : [];
  const current = options.find((title) => title.id === (user.titleId ?? '0'));
  return (
    <section className={styles.titleSection} aria-label="称号设置">
      <h3>称号设置</h3>
      <div className={styles.titleCard}>
        <div className={styles.label}>
          <Select
            label="称号设置"
            value={user.titleId ?? '0'}
            disabled={disabled || resource.status !== 'ready'}
            placeholder={resource.status === 'loading' ? '正在读取称号…' : '请选择称号'}
            options={[
              ...options.map((title) => ({ value: title.id, label: title.name })),
              ...(!current && resource.status === 'ready'
                ? [{ value: user.titleId ?? '0', label: '当前称号不可用', disabled: true }]
                : []),
            ]}
            onValueChange={async (value) => {
              setError('');
              try {
                await setTitle(value);
              } catch (reason) {
                setError(reason instanceof Error ? reason.message : '称号设置失败');
              }
            }}
          />
        </div>
        {resource.status === 'loading' && (
          <p className={styles.hint} role="status">
            正在读取称号…
          </p>
        )}
        {resource.status === 'error' && (
          <div className={styles.sectionError} role="alert">
            {resource.message}
            <Button variant="secondary" onClick={reload}>
              重试称号
            </Button>
          </div>
        )}
        {resource.status === 'ready' && (
          <p className={styles.confirmed}>当前：{current?.name ?? '当前称号不可用'}</p>
        )}
        {resource.status === 'ready' && resource.value.length === 0 && (
          <p className={styles.hint}>暂无其他可用称号</p>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <p className={styles.hint}>选择后立即生效。</p>
      </div>
    </section>
  );
}
