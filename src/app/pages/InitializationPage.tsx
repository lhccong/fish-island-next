import { BookOpen, Check, Layers3, MessageCircle, Palette, Radio } from 'lucide-react';
import { Dialog } from '@/shared/ui/Dialog';
import { useAppearanceStore } from '@/features/appearance';
import { builtinSkins } from '@/skins/builtin';
import { Button } from '@/shared/ui/Button';
import styles from './InitializationPage.module.css';

const foundations = [
  { icon: Layers3, title: '清晰的模块边界', description: '聊天内核、通信适配与界面外壳分层组织。' },
  {
    icon: Palette,
    title: '可扩展的外观',
    description: '配色预览已就绪，完整外壳与皮肤导入待实现。',
  },
  { icon: Radio, title: '独立的实时通信', description: '后端尚未接入，后续按统一协议边界开发。' },
];

export function InitializationPage() {
  const skinId = useAppearanceStore((state) => state.skinId);
  const setSkinId = useAppearanceStore((state) => state.setSkinId);
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a className={styles.brand} href="/" aria-label="鱼岛首页">
          <MessageCircle aria-hidden="true" /> 鱼岛 <span>NEXT</span>
        </a>
        <span className={styles.status}>
          <span aria-hidden="true" /> 工程已初始化
        </span>
      </header>
      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="page-title">
          <span className={styles.eyebrow}>FISH ISLAND · A FRESH START</span>
          <h1 id="page-title">
            轻盈的聊天体验，
            <br />
            <span>从清晰的架构开始。</span>
          </h1>
          <p className={styles.lead}>
            React + TypeScript + Vite。为多种聊天外壳、第三方皮肤和持续迭代准备的新起点。
          </p>
          <Dialog
            title="先读规范，再写功能"
            description="仓库根目录的 AGENTS.md 是开发入口，以下文档共同约束后续实现。"
            trigger={
              <Button>
                <BookOpen size={18} aria-hidden="true" /> 查看开发约定
              </Button>
            }
          >
            <ul className={styles.docList}>
              <li>
                <code>docs/architecture.md</code> 系统架构与模块边界
              </li>
              <li>
                <code>docs/component-standards.md</code> 组件与样式规范
              </li>
              <li>
                <code>docs/skin-spec.md</code> 皮肤与外壳协议
              </li>
              <li>
                <code>docs/performance.md</code> 聊天性能与验收
              </li>
            </ul>
          </Dialog>
        </section>
        <section className={styles.preview} aria-labelledby="preview-title">
          <div className={styles.previewHeader}>
            <span>APPEARANCE LAB</span>
            <span>01 / FOUNDATION</span>
          </div>
          <div className={styles.previewBody}>
            <div className={styles.previewIcon}>
              <Palette size={28} aria-hidden="true" />
            </div>
            <h2 id="preview-title">一套内核，多种表达</h2>
            <p>切换基础配色，预览设计变量的统一应用。</p>
            <div className={styles.skinOptions} role="group" aria-label="基础配色预览">
              {builtinSkins.map((skin) => (
                <button
                  key={skin.id}
                  type="button"
                  aria-pressed={skinId === skin.id}
                  onClick={() => setSkinId(skin.id)}
                >
                  {skinId === skin.id && <Check size={15} aria-hidden="true" />}
                  {skin.name}
                </button>
              ))}
            </div>
            <div className={styles.sample} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p className={styles.note}>当前仅为配色预览，尚未实现完整平台布局或聊天功能。</p>
          </div>
        </section>
        <section className={styles.foundations} aria-label="工程基础">
          {foundations.map(({ icon: Icon, title, description }) => (
            <article className={styles.foundation} key={title}>
              <Icon size={21} aria-hidden="true" />
              <h2>{title}</h2>
              <p>{description}</p>
            </article>
          ))}
        </section>
      </main>
      <footer className={styles.footer}>
        <span>设计有边界，迭代有依据。</span>
        <span>ARCHITECTURE FIRST · 2026</span>
      </footer>
    </div>
  );
}
