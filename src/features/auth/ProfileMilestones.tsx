import { useState } from 'react';
import type { AuthUser } from '@/domain/auth';
import { Button } from '@/shared/ui/Button';
import { useAuth } from './use-auth';
import { useProfileResource } from './use-profile-resource';
import { parseProfileDate, profileDate, profileDays } from './profile-date';
import styles from './ui/Profile.module.css';

export function ProfileMilestones({ user }: { user: AuthUser }) {
  const [now] = useState(Date.now);
  const { membership } = useAuth();
  const { resource, reload } = useProfileResource(membership);
  const born = parseProfileDate(user.createdAt ?? '');
  const member = resource.status === 'ready' ? resource.value : null;
  const expiry = member ? parseProfileDate(member.expiresAt) : null;
  return (
    <div className={styles.milestones}>
      <section className={styles.milestoneSection} aria-label="会员信息">
        <h3>会员信息</h3>
        {resource.status === 'loading' && (
          <p className={styles.hint} role="status">
            正在读取会员信息…
          </p>
        )}
        {resource.status === 'error' && (
          <div className={styles.sectionError} role="alert">
            {resource.message}
            <Button variant="secondary" onClick={reload}>
              重试会员信息
            </Button>
          </div>
        )}
        {resource.status === 'ready' && (
          <div className={styles.memberCard}>
            <span className={styles.milestoneIcon} aria-hidden="true">
              👑
            </span>
            <div>
              <strong>
                {member
                  ? member.permanent || member.type === 2
                    ? '永久会员'
                    : member.type === 1
                      ? '月度会员'
                      : '普通会员'
                  : '暂无会员信息'}
              </strong>
              <p>
                {member ? (
                  <>
                    到期时间：
                    <span className={styles.badge}>
                      {member.permanent ? '永久有效' : expiry ? profileDate(expiry) : '未设置'}
                    </span>
                    {!member.permanent &&
                    (member.expired || (expiry && profileDays(expiry, now) >= 0))
                      ? '（已过期）'
                      : !member.permanent && expiry
                        ? ` 还剩 ${Math.max(0, Math.floor((expiry.getTime() - now) / 86400000))} 天`
                        : ''}
                  </>
                ) : (
                  '当前账号没有会员记录'
                )}
              </p>
            </div>
          </div>
        )}
      </section>
      <section className={styles.milestoneSection} aria-label="破蛋日">
        <h3>破蛋日</h3>
        <div className={styles.birthdayCard}>
          <span className={styles.milestoneIcon} aria-hidden="true">
            🐣
          </span>
          <div>
            <strong>{born ? profileDate(born) : '暂无破蛋日记录'}</strong>
            <p>
              {born ? (
                <>
                  已经在摸鱼岛生活了{' '}
                  <span className={styles.dayBadge}>{Math.max(0, profileDays(born, now))} 天</span>
                </>
              ) : (
                '账号尚未返回注册日期'
              )}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
