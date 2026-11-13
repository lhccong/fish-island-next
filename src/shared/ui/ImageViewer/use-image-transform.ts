import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from 'react';

export function useImageTransform(viewport: RefObject<HTMLDivElement | null>) {
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setArea({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [viewport]);
  const rotated = rotation % 180 !== 0;
  const width = rotated ? size.height : size.width;
  const height = rotated ? size.width : size.height;
  const fit =
    width && height ? Math.max(0.001, Math.min(area.width / width, area.height / height, 1)) : 1;
  const maxZoom = Math.max(16, 1 / fit);
  const scale = fit * zoom;
  const limitX = Math.max(0, (width * scale - area.width) / 2);
  const limitY = Math.max(0, (height * scale - area.height) / 2);
  const offset = {
    x: Math.max(-limitX, Math.min(limitX, pan.x)),
    y: Math.max(-limitY, Math.min(limitY, pan.y)),
  };
  const changeZoom = (value: number) => setZoom(Math.max(0.25, Math.min(maxZoom, value)));
  useEffect(() => {
    const element = viewport.current;
    if (!element || !size.width) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta =
        event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? area.height : 1);
      setZoom((value) => Math.max(0.25, Math.min(maxZoom, value * Math.exp(-delta * 0.002))));
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [viewport, size.width, maxZoom, area.height]);
  const distance = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  const release = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
  };
  return {
    zoom,
    maxZoom,
    scale,
    rotation,
    changeZoom,
    setSize,
    reset() {
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      pointers.current.clear();
    },
    original() {
      setZoom(1 / fit);
      setPan({ x: 0, y: 0 });
    },
    rotate() {
      setRotation((value) => (value + 90) % 360);
      setPan({ x: 0, y: 0 });
    },
    imageStyle: {
      width: size.width * scale,
      height: size.height * scale,
      transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg)`,
    },
    gestures: {
      onPointerDown(event: PointerEvent<HTMLDivElement>) {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      },
      onPointerMove(event: PointerEvent<HTMLDivElement>) {
        const previous = pointers.current.get(event.pointerId);
        if (!previous) return;
        const before = distance();
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.current.size === 2 && before > 0) changeZoom(zoom * (distance() / before));
        else
          setPan({
            x: offset.x + event.clientX - previous.x,
            y: offset.y + event.clientY - previous.y,
          });
      },
      onPointerUp: release,
      onPointerCancel: release,
      onLostPointerCapture: release,
    },
  };
}
