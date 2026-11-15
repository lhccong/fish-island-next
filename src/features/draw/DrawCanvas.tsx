import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { DrawPort } from '@/domain/draw';
import { Button } from '@/shared/ui/Button';
import { DrawToolbar } from './DrawToolbar';

import styles from './Draw.module.css';
export function DrawCanvas({
  service,
  roomId,
  image,
  editable,
  onSaved,
  onPending,
}: {
  service: DrawPort;
  roomId: string;
  image: string;
  editable: boolean;
  onSaved: () => void;
  onPending: (pending: boolean) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [paint, setPaint] = useState('ink');
  const [eraser, setEraser] = useState(false);
  const [size, setSize] = useState(5);
  const [sync, setSync] = useState('');
  const [error, setError] = useState('');
  const point = useRef<{ x: number; y: number } | null>(null);
  const history = useRef<ImageData[]>([]);
  const queue = useRef('');
  const busy = useRef(false);

  const edited = useRef(false);
  const lastSaved = useRef('');
  const abort = useRef(new AbortController());
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    abort.current = controller;
    return () => {
      controller.abort();
      if (debounce.current) clearTimeout(debounce.current);
      onPending(false);
    };
  }, [onPending]);
  useEffect(() => {
    if (editable && edited.current) return;
    const context = canvas.current?.getContext('2d');
    if (!context) return;
    if (!image) {
      context.clearRect(0, 0, 900, 600);
      return;
    }
    if (image === lastSaved.current) return;
    let cancelled = false;
    const bitmap = new Image();
    bitmap.onload = () => {
      if (!cancelled && !(editable && edited.current)) {
        context.clearRect(0, 0, 900, 600);
        context.drawImage(bitmap, 0, 0, 900, 600);
      }
    };
    bitmap.onerror = () => {
      if (!cancelled) setError('画作读取失败，请刷新房间');
    };
    bitmap.src = image;
    return () => {
      cancelled = true;
    };
  }, [image, editable]);
  async function save() {
    if (busy.current || !queue.current || abort.current.signal.aborted) return;
    busy.current = true;
    const snapshot = queue.current;
    queue.current = '';
    setSync('正在同步画作…');
    setError('');
    try {
      await service.save(roomId, snapshot, abort.current.signal);
      if (abort.current.signal.aborted) return;
      lastSaved.current = snapshot;

      setSync('画作已同步');
      onSaved();
      if (!queue.current) onPending(false);
    } catch (e) {
      if (abort.current.signal.aborted) return;
      if (!queue.current) queue.current = snapshot;
      setSync('');
      setError(e instanceof Error ? e.message : '画作同步失败，请重试');
      busy.current = false;
      return;
    }
    busy.current = false;
    if (queue.current) void save();
  }
  function publish() {
    if (canvas.current) {
      edited.current = true;
      onPending(true);
      queue.current = canvas.current.toDataURL('image/png');
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(() => void save(), 600);
    }
  }
  function coordinates(e: PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(900, ((e.clientX - r.left) * 900) / r.width)),
      y: Math.max(0, Math.min(600, ((e.clientY - r.top) * 600) / r.height)),
    };
  }
  function stroke(next: { x: number; y: number }) {
    const context = canvas.current?.getContext('2d');
    if (!context || !point.current) return;
    context.globalCompositeOperation = eraser ? 'destination-out' : 'source-over';
    context.strokeStyle = getComputedStyle(canvas.current!)
      .getPropertyValue(`--color-draw-${paint}`)
      .trim();
    context.lineWidth = eraser ? size * 4 : size;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(point.current.x, point.current.y);
    context.lineTo(next.x + 0.01, next.y + 0.01);
    context.stroke();
    context.globalCompositeOperation = 'source-over';
    point.current = next;
  }
  function start(e: PointerEvent<HTMLCanvasElement>) {
    if (!editable || !e.isPrimary || e.button !== 0) return;
    const context = canvas.current?.getContext('2d');
    if (!context) return;
    history.current = [...history.current.slice(-9), context.getImageData(0, 0, 900, 600)];
    e.currentTarget.setPointerCapture(e.pointerId);
    point.current = coordinates(e);
    onPending(true);
    edited.current = true;
    stroke(point.current);
  }
  function finish() {
    if (!point.current) return;
    point.current = null;
    publish();
  }
  return (
    <section className={styles.painting} aria-label="绘画区">
      {editable && (
        <DrawToolbar
          paint={paint}
          eraser={eraser}
          size={size}
          onPaint={setPaint}
          onEraser={setEraser}
          onSize={setSize}
          onUndo={() => {
            const previous = history.current.pop();
            if (previous) {
              canvas.current?.getContext('2d')?.putImageData(previous, 0, 0);
              publish();
            }
          }}
          onClear={() => {
            const c = canvas.current?.getContext('2d');
            if (c) {
              history.current = [...history.current.slice(-9), c.getImageData(0, 0, 900, 600)];
              c.clearRect(0, 0, 900, 600);
              publish();
            }
          }}
        />
      )}
      <div className={styles.paper}>
        <canvas
          ref={canvas}
          width={900}
          height={600}
          aria-label={editable ? '绘画画布，使用触屏或鼠标绘制' : '当前画作'}
          className={editable ? styles.editable : ''}
          onPointerDown={start}
          onPointerMove={(e) => {
            if (editable && point.current) stroke(coordinates(e));
          }}
          onPointerUp={finish}
          onPointerCancel={finish}
          onLostPointerCapture={finish}
        />
      </div>
      {editable && (
        <div className={styles.canvasFeedback}>
          <div role="status">
            {sync === '正在同步画作…' ? (
              <LoadingIndicator compact>{sync}</LoadingIndicator>
            ) : (
              sync || '落笔后自动同步'
            )}
          </div>
          {error && (
            <div role="alert">
              {error}
              <Button variant="secondary" onClick={() => void save()}>
                重试同步画作
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
