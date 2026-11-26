import { useId, useRef, useState, type FormEvent, type RefObject } from 'react';
import { CalendarDays, Palette } from 'lucide-react';
import { todoPriorities, type TodoTask } from '@/domain/todo';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Select } from '@/shared/ui/Select';
import { TodoCalendar } from './TodoCalendar';
import { TodoColorPicker } from './TodoColorPicker';
import { todoColorStyle } from './todo-color';
import { priorityLabels } from './todo-options';
import styles from './TodoEditor.module.css';

const priorities = todoPriorities.map((value) => ({ value, label: priorityLabels[value] }));

export function TodoEditor({
  task,
  initialDate,
  saving,
  saveError,
  returnFocusRef,
  onSave,
  onClose,
}: {
  task: TodoTask | null;
  initialDate: string;
  saving: boolean;
  saveError: boolean;
  returnFocusRef: RefObject<HTMLElement | null>;
  onSave: (draft: Omit<TodoTask, 'status' | 'id'>) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [note, setNote] = useState(task?.note ?? '');
  const [date, setDate] = useState(task?.date ?? initialDate);
  const [priority, setPriority] = useState(task?.priority ?? 'medium');
  const [bgColor, setBgColor] = useState(task?.bgColor || 'transparent');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const calendarId = useId();
  const colorId = useId();
  const colorTrigger = useRef<HTMLButtonElement>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !title.trim()) return;
    onSave({ title: title.trim(), description, note, date, priority, bgColor });
  }

  function closeColorPicker() {
    setColorOpen(false);
    colorTrigger.current?.focus();
  }

  return (
    <Dialog
      open
      title={task ? '编辑待办' : '添加待办'}
      description="设置任务内容、日期和优先级"
      hideDescription
      dismissLabel="关闭待办表单"
      showCloseAction={false}
      returnFocusRef={returnFocusRef}
      className={styles.dialog ?? ''}
      onEscapeKeyDown={(event) => {
        if (colorOpen) {
          event.preventDefault();
          closeColorPicker();
        }
      }}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <form className={styles.form} onSubmit={submit}>
        <ScrollArea label="待办表单滚动区" gutter="reserved" persistentScrollbar>
          <fieldset className={styles.fields} disabled={saving} aria-label="待办内容">
            <label className={styles.field}>
              任务标题
              <input
                required
                maxLength={50}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <div className={styles.paired}>
              <div className={styles.field}>
                <span>开始日期</span>
                <Button
                  variant="secondary"
                  aria-label={`开始日期 ${date}`}
                  aria-expanded={calendarOpen}
                  aria-controls={calendarId}
                  onClick={() => setCalendarOpen(!calendarOpen)}
                >
                  <CalendarDays size={16} aria-hidden="true" /> {date}
                </Button>
              </div>
              <div className={styles.field}>
                <span>优先级</span>
                <Select
                  label="优先级"
                  options={priorities}
                  value={priority}
                  disabled={saving}
                  onValueChange={(value) => {
                    const next = todoPriorities.find((item) => item === value);
                    if (next) setPriority(next);
                  }}
                />
              </div>
            </div>
            <div id={calendarId} hidden={!calendarOpen}>
              {calendarOpen && <TodoCalendar selected={date} onSelect={setDate} />}
            </div>
            <label className={styles.field}>
              任务描述
              <textarea
                rows={3}
                maxLength={200}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <label className={styles.field}>
              备注
              <input
                maxLength={100}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            <div className={styles.field}>
              <Button
                className={styles.colorTrigger}
                ref={colorTrigger}
                variant="secondary"
                aria-expanded={colorOpen}
                aria-controls={colorId}
                onClick={() => setColorOpen(!colorOpen)}
              >
                <Palette size={16} aria-hidden="true" /> 描述底色
                <span
                  className={styles.swatch}
                  style={todoColorStyle(bgColor)}
                  aria-hidden="true"
                />
              </Button>
              <div id={colorId} hidden={!colorOpen} className={styles.colorPanel}>
                {colorOpen && (
                  <TodoColorPicker
                    value={bgColor}
                    onApply={(color) => {
                      setBgColor(color);
                      closeColorPicker();
                    }}
                  />
                )}
              </div>
            </div>
          </fieldset>
        </ScrollArea>
        <footer className={styles.footer}>
          {saveError && <p role="alert">保存待办失败，请重试</p>}
          <div className={styles.actions}>
            {saving && <LoadingIndicator compact>正在保存…</LoadingIndicator>}
            <Button variant="secondary" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={saving || !title.trim()}>
              {task ? '保存' : '添加'}
            </Button>
          </div>
        </footer>
      </form>
    </Dialog>
  );
}
