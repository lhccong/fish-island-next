import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowDownWideNarrow,
  ArrowLeftRight,
  Bold,
  Brush,
  CaseSensitive,
  ChevronDown,
  Clipboard,
  Copy,
  Eraser,
  Filter,
  Grid2X2,
  Grid3X3,
  Highlighter,
  Italic,
  ListFilter,
  Merge,
  PaintBucket,
  PanelTop,
  Percent,
  Rows3,
  Scissors,
  Search,
  Sigma,
  Table2,
  TableCellsMerge,
  Underline,
  WrapText,
} from 'lucide-react';
import styles from './WpsOfficeTools.module.css';

export function WpsOfficeTools() {
  return (
    <div
      className={styles.tools}
      role="img"
      aria-label="WPS 办公工具外观示意，不提供文档编辑功能"
      title="办公工具为外观示意，不提供文档编辑功能"
    >
      <div className={styles.clipboard} aria-hidden="true">
        <span className={styles.large}>
          <Brush />
          <span>格式刷</span>
        </span>
        <span className={styles.large}>
          <Clipboard className={styles.blue} />
          <span>粘贴⌄</span>
        </span>
        <span className={styles.smallStack}>
          <Scissors className={styles.blue} />
          <Copy className={styles.blue} />
        </span>
      </div>
      <div className={styles.font} aria-hidden="true">
        <div className={styles.row}>
          <span className={styles.fontName}>
            宋体
            <ChevronDown />
          </span>
          <span className={styles.fontSize}>
            11
            <ChevronDown />
          </span>
          <span>A⁺</span>
          <span>A⁻</span>
        </div>
        <div className={styles.row}>
          <Bold />
          <Italic />
          <Underline />
          <span>⌄</span>
          <span className={styles.strike}>ab</span>
          <Grid2X2 />
          <span>⌄</span>
          <Highlighter className={styles.marker} />
          <span className={styles.fontColor}>A</span>
          <Eraser />
          <span>⌄</span>
        </div>
      </div>
      <div className={styles.alignment} aria-hidden="true">
        <div className={styles.twoRows}>
          <div className={styles.row}>
            <AlignLeft />
            <span className={styles.selected}>
              <AlignCenter />
            </span>
            <AlignRight />
            <ListFilter className={styles.blue} />
            <ArrowLeftRight className={styles.blue} />
          </div>
          <div className={styles.row}>
            <AlignLeft />
            <AlignCenter />
            <AlignRight />
            <TableCellsMerge className={styles.blue} />
            <span>↔</span>
          </div>
        </div>
        <span className={styles.large}>
          <WrapText className={styles.green} />
          <span>换行</span>
        </span>
        <span className={styles.large}>
          <Merge className={styles.green} />
          <span>合并⌄</span>
        </span>
      </div>
      <div className={styles.number} aria-hidden="true">
        <div className={styles.row}>
          <span className={styles.numberSelect}>
            常规
            <ChevronDown />
          </span>
          <ArrowLeftRight />
          <span>转换⌄</span>
        </div>
        <div className={styles.row}>
          <span>♧⌄</span>
          <Percent />
          <span>⁰⁰₀</span>
          <span>.₀₀←</span>
          <span>.₀₀→</span>
        </div>
      </div>
      <div className={styles.cells} aria-hidden="true">
        <span className={styles.twoRows}>
          <span>
            <Rows3 className={styles.green} />
            行和列⌄
          </span>
          <span>
            <Table2 className={styles.green} />
            工作表⌄
          </span>
        </span>
        <span className={styles.large}>
          <Grid3X3 className={styles.green} />
          <span>条件格式⌄</span>
        </span>
        <span className={styles.twoRows}>
          <span>
            <Brush />
            表格样式⌄
          </span>
          <span>
            <Grid2X2 />
            单元格样式⌄
          </span>
        </span>
      </div>
      <div className={styles.operations} aria-hidden="true">
        <span className={styles.large}>
          <ArrowDownToLine className={styles.green} />
          <span>填充⌄</span>
        </span>
        <span className={styles.large}>
          <Sigma />
          <span>求和⌄</span>
        </span>
        <span className={styles.large}>
          <ArrowDownWideNarrow />
          <span>排序⌄</span>
        </span>
        <span className={styles.large}>
          <Filter className={styles.green} />
          <span>筛选⌄</span>
        </span>
        <span className={styles.large}>
          <PanelTop className={styles.green} />
          <span>冻结⌄</span>
        </span>
        <span className={styles.large}>
          <Search />
          <span>查找⌄</span>
        </span>
      </div>
      <span className={styles.overflowTools} aria-hidden="true">
        <PaintBucket />
        <CaseSensitive />
      </span>
    </div>
  );
}
