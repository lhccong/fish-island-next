import { CloudUpload, Menu, Printer, Redo2, Save, Search, Undo2, X, Share2 } from 'lucide-react';
import styles from './WpsChrome.module.css';

export function WpsChrome() {
  return (
    <div
      className={styles.chrome}
      aria-label="WPS 外观示意"
      title="办公工具为外观示意，不提供文档编辑功能"
    >
      <div className={styles.documents} aria-hidden="true">
        <span className={styles.logo}>W365</span>
        <div className={styles.windowActions}>
          <span>−</span>
          <span>▢</span>
          <X size={14} />
        </div>
      </div>
      <div className={styles.menu}>
        <div className={styles.quick} aria-hidden="true">
          <span className={styles.file}>
            <Menu size={13} />
            文件
          </span>
          <span className={styles.autosave}>
            自动保存 <i />
          </span>
          <Save size={15} />
          <span className={styles.quickSymbol}>♧</span>
          <Printer size={15} />
          <Search size={15} />
          <Undo2 size={15} />
          <Redo2 size={15} />
          <span>⌄</span>
        </div>
        <div className={styles.tabs} aria-hidden="true">
          {['开始', '插入', '页面', '公式', '数据', '审阅', '视图', '工具', '会员专享', '效率'].map(
            (tab) => (
              <span key={tab} className={tab === '开始' ? styles.active : undefined}>
                {tab}
              </span>
            ),
          )}
          <span className={styles.ai}>◢ WPS AI</span>
          <Search size={17} />
        </div>
        <div className={styles.cloud} aria-hidden="true">
          <CloudUpload size={15} />
          未上云{' '}
          <span>
            <Share2 size={14} />
            分享
          </span>
        </div>
      </div>
    </div>
  );
}
