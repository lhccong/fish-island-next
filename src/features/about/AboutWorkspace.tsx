import { useState } from 'react';
import { Users, AppWindow, Copy, BookOpen, Check } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { legacyFeatures } from './features';
import qrCode from './assets/qq-about.png';
import styles from './AboutWorkspace.module.css';

export function AboutWorkspace() {
  const [copyState, setCopyState] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [imageState, setImageState] = useState<'loading' | 'success' | 'error'>('loading');
  const [imageAttempt, setImageAttempt] = useState(0);
  async function copyGroup() {
    setCopyState('pending');
    try {
      await navigator.clipboard.writeText('695425036');
      setCopyState('success');
    } catch {
      setCopyState('error');
    }
  }
  return (
    <ScrollArea label="关于摸鱼岛" gutter="reserved">
      <div className={styles.container}>
        <article className={styles.card}>
          <section aria-labelledby="about-feedback">
            <h2 id="about-feedback">
              <Users aria-hidden="true" />
              共建与反馈
            </h2>
            <p>
              我们欢迎所有用户参与共建，您的每一条建议都是我们进步的动力。加入我们的QQ群，一起讨论和改进：
            </p>
            <div className={styles.contact}>
              {imageState === 'loading' && <span role="status">正在加载QQ群二维码…</span>}
              {imageState !== 'error' && (
                <img
                  key={imageAttempt}
                  src={qrCode}
                  alt="QQ群二维码"
                  width={200}
                  height={197}
                  onLoad={() => setImageState('success')}
                  onError={() => setImageState('error')}
                />
              )}
              {imageState === 'error' && (
                <div className={styles.imageError}>
                  <p role="alert">二维码加载失败，可通过下方群号搜索加入。</p>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setImageState('loading');
                      setImageAttempt((value) => value + 1);
                    }}
                  >
                    重新加载二维码
                  </Button>
                </div>
              )}
              <div className={styles.group}>
                <span>
                  QQ群号：<strong>695425036</strong>（暗号：摸鱼）
                </span>
                <Button onClick={() => void copyGroup()} disabled={copyState === 'pending'}>
                  <Copy size={15} aria-hidden="true" />
                  {copyState === 'pending' ? '复制中…' : '复制'}
                </Button>
              </div>
              <div className={styles.feedback} aria-live="polite">
                {copyState === 'success' && <span role="status">QQ群号已复制到剪贴板</span>}
                {copyState === 'error' && (
                  <span role="alert">复制失败，请手动复制群号：695425036</span>
                )}
              </div>
              <a
                className={styles.document}
                href="https://docs.qq.com/sheet/DSXdWdk9rbGNqT2NT?tab=BB08J2"
                target="_blank"
                rel="noopener noreferrer"
              >
                <BookOpen size={18} aria-hidden="true" />
                【腾讯文档】摸鱼岛需求与Bug
              </a>
            </div>
          </section>
          <section aria-labelledby="about-features">
            <h2 id="about-features">
              <AppWindow aria-hidden="true" />
              网站功能介绍
            </h2>
            <p>
              鱼岛是一个专注于提供优质阅读体验和丰富娱乐功能的平台，我们致力于为用户提供一站式的信息聚合和娱乐服务。
            </p>
            <p className={styles.note}>
              以下保留旧版摸鱼岛的功能介绍，部分能力尚未迁移至 Next，实际可用功能以当前入口为准。
            </p>
            {legacyFeatures.map(({ title, icon: Icon, items }, index) => (
              <section className={styles.feature} key={title}>
                <h3>
                  <Icon aria-hidden="true" />
                  {index + 1}. {title}
                </h3>
                <ul>
                  {items.map((item) => (
                    <li key={item}>
                      <Check size={16} aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </section>
        </article>
      </div>
    </ScrollArea>
  );
}
