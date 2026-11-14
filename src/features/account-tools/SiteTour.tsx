import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import styles from './Tools.module.css';
import details from './Details.module.css';
const steps = [
  ['账号菜单', '从头像打开个人资料、修改信息、签到、黑名单、兑换码和账号工具。'],
  ['聊天', '从聊天入口进入公共聊天室。消息菜单支持引用、备注和屏蔽；输入草稿在切换主题时保留。'],
  [
    '热榜与发现',
    '热榜查看公开资讯；发现中可进入鱼小圈、阅读和游戏目录。手机从底部导航进入，内页可返回。',
  ],
  [
    '主题与网站设置',
    '主题入口可选择已接入的皮肤。明亮/暗夜模式独立保存，网站设置可修改标签页名称与图标。',
  ],
] as const;
export function SiteTour({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const step = steps[index]!;
  return (
    <div className={styles.body}>
      <ScrollArea label="网站引导内容" gutter="reserved" className={styles.scroll ?? ''}>
        <div className={details.tour}>
          <div className={details.progress} aria-hidden="true">
            {steps.map((item, position) => (
              <span key={item[0]} data-current={position <= index} />
            ))}
          </div>
          <span className={details.progressText}>
            {index + 1} / {steps.length}
          </span>
          <h3>{step[0]}</h3>
          <p>{step[1]}</p>
        </div>
      </ScrollArea>
      <div className={styles.actions}>
        <Button variant="secondary" disabled={index === 0} onClick={() => setIndex((v) => v - 1)}>
          上一步
        </Button>
        <Button
          onClick={() => {
            if (index === steps.length - 1) onDone();
            else setIndex((v) => v + 1);
          }}
        >
          {index === steps.length - 1 ? '完成' : '下一步'}
        </Button>
      </div>
    </div>
  );
}
