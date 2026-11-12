import { useEffect, useRef, useState } from 'react';
import { campPosition } from '@/domain/pet';
import {
  advanceCamp,
  heldDirection,
  movementKey,
  type CampPoint,
  type CampFacing,
} from './camp-movement';

const speed = 26;
export function useCampMovement(enabled: boolean) {
  const scene = useRef<HTMLElement | null>(null);
  const engine = useRef({
    position: { x: 48, y: 60 },
    facing: 'run' as CampFacing,
    target: null as CampPoint | null,
    keys: new Set<string>(),
    frame: 0,
    time: 0,
  });
  const startLoop = useRef<() => void>(() => {});
  const [view, setView] = useState({
    position: { x: 48, y: 60 },
    facing: 'run' as CampFacing,
    moving: false,
  });
  useEffect(() => {
    if (!enabled) return;
    const motion = engine.current;
    function blocked() {
      return (
        document.hidden ||
        !!document.querySelector('[role="dialog"], [role="menu"], [role="listbox"]')
      );
    }
    function publish(moving: boolean) {
      setView({ position: { ...motion.position }, facing: motion.facing, moving });
    }
    function stop() {
      cancelAnimationFrame(motion.frame);
      motion.frame = 0;
      motion.time = 0;
      motion.keys.clear();
      motion.target = null;
      publish(false);
    }
    function tick(time: number) {
      motion.frame = 0;
      if (blocked()) {
        stop();
        return;
      }
      const elapsed = motion.time ? Math.min(0.05, (time - motion.time) / 1000) : 1 / 60;
      motion.time = time;
      let vector = heldDirection(motion.keys);
      let step = elapsed * speed;
      if (!motion.keys.size && motion.target) {
        const dx = motion.target.x - motion.position.x,
          dy = motion.target.y - motion.position.y;
        const distance = Math.hypot(dx, dy);
        vector = distance ? { x: dx / distance, y: dy / distance } : { x: 0, y: 0 };
        step = Math.min(step, distance);
        if (distance <= step + 0.00001) motion.target = null;
      }
      const next = advanceCamp(motion.position, vector, step, motion.facing);
      motion.position = next.position;
      motion.facing = next.facing;
      publish(next.moving);
      if (motion.keys.size || motion.target || next.moving)
        motion.frame = requestAnimationFrame(tick);
      else motion.time = 0;
    }
    function begin() {
      if (!motion.frame) {
        motion.time = 0;
        motion.frame = requestAnimationFrame(tick);
      }
    }
    startLoop.current = begin;
    function accepts(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        blocked()
      )
        return false;
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(
          'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="slider"], [role="switch"], [role="tab"]',
        )
      )
        return false;
      if (
        target instanceof Element &&
        target.closest('button, a') &&
        event.key.startsWith('Arrow') &&
        !scene.current?.contains(target)
      )
        return false;
      const bounds = scene.current?.getBoundingClientRect();
      return !!bounds && bounds.bottom > 0 && bounds.top < innerHeight;
    }
    function keydown(event: KeyboardEvent) {
      const key = movementKey(event.key, event.code);
      if (!key || !accepts(event)) return;
      event.preventDefault();
      motion.keys.add(key);
      motion.target = null;
      begin();
    }
    function keyup(event: KeyboardEvent) {
      const key = movementKey(event.key, event.code);
      if (!key || !motion.keys.delete(key)) return;
      if (!motion.keys.size && !motion.target) stop();
    }
    function focusChanged() {
      const target = document.activeElement;
      if (
        target instanceof Element &&
        target.closest(
          'input, textarea, [contenteditable], [role="dialog"], [role="menu"], [role="listbox"]',
        )
      )
        stop();
    }
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', stop);
    document.addEventListener('visibilitychange', stop);
    document.addEventListener('focusin', focusChanged);
    document.addEventListener('compositionstart', stop);
    return () => {
      cancelAnimationFrame(motion.frame);
      motion.frame = 0;
      motion.time = 0;
      motion.keys.clear();
      motion.target = null;
      startLoop.current = () => {};
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', stop);
      document.removeEventListener('visibilitychange', stop);
      document.removeEventListener('focusin', focusChanged);
      document.removeEventListener('compositionstart', stop);
    };
  }, [enabled]);
  function moveTo(x: number, y: number) {
    if (!enabled) return;
    engine.current.keys.clear();
    engine.current.target = campPosition(x, y);
    startLoop.current();
  }
  return { scene, ...view, moveTo };
}
