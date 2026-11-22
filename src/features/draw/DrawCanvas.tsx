import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { DrawPort } from '@/domain/draw';
import { Button } from '@/shared/ui/Button';
import { defaultDrawPaint } from './DrawPaintPicker';
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
  const [paint, setPaint] = useState(defaultDrawPaint);
  const [eraser, setEraser] = useState(false);
  const [size, setSize] = useState(5);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const point = useRef<{ x: number; y: number } | null>(null);
  const history = useRef<ImageData[]>([]);
  const revision = useRef(0);
  const saving = useRef(false);
  const lastSaved = useRef('');
  const abort = useRef(new AbortController());
  useEffect(() => {
    const controller = new AbortController();
    abort.current = controller;
    return () => {
      controller.abort();
      onPending(false);
    };
  }, [onPending]);
  useEffect(() => {
    if (editable && revision.current) return;
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
      if (!cancelled && !(editable && revision.current)) {
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
    const { signal } = abort.current;
    if (!editable || !dirty || point.current || !canvas.current || saving.current || signal.aborted)
      return;

    const savedRevision = revision.current;
    const snapshot = canvas.current.toDataURL('image/png');
    saving.current = true;
    setSaveStatus('saving');
    setError('');
    try {
      await service.save(roomId, snapshot, signal);
      if (signal.aborted) return;
      lastSaved.current = snapshot;
      if (revision.current === savedRevision) {
        setDirty(false);
        setSaveStatus('saved');
        onPending(false);
      } else {
        setSaveStatus('idle');
      }
      onSaved();
    } catch (e) {
      if (signal.aborted) return;
      setSaveStatus('idle');
      setError(e instanceof Error ? e.message : '画作保存失败，请重试');
    } finally {
      saving.current = false;
    }
  }
  function markEdited() {
    revision.current++;
    setDirty(true);
    setSaveStatus((status) => (status === 'saved' ? 'idle' : status));
    onPending(true);
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
    context.strokeStyle = paint;
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
    markEdited();
    stroke(point.current);
  }
  function finish() {
    point.current = null;
  }
  return (
    <>
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
              markEdited();
            }
          }}
          onClear={() => {
            const c = canvas.current?.getContext('2d');
            if (c) {
              history.current = [...history.current.slice(-9), c.getImageData(0, 0, 900, 600)];
              c.clearRect(0, 0, 900, 600);
              markEdited();
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
          <div className={styles.canvasStatus}>
            {saveStatus === 'saving' ? (
              <LoadingIndicator compact>正在保存画作…</LoadingIndicator>
            ) : error ? (
              <span role="alert">{error}</span>
            ) : (
              <span role="status">
                {dirty ? '有未保存的修改' : saveStatus === 'saved' ? '画作已保存' : ''}
              </span>
            )}
          </div>
          <Button disabled={!dirty || saveStatus === 'saving'} onClick={() => void save()}>
            保存
          </Button>
        </div>
      )}
    </>
  );
}
