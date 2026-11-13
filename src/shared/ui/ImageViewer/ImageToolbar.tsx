import {
  ArrowLeft,
  ArrowRight,
  Grid2X2,
  ZoomIn,
  ZoomOut,
  Scan,
  RotateCw,
  ExternalLink,
  X,
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import styles from './ImageViewer.module.css';

interface Props {
  index: number;
  count: number;
  ready: boolean;
  zoom: number;
  maxZoom: number;
  scale: number;
  thumbnails: boolean;
  onNavigate: (index: number) => void;
  onThumbnails: () => void;
  onZoom: (zoom: number) => void;
  onFit: () => void;
  onOriginal: () => void;
  onRotate: () => void;
  onOpenOriginal: () => void;
  onClose: () => void;
}

export function ImageToolbar(p: Props) {
  return (
    <div className={styles.toolbar} role="group" aria-label="图片操作">
      <div className={styles.navigation}>
        <Button
          variant="secondary"
          className={styles.icon}
          aria-label="上一张"
          title="上一张（←）"
          disabled={p.index <= 0}
          onClick={() => p.onNavigate(p.index - 1)}
        >
          <ArrowLeft size={18} />
        </Button>
        <Button
          variant="secondary"
          className={styles.icon}
          aria-label="下一张"
          title="下一张（→）"
          disabled={p.index >= p.count - 1}
          onClick={() => p.onNavigate(p.index + 1)}
        >
          <ArrowRight size={18} />
        </Button>
        <span className={styles.counter} aria-live="polite">
          {p.count ? p.index + 1 : 0} / {p.count}
        </span>
        <Button
          variant="secondary"
          className={styles.icon}
          aria-label="缩略图"
          title="缩略图"
          aria-pressed={p.thumbnails}
          disabled={p.count < 2}
          onClick={p.onThumbnails}
        >
          <Grid2X2 size={18} />
        </Button>
      </div>
      <div className={styles.tools}>
        <Button
          variant="secondary"
          className={styles.icon}
          aria-label="放大"
          title="放大（+）"
          disabled={!p.ready || p.zoom >= p.maxZoom}
          onClick={() => p.onZoom(p.zoom * 1.25)}
        >
          <ZoomIn size={18} />
        </Button>
        <Button
          variant="secondary"
          className={styles.icon}
          aria-label="缩小"
          title="缩小（−）"
          disabled={!p.ready || p.zoom <= 0.25}
          onClick={() => p.onZoom(p.zoom / 1.25)}
        >
          <ZoomOut size={18} />
        </Button>
        <Button
          variant="secondary"
          className={styles.ratio}
          aria-label="原始比例"
          title="原始比例（1）"
          disabled={!p.ready}
          onClick={p.onOriginal}
        >
          {Math.round(p.scale * 100)}%
        </Button>
        <Button
          variant="secondary"
          className={styles.icon}
          aria-label="适应窗口"
          title="适应窗口（0）"
          disabled={!p.ready}
          onClick={p.onFit}
        >
          <Scan size={18} />
        </Button>
        <Button
          variant="secondary"
          className={styles.icon}
          aria-label="向右旋转"
          title="向右旋转（R）"
          disabled={!p.ready}
          onClick={p.onRotate}
        >
          <RotateCw size={18} />
        </Button>
        <Button
          variant="secondary"
          className={styles.icon}
          aria-label="打开原图"
          title="在新标签页打开原图，可使用浏览器保存"
          disabled={!p.ready}
          onClick={p.onOpenOriginal}
        >
          <ExternalLink size={18} />
        </Button>
      </div>
      <Button
        variant="secondary"
        className={`${styles.icon} ${styles.close}`}
        aria-label="关闭图片预览"
        title="关闭（Esc）"
        onClick={p.onClose}
      >
        <X size={19} />
      </Button>
    </div>
  );
}
