import { useState } from 'react';
import { useStore } from 'zustand';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Select } from '@/shared/ui/Select';
import type { RoomController } from './room-controller';
import styles from './Undercover.module.css';
export function CreateRoomDialog({
  open,
  onOpenChange,
  controller,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  controller: RoomController;
}) {
  const [mode, setMode] = useState('1');
  const [max, setMax] = useState('6');
  const [duration, setDuration] = useState('300');
  const pending = useStore(controller.store, (s) => s.pending);
  const error = useStore(controller.store, (s) => s.actionError);
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) onOpenChange(value);
      }}
      title="创建联机房间"
      description="词语由服务端随机分配，至少 3 人即可开始。"
      showCloseAction={false}
      dismissLabel="关闭创建房间"
      className={styles.dialog ?? ''}
    >
      <ScrollArea label="房间设置" gutter="reserved" className={styles.dialogBody ?? ''}>
        <div className={styles.dialogFields}>
          <label>
            游戏模式
            <Select
              label="游戏模式"
              value={mode}
              disabled={pending}
              onValueChange={setMode}
              options={[
                { value: '1', label: '常规模式' },
                { value: '2', label: '卧底猜词模式' },
              ]}
            />
          </label>
          <p>
            {mode === '1'
              ? '每人拿到一个词语，根据描述找出不同的词。身份在游戏结束时揭晓。'
              : '平民拿到词语，卧底没有词语，可以通过发言推理，最多猜词 3 次。'}
          </p>
          <label>
            房间人数上限
            <Select
              label="房间人数上限"
              value={max}
              disabled={pending}
              onValueChange={setMax}
              options={Array.from({ length: 18 }, (_, i) => ({
                value: String(i + 3),
                label: `${i + 3} 人`,
              }))}
            />
          </label>
          <label>
            本轮时长
            <Select
              label="本轮时长"
              value={duration}
              disabled={pending}
              onValueChange={setDuration}
              options={[
                { value: '180', label: '3 分钟' },
                { value: '300', label: '5 分钟' },
                { value: '600', label: '10 分钟' },
              ]}
            />
          </label>
        </div>
      </ScrollArea>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <Button variant="secondary" disabled={pending} onClick={() => onOpenChange(false)}>
          取消
        </Button>
        <Button
          disabled={pending}
          onClick={async () => {
            if (
              await controller.create({
                maxPlayers: Number(max),
                duration: Number(duration),
                gameMode: mode === '2' ? 2 : 1,
                civilianWord: '',
                undercoverWord: '',
              })
            )
              onOpenChange(false);
          }}
        >
          {pending ? '正在创建…' : '创建房间'}
        </Button>
      </div>
    </Dialog>
  );
}
