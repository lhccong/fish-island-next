import { useEffect, useRef, useState } from 'react';
import {
  petCardsDay,
  type PetCardCatalog,
  type PetCardsAction,
  type PetCardsPort,
  type PetCardsProgress,
} from '@/domain/pet';

type Snapshot =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; progress: PetCardsProgress };

export function usePetCards(port: PetCardsPort, userId: string, catalog: PetCardCatalog) {
  const [snapshot, setSnapshot] = useState<Snapshot>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [day, setDay] = useState(petCardsDay);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);

  useEffect(() => {
    return port.watch(
      userId,
      (progress) => setSnapshot({ status: 'ready', progress }),
      () => setSnapshot({ status: 'error' }),
    );
  }, [attempt, port, userId]);

  useEffect(() => {
    const refreshDay = () => setDay(petCardsDay());
    const interval = window.setInterval(refreshDay, 15_000);
    window.addEventListener('focus', refreshDay);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshDay);
    };
  }, []);

  function retry() {
    setSnapshot({ status: 'loading' });
    setAttempt((value) => value + 1);
  }

  async function run(action: PetCardsAction) {
    if (inFlight.current) return false;
    inFlight.current = true;
    setError('');
    setPending(true);
    try {
      await port.update(userId, action, catalog);
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error && cause.name === 'Error'
          ? cause.message
          : '保存试玩进度失败，请重试。',
      );
      return false;
    } finally {
      setDay(petCardsDay());
      setPending(false);
      inFlight.current = false;
    }
  }

  return { snapshot, day, pending, error, clearError: () => setError(''), retry, run };
}
