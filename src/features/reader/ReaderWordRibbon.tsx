import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDownAZ,
  Bold,
  CaseSensitive,
  ChevronDown,
  Clipboard,
  Copy,
  Eraser,
  Highlighter,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  ListOrdered,
  ListTree,
  MousePointer2,
  Paintbrush,
  Pilcrow,
  Replace,
  Scissors,
  Search,
  SquareDashed,
  Strikethrough,
  Subscript,
  Superscript,
  TextCursorInput,
  Underline,
} from 'lucide-react';
import styles from './ReaderWordHeader.module.css';

const stylesGallery = [
  ['正文', 'normal'],
  ['无间隔', 'normal'],
  ['标题 1', 'heading'],
  ['标题 2', 'large'],
  ['标题', 'large'],
  ['副标题', 'strong'],
  ['不明显强调', 'emphasis'],
  ['强调', 'emphasis'],
  ['明显强调', 'accent'],
] as const;

export function ReaderWordRibbon() {
  return (
    <div className={styles.ribbonGroups} aria-hidden="true">
      <div className={`${styles.group} ${styles.clipboard}`}>
        <div className={styles.tools}>
          <div className={styles.paste}>
            <Clipboard size={34} />
            粘贴
            <ChevronDown size={9} />
          </div>
          <div className={styles.toolList}>
            <span>
              <Scissors size={15} />
              剪切
            </span>
            <span>
              <Copy size={15} />
              复制
            </span>
            <span>
              <Paintbrush size={15} className={styles.formatPainter} />
              格式刷
            </span>
          </div>
        </div>
        <span className={styles.groupName}>剪贴板</span>
      </div>
      <div className={`${styles.group} ${styles.font}`}>
        <div className={styles.toolRows}>
          <div className={styles.tools}>
            <div className={styles.fontFields}>
              <span>
                等线 (西文正文)
                <ChevronDown size={9} />
              </span>
              <span>
                五号
                <ChevronDown size={9} />
              </span>
            </div>
            <div className={styles.tools}>
              <span className={styles.growText}>
                A<sup>▴</sup>
              </span>
              <span>
                A<sup>▾</sup>
              </span>
              <CaseSensitive size={19} />
              <Eraser size={16} />
              <TextCursorInput size={16} />
            </div>
          </div>
          <div className={styles.tools}>
            <Bold size={15} />
            <Italic size={15} />
            <Underline size={15} />
            <Strikethrough size={16} />
            <Subscript size={16} />
            <Superscript size={16} />
            <span className={styles.textEffect}>A</span>
            <Highlighter size={17} className={styles.highlight} />
            <span className={styles.textColor}>A</span>
            <span className={styles.shaded}>A</span>
            <span>字</span>
          </div>
        </div>
        <span className={styles.groupName}>字体</span>
      </div>
      <div className={`${styles.group} ${styles.paragraph}`}>
        <div className={styles.toolRows}>
          <div className={styles.tools}>
            <List size={19} />
            <ListOrdered size={19} />
            <ListTree size={19} />
            <IndentDecrease size={19} />
            <IndentIncrease size={19} />
            <CaseSensitive size={18} />
            <ArrowDownAZ size={19} />
            <Pilcrow size={17} />
          </div>
          <div className={styles.tools}>
            <AlignLeft size={17} />
            <AlignCenter size={17} />
            <AlignRight size={17} />
            <span className={styles.justified}>
              <AlignJustify size={17} />
            </span>
            <IndentIncrease size={17} />
            <ListOrdered size={18} />
            <Paintbrush size={16} />
            <SquareDashed size={16} />
          </div>
        </div>
        <span className={styles.groupName}>段落</span>
      </div>
      <div className={`${styles.group} ${styles.gallery}`}>
        <div className={styles.samples}>
          {stylesGallery.map(([name, sample]) => (
            <div key={name} className={styles.sample} data-sample={sample}>
              <span>AaBbCcDd</span>
              <small>{name}</small>
            </div>
          ))}
        </div>
        <span className={styles.groupName}>样式</span>
      </div>
      <div className={`${styles.group} ${styles.edit}`}>
        <div className={styles.toolList}>
          <span>
            <Search size={17} />
            查找
            <ChevronDown size={8} />
          </span>
          <span>
            <Replace size={16} />
            替换
          </span>
          <span>
            <MousePointer2 size={16} />
            选择
            <ChevronDown size={8} />
          </span>
        </div>
        <span className={styles.groupName}>编辑</span>
      </div>
    </div>
  );
}
