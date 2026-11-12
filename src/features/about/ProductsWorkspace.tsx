import { useState } from 'react';
import { Tv, Music, Rocket, Monitor, Smartphone } from 'lucide-react';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Button } from '@/shared/ui/Button';
import styles from './AboutExtras.module.css';
const products = [
  {
    name: '摸鱼 TV',
    icon: Tv,
    url: 'https://tv.yucoder.cn',
    description:
      '专注于电视节目和综艺内容，热播电视剧、热门综艺和经典电影，陪你享受工作之余的观影时光。',
  },
  {
    name: '摸鱼音乐',
    icon: Music,
    url: 'https://music.yucoder.cn/',
    description: '轻松便捷的在线音乐平台，汇集丰富音乐内容，陪你在工作和学习之余享受片刻放松时光。',
  },
  {
    name: '摸鱼派对',
    icon: Rocket,
    url: 'https://game.yucoder.cn/',
    description: '工作之余，来摸鱼派对享受轻松愉快的游戏时光。',
  },
  {
    name: 'uTools 端',
    icon: Monitor,
    url: 'https://u.tools/',
    description:
      '下载 uTools 应用，在插件市场搜索「摸鱼岛」即可安装使用。极简、插件化的现代桌面软件，让你快速访问摸鱼岛。',
  },
  {
    name: 'App 端',
    icon: Smartphone,
    url: '',
    description:
      '安卓用户：加入 QQ 群下载安装包。iOS 用户：旧版通过 Expo Go 注册后联系岛主邀请。移动办公，随时摸鱼；当前安装及邀请方式请向岛主确认。',
  },
];
export function ProductsWorkspace() {
  const [feedback, setFeedback] = useState('');
  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setFeedback('网址已复制到剪贴板');
    } catch {
      setFeedback(`复制失败，请手动复制：${url}`);
    }
  }
  return (
    <ScrollArea label="其他产品" gutter="reserved">
      <div className={styles.container}>
        <h2>摸鱼岛出品 🌟</h2>
        <p className={styles.muted}>
          以下为旧版产品入口与介绍，产品服务及客户端安装方式以各站点为准。
        </p>
        <p role="status" className={styles.copyFeedback}>
          {feedback}
        </p>
        <div className={styles.productsGrid}>
          {products.map(({ name, icon: Icon, url, description }) => (
            <article className={styles.panel} key={name}>
              <div className={styles.productIcon}>
                <Icon size={56} aria-hidden="true" />
              </div>
              <h3>{name}</h3>
              <p>{description}</p>
              {url ? (
                <div className={styles.actions}>
                  <Button
                    variant="secondary"
                    onClick={() => void copy(url)}
                    aria-label={`复制${name}网址`}
                  >
                    复制网址
                  </Button>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    {name === 'uTools 端' ? '立即下载 uTools' : '立即访问'}
                  </a>
                </div>
              ) : (
                <p className={styles.muted}>请在共建与反馈中联系岛主</p>
              )}
            </article>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
