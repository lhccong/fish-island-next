import { useState } from 'react';
import type { DrawSettings } from '@/domain/draw';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import styles from './Draw.module.css';
export function CreateRoom({
  busy,
  error,
  onCreate,
}: {
  busy: boolean;
  error: string;
  onCreate: (settings: DrawSettings) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<DrawSettings>({
    maxPlayers: 8,
    totalRounds: 6,
    creatorOnlyMode: false,
    wordType: 'default',
  });
  return (
    <Dialog
      title="创建你画我猜房间"
      description="选择词库和绘画方式，邀请岛友一起猜。"
      trigger={<Button>创建房间</Button>}
      open={open}
      onOpenChange={(value) => {
        if (!busy) setOpen(value);
      }}
    >
      <ScrollArea label="房间设置" gutter="reserved">
        <div className={styles.form}>
          <label>
            人数上限
            <Select
              label="人数上限"
              disabled={busy}
              value={String(settings.maxPlayers)}
              onValueChange={(v) => setSettings((s) => ({ ...s, maxPlayers: Number(v) }))}
              options={Array.from({ length: 19 }, (_, i) => i + 2).map((v) => ({
                value: String(v),
                label: `${v} 人`,
              }))}
            />
          </label>
          <label>
            游戏轮数
            <Select
              label="游戏轮数"
              disabled={busy}
              value={String(settings.totalRounds)}
              onValueChange={(v) => setSettings((s) => ({ ...s, totalRounds: Number(v) }))}
              options={Array.from({ length: 20 }, (_, i) => ({
                value: String(i + 1),
                label: `${i + 1} 轮`,
              }))}
            />
          </label>
          <label>
            词库
            <Select
              label="词库"
              disabled={busy}
              value={settings.wordType}
              onValueChange={(v) => setSettings((s) => ({ ...s, wordType: v }))}
              options={[
                { value: 'default', label: '默认词库' },
                { value: 'hero', label: '王者荣耀' },
                { value: 'idiom', label: '成语' },
              ]}
            />
          </label>
          <label>
            绘画方式
            <Select
              label="绘画方式"
              disabled={busy}
              value={String(settings.creatorOnlyMode)}
              onValueChange={(v) => setSettings((s) => ({ ...s, creatorOnlyMode: v === 'true' }))}
              options={[
                { value: 'false', label: '大家轮流画' },
                { value: 'true', label: '仅房主绘画' },
              ]}
            />
          </label>
        </div>
      </ScrollArea>
      {error && <p role="alert">{error}</p>}
      <div className={styles.actions}>
        <Button
          disabled={busy}
          onClick={() =>
            void onCreate(settings).then((ok) => {
              if (ok) setOpen(false);
            })
          }
        >
          {busy ? '创建中…' : '确认创建'}
        </Button>
      </div>
    </Dialog>
  );
}
