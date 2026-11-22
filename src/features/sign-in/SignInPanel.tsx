import { useRef } from 'react';
import type { DailyPointTaskId, SignInPort } from '@/domain/sign-in';
import { Button } from '@/shared/ui/Button';
import { DailyPointTasksPanel } from './DailyPointTasksPanel';
import { SignInCalendarPanel } from './SignInCalendarPanel';
import { useSignInStatus } from './sign-in-status-context';
import styles from './SignIn.module.css';

export function SignInPanel({
  port,
  onNavigate,
}: {
  port: SignInPort;
  onNavigate: (task: DailyPointTaskId) => void;
}) {
  const { view, selectView } = useSignInStatus();
  const calendarButton = useRef<HTMLButtonElement>(null);
  return (
    <>
      <div className={styles.views} role="group" aria-label="签到视图">
        <Button
          ref={calendarButton}
          variant="secondary"
          aria-pressed={view === 'calendar'}
          onClick={() => selectView('calendar')}
        >
          签到日历
        </Button>
        <Button
          variant="secondary"
          aria-pressed={view === 'tasks'}
          onClick={() => selectView('tasks')}
        >
          今日可做
        </Button>
      </div>
      {view === 'calendar' ? (
        <SignInCalendarPanel port={port} />
      ) : (
        <DailyPointTasksPanel
          port={port}
          onOpen={(task) => {
            if (task === 'sign_in' || task === 'sign_in_makeup') {
              selectView('calendar');
              calendarButton.current?.focus();
            } else onNavigate(task);
          }}
        />
      )}
    </>
  );
}
