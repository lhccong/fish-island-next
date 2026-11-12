import { useEffect, useRef, useState } from 'react';
import type { AboutPort, PayOrder } from '@/domain/about';

export function usePayment(service: AboutPort, onPaid: () => void) {
  const [order, setOrder] = useState<PayOrder | null>(null);
  const [step, setStep] = useState<'select' | 'creating' | 'waiting' | 'success'>('select');
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [checking, setChecking] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (step !== 'waiting' || !order) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let count = 0;
    async function check() {
      setChecking(true);
      try {
        const result = await service.order(order!.id, controller.signal);
        if (controller.signal.aborted) return;
        if (result.id !== order!.id || result.amount !== order!.amount)
          throw new Error('订单校验失败，请联系站长核对');
        if (result.status === 'OD') {
          setStep('success');
          onPaid();
          return;
        }
        if (['CD', 'RD', 'UD'].includes(result.status))
          throw new Error('订单已进入退款流程，请联系站长核对');
        count++;
        if (count >= 60) {
          setError('支付等待已超过 3 分钟，可重新查询或选择金额');
          return;
        }
        timer = setTimeout(() => void check(), 3000);
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : '查询失败，请重试');
      } finally {
        if (!controller.signal.aborted) setChecking(false);
      }
    }
    timer = setTimeout(() => void check(), revision ? 0 : 3000);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [service, order, step, revision, onPaid]);
  async function create(amount: number, remark: string) {
    if (step === 'creating') return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setError('');
    setStep('creating');
    try {
      const result = await service.createOrder(
        amount,
        remark,
        window.location.href,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      if (result.amount !== amount) throw new Error('订单金额校验失败，请重试');
      if (!result.payUrl && !result.qrCode) throw new Error('支付信息不完整，请重新选择金额');
      setOrder(result);
      setStep('waiting');
      if (window.matchMedia('(pointer: coarse)').matches && result.payUrl)
        window.location.assign(result.payUrl);
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : '创建订单失败，请重试');
        setStep('select');
      }
    }
  }
  return {
    order,
    step,
    error,
    checking,
    create,
    recheck: () => {
      setError('');
      setRevision((value) => value + 1);
    },
    reset: () => {
      setStep('select');
      setOrder(null);
      setError('');
      setRevision(0);
    },
  };
}
