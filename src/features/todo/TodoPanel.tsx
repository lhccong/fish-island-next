import { useId, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, Plus } from 'lucide-react';
import { todayTodoDate, type TodoPort, type TodoTask } from '@/domain/todo';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { nextTodoId, useTodo } from './model/use-todo';
import { TodoCalendar } from './ui/TodoCalendar';
import { TodoEditor } from './ui/TodoEditor';
import { TodoTaskList } from './ui/TodoTaskList';
import styles from './ui/TodoPanel.module.css';

const weekday = new Intl.DateTimeFormat('zh-CN', {
  weekday: 'short',
  timeZone: 'UTC',
});
const views = [
  { value: 'day', label: '当天' },
  { value: 'month', label: '整月' },
  { value: 'calendar', label: '日历' },
] as const;

export function TodoPanel({ service }: { service: TodoPort }) {
  const { load, reload, saving, saveError, clearSaveError, save } = useTodo(service);
  const [selected, setSelected] = useState(todayTodoDate);
  const [view, setView] = useState<(typeof views)[number]['value']>('day');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [calendarRevision, setCalendarRevision] = useState(0);
  const [editor, setEditor] = useState<{ task: TodoTask | null } | null>(null);
  const [deleting, setDeleting] = useState<TodoTask | null>(null);
  const calendarId = useId();
  const returnFocus = useRef<HTMLElement | null>(null);
  const addTrigger = useRef<HTMLButtonElement>(null);
  const dateTrigger = useRef<HTMLButtonElement>(null);

  if (load.status === 'loading') {
    return (
      <div className={styles.state}>
        <LoadingIndicator>正在加载待办…</LoadingIndicator>
      </div>
    );
  }
  if (load.status === 'error') {
    return (
      <div className={styles.state}>
        <p role="alert">待办加载失败，请重试</p>
        <Button variant="secondary" onClick={reload}>
          重试
        </Button>
      </div>
    );
  }

  const { tasks } = load.snapshot;
  const month = selected.slice(0, 7);
  const dayLabel = `${Number(selected.slice(5, 7))}月${Number(selected.slice(8))}日 ${weekday.format(new Date(`${selected}T00:00:00Z`))}`;
  const wholeMonth = view === 'month';
  const calendarView = view === 'calendar';
  const calendarOpen = calendarView || datePickerOpen;
  const visible = wholeMonth
    ? tasks
        .filter((task) => task.date.startsWith(month))
        .sort((a, b) => a.date.localeCompare(b.date))
    : tasks.filter((task) => task.date === selected);
  const counts = new Map<string, number>();
  for (const task of tasks) counts.set(task.date, (counts.get(task.date) ?? 0) + 1);

  function openEditor(task: TodoTask | null, trigger: HTMLButtonElement) {
    returnFocus.current = trigger;
    clearSaveError();
    setEditor({ task });
  }

  function saveDraft(draft: Omit<TodoTask, 'status' | 'id'>) {
    const original = editor?.task;
    const record: TodoTask = original
      ? { ...original, ...draft }
      : { id: nextTodoId(tasks), status: 'pending', ...draft };
    const updated = original
      ? tasks.map((task) => (task.id === original.id ? record : task))
      : [...tasks, record];
    void save(updated, () => {
      if (original && draft.date !== original.date) returnFocus.current = addTrigger.current;
      if (!draft.date.startsWith(month)) {
        setDatePickerOpen(false);
        setCalendarRevision((revision) => revision + 1);
      }
      setSelected(draft.date);
      setEditor(null);
    });
  }

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <h2>待办</h2>
        <div className={styles.filters}>
          <Button
            ref={dateTrigger}
            variant="secondary"
            className={styles.dateButton}
            aria-expanded={calendarOpen}
            aria-controls={calendarId}
            aria-label={`日期 ${wholeMonth ? month : selected}，${calendarOpen ? '收起日历' : '打开日历'}`}
            onClick={() => {
              if (calendarView) setView('day');
              else setDatePickerOpen(!datePickerOpen);
            }}
          >
            <CalendarDays size={16} aria-hidden="true" />{' '}
            {wholeMonth ? `${month.slice(0, 4)} 年 ${Number(month.slice(5))} 月` : dayLabel}
            <ChevronDown size={14} aria-hidden="true" />
          </Button>
          <div className={styles.range} role="group" aria-label="查看范围">
            {views.map(({ value, label }) => (
              <Button
                key={value}
                variant="secondary"
                aria-pressed={view === value}
                onClick={() => {
                  setView(value);
                  setDatePickerOpen(false);
                }}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        <Button
          ref={addTrigger}
          className={styles.add}
          disabled={saving}
          onClick={(event) => openEditor(null, event.currentTarget)}
        >
          <Plus size={16} aria-hidden="true" /> 添加待办
        </Button>
      </div>
      {!editor && saving && <LoadingIndicator compact>正在保存待办…</LoadingIndicator>}
      {!editor && saveError && (
        <p className={styles.error} role="alert">
          保存待办失败，请重试
        </p>
      )}
      <div className={styles.layout} data-calendar={calendarOpen} data-calendar-view={calendarView}>
        <aside
          id={calendarId}
          hidden={!calendarOpen}
          className={styles.calendar}
          aria-label="待办日历"
        >
          {calendarOpen && (
            <TodoCalendar
              key={`${view}-${calendarRevision}`}
              selected={selected}
              counts={counts}
              overview={calendarView}
              onSelect={setSelected}
            />
          )}
        </aside>
        <section className={styles.results} aria-label="待办列表">
          {calendarView && (
            <h3 className={styles.calendarDate} aria-live="polite">
              {dayLabel}
            </h3>
          )}
          {visible.length ? (
            <TodoTaskList
              tasks={visible}
              showDates={wholeMonth}
              saving={saving}
              onColor={(selectedTask, color) => {
                if (selectedTask.bgColor !== color)
                  void save(
                    tasks.map((task) =>
                      task.id === selectedTask.id ? { ...task, bgColor: color } : task,
                    ),
                  );
              }}
              onEdit={openEditor}
              onToggle={(selectedTask) => {
                void save(
                  tasks.map((task) =>
                    task.id === selectedTask.id
                      ? { ...task, status: task.status === 'pending' ? 'completed' : 'pending' }
                      : task,
                  ),
                );
              }}
              onDelete={(task, trigger) => {
                returnFocus.current = trigger;
                setDeleting(task);
              }}
            />
          ) : (
            <p className={styles.empty}>{wholeMonth ? '本月暂无待办' : '当天暂无待办'}</p>
          )}
        </section>
      </div>
      {editor && (
        <TodoEditor
          task={editor.task}
          initialDate={selected}
          saving={saving}
          saveError={saveError}
          returnFocusRef={returnFocus}
          onSave={saveDraft}
          onClose={() => setEditor(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="删除待办"
          description={`确定删除「${deleting.title}」？`}
          confirmLabel="删除"
          errorMessage="删除待办失败，请重试"
          returnFocusRef={returnFocus}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            returnFocus.current = dateTrigger.current;
            void save(tasks.filter((task) => task.id !== deleting.id));
          }}
        />
      )}
    </div>
  );
}
