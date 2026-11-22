import { lazy, Suspense, useState } from 'react';
import { Calendar, CalendarCheck } from 'lucide-react';
import type { DailyPointTaskId, SignInPort } from '@/domain/sign-in';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useSignInStatus } from './sign-in-status-context';
import styles from './SignIn.module.css';

const SignInPanel = lazy(() =>
  import('./SignInPanel').then((module) => ({ default: module.SignInPanel })),
);

export function SignInLauncher({
  port,
  onNavigate,
  navigationClassName,
  navigationLabel,
  navigationPresentation = 'default',
}: {
  port: SignInPort;
  onNavigate: (task: DailyPointTaskId) => void;
  navigationClassName?: string;
  navigationLabel?: string | undefined;
  navigationPresentation?: 'default' | 'classic';
}) {
  const [open, setOpen] = useState(false);
  const { todaySigned } = useSignInStatus();
  return (
    <Dialog
      title="每日签到"
      description="记录在岛上的每一天"
      hideDescription
      className={`${styles.dialog}`}
      open={open}
      onOpenChange={setOpen}
      showCloseAction={false}
      dismissLabel="关闭签到"
      trigger={
        <Button
          variant="secondary"
          data-presentation={navigationPresentation}
          data-sign-in-entry={navigationClassName ? '' : undefined}
          className={`${styles.iconTrigger} ${navigationClassName ? `${navigationClassName} ${styles.navigationTrigger}` : ''}`}
          aria-label={
            navigationClassName
              ? todaySigned === false
                ? '每日签到，今日未签到'
                : todaySigned
                  ? '每日签到，今日已签到'
                  : '每日签到'
              : '每日签到'
          }
          title={todaySigned === false ? '今日未签到' : todaySigned ? '今日已签到' : '每日签到'}
        >
          <span className={styles.launcherIcon}>
            {navigationPresentation === 'classic' ? (
              <Calendar size={18} aria-hidden="true" />
            ) : (
              <CalendarCheck size={navigationClassName ? 23 : 16} aria-hidden="true" />
            )}
            {todaySigned === false && (
              <span className={styles.reminder} aria-hidden="true" data-sign-in-reminder />
            )}
          </span>
          {navigationClassName && navigationLabel && <span>{navigationLabel}</span>}
        </Button>
      }
    >
      {open && (
        <Suspense fallback={<LoadingIndicator>正在打开签到…</LoadingIndicator>}>
          <SignInPanel
            port={port}
            onNavigate={(task) => {
              setOpen(false);
              onNavigate(task);
            }}
          />
        </Suspense>
      )}
    </Dialog>
  );
}
