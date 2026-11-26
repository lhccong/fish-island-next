import { useRef, useState } from 'react';
import { Check, Ellipsis, Palette, Pencil, Trash2 } from 'lucide-react';
import type { TodoTask } from '@/domain/todo';
import { Button } from '@/shared/ui/Button';
import { DropdownMenu } from '@/shared/ui/DropdownMenu';
import { Popover } from '@/shared/ui/Popover';
import { TodoColorPicker } from './TodoColorPicker';
import { todoColorStyle } from './todo-color';
import { priorityLabels } from './todo-options';
import styles from './TodoPanel.module.css';

interface Actions {
  saving: boolean;
  onEdit: (task: TodoTask, trigger: HTMLButtonElement) => void;
  onToggle: (task: TodoTask) => void;
  onDelete: (task: TodoTask, trigger: HTMLButtonElement) => void;
  onColor: (task: TodoTask, color: string) => void;
}

export function TodoTaskList({
  tasks,
  showDates,
  ...actions
}: Actions & {
  tasks: readonly TodoTask[];
  showDates: boolean;
}) {
  return (
    <ul className={styles.list} aria-label="待办任务">
      {tasks.map((task) => (
        <TodoTaskRow key={task.id} task={task} showDate={showDates} {...actions} />
      ))}
    </ul>
  );
}

function TodoTaskRow({
  task,
  showDate,
  saving,
  onEdit,
  onToggle,
  onDelete,
  onColor,
}: Actions & {
  task: TodoTask;
  showDate: boolean;
}) {
  const menu = useRef<HTMLButtonElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const completed = task.status === 'completed';
  return (
    <li className={styles.task} data-completed={completed}>
      <Button
        className={styles.check}
        variant="secondary"
        aria-label={completed ? '撤销完成' : '完成'}
        aria-pressed={completed}
        disabled={saving}
        onClick={() => onToggle(task)}
      >
        <span>{completed && <Check size={14} strokeWidth={2.5} aria-hidden="true" />}</span>
      </Button>
      <h3 className={styles.taskTitle}>{task.title}</h3>
      <span className={styles.priority} data-priority={task.priority}>
        {priorityLabels[task.priority]}
      </span>
      <DropdownMenu
        label={`${task.title}的操作`}
        returnFocusRef={menu}
        trigger={
          <Button
            ref={menu}
            variant="secondary"
            className={styles.iconButton}
            aria-label="更多操作"
            disabled={saving}
          >
            <Ellipsis size={20} aria-hidden="true" />
          </Button>
        }
        items={[
          {
            label: '编辑',
            icon: <Pencil size={15} aria-hidden="true" />,
            onSelect: () => {
              if (menu.current) onEdit(task, menu.current);
            },
          },
          {
            label: '删除',
            icon: <Trash2 size={15} aria-hidden="true" />,
            tone: 'danger',
            onSelect: () => {
              if (menu.current) onDelete(task, menu.current);
            },
          },
        ]}
      />
      {(task.description || task.note || showDate) && (
        <div className={styles.taskBody}>
          {task.description && (
            <div className={styles.description} style={todoColorStyle(task.bgColor)}>
              <p data-todo-description>{task.description}</p>
              <Popover
                label="描述底色"
                side="bottom"
                open={pickerOpen}
                onOpenChange={(open) => {
                  if (!open || !saving) setPickerOpen(open);
                }}
                trigger={
                  <Button
                    variant="secondary"
                    className={styles.paletteButton}
                    aria-label="描述底色"
                    aria-disabled={saving}
                  >
                    <Palette size={18} aria-hidden="true" />
                  </Button>
                }
              >
                <TodoColorPicker
                  popup
                  value={task.bgColor}
                  onApply={(color) => {
                    setPickerOpen(false);
                    onColor(task, color);
                  }}
                />
              </Popover>
            </div>
          )}
          {(task.note || showDate) && (
            <div className={styles.metadata}>
              {task.note && <p>备注：{task.note}</p>}
              {showDate && <time dateTime={task.date}>{task.date}</time>}
            </div>
          )}
        </div>
      )}
    </li>
  );
}
