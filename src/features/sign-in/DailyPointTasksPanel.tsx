import { Check, ChevronRight, RefreshCw } from 'lucide-react';
import type { DailyPointTask, DailyPointTaskId, SignInPort } from '@/domain/sign-in';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { dailyPointTaskCopy } from './daily-point-task-copy';
import { useDailyPointTasks } from './use-daily-point-tasks';
import styles from './DailyPointTasksPanel.module.css';
import dialogStyles from './SignIn.module.css';

export function DailyPointTasksPanel({
  port,
  onOpen,
}: {
  port: SignInPort;
  onOpen: (id: DailyPointTaskId) => void;
}) {
  const { state, refresh } = useDailyPointTasks(port);
  const tasks = state.status === 'ready' ? state.data.tasks : [];
  const pending = tasks.filter(({ state }) => state === 'ready' || state === 'waiting');
  const done = tasks.filter(({ state }) => state === 'done');
  const conditional = tasks.filter(({ state }) => state === 'conditional');
  const tracked = pending.length + done.length;
  const earned = tasks.reduce((sum, task) => sum + task.earned, 0);

  return (
    <>
      <ScrollArea className={dialogStyles.scroll ?? ''} gutter="reserved" label="今日积分任务">
        {state.status === 'loading' && <LoadingIndicator>正在读取今日积分任务…</LoadingIndicator>}
        {state.status === 'error' && (
          <div className={styles.feedback}>
            <p role="alert">读取积分任务失败。{state.message}</p>
            <Button variant="secondary" onClick={refresh}>
              重试
            </Button>
          </div>
        )}
        {state.status === 'ready' && (
          <div className={styles.body}>
            {tasks.length === 0 ? (
              <div className={styles.feedback}>
                <p role="status">今天暂无积分任务</p>
              </div>
            ) : (
              <>
                <div className={styles.summary}>
                  <div className={styles.summaryItem}>
                    <span>完成进度</span>
                    {tracked > 0 ? (
                      <>
                        <strong>
                          {done.length} <small>/ {tracked} 项</small>
                        </strong>
                        <div
                          className={styles.track}
                          role="progressbar"
                          aria-label="任务完成进度"
                          aria-valuenow={done.length}
                          aria-valuemax={tracked}
                          aria-valuetext={`已完成 ${done.length} / ${tracked} 项`}
                        >
                          <div style={{ width: `${(done.length / tracked) * 100}%` }} />
                        </div>
                      </>
                    ) : (
                      <strong>
                        0 <small>项</small>
                      </strong>
                    )}
                  </div>
                  <div className={styles.summaryReward}>
                    <span>今日任务积分</span>
                    <strong>{earned.toLocaleString('zh-CN')}</strong>
                  </div>
                </div>
                <TaskGroup title={`待完成 · ${pending.length} 项`} tasks={pending} onOpen={onOpen}>
                  {pending.length === 0 && <p className={styles.empty}>今日暂无待完成任务</p>}
                </TaskGroup>
                {done.length > 0 && (
                  <TaskGroup title={`已完成 · ${done.length} 项`} tasks={done} onOpen={onOpen} />
                )}
                {conditional.length > 0 && (
                  <TaskGroup title="条件奖励" tasks={conditional} onOpen={onOpen} />
                )}
              </>
            )}
          </div>
        )}
      </ScrollArea>
      <footer className={dialogStyles.footer}>
        <div className={dialogStyles.actions}>
          <Button variant="secondary" disabled={state.status === 'loading'} onClick={refresh}>
            <RefreshCw size={14} aria-hidden="true" />
            刷新进度
          </Button>
        </div>
      </footer>
    </>
  );
}

function TaskGroup({
  title,
  tasks,
  onOpen,
  children,
}: {
  title: string;
  tasks: DailyPointTask[];
  onOpen: (id: DailyPointTaskId) => void;
  children?: React.ReactNode;
}) {
  return (
    <section className={styles.group}>
      <h3>{title}</h3>
      {children}
      {tasks.length > 0 && (
        <ul className={styles.list}>
          {tasks.map((task) => {
            const { name, hint, icon: Icon } = dailyPointTaskCopy[task.id];
            return (
              <li key={task.id} className={styles.row} data-state={task.state}>
                <span className={styles.taskIcon}>
                  <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <div>
                  <div className={styles.name}>
                    <strong>{name}</strong>
                    {task.goal !== null && (
                      <span>
                        {task.progress}/{task.goal}
                      </span>
                    )}
                  </div>
                  <div className={styles.details}>
                    <span>{task.detail ?? hint}</span>
                    {task.earned > 0 && (
                      <span className={styles.earned}>今日 +{task.earned} 积分</span>
                    )}
                  </div>
                </div>
                {task.state === 'done' ? (
                  <span className={styles.complete}>
                    <Check size={15} aria-hidden="true" /> 已完成
                  </span>
                ) : (
                  <Button
                    variant="secondary"
                    className={styles.shortcut ?? ''}
                    aria-label={`前往${name}`}
                    onClick={() => onOpen(task.id)}
                  >
                    前往
                    <ChevronRight size={13} aria-hidden="true" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
