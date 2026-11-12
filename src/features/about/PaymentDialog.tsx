import { useState } from 'react';
import { Check, Heart, ScanLine, CircleCheck, LoaderCircle } from 'lucide-react';
import type { AboutPort } from '@/domain/about';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { usePayment } from './use-payment';
import { AboutImage } from './AboutImage';
import { PaymentIntro } from './PaymentIntro';
import { PaymentBenefits } from './PaymentBenefits';
import styles from './AboutExtras.module.css';
import paymentStyles from './Payment.module.css';

const amounts = [
  [1, '小小心意'],
  [6.6, '一路顺风'],
  [9.9, '快乐久久'],
  [29.9, '永久会员'],
  [66, '为鱼岛加油'],
  [100, '专属定制'],
] as const;

export function PaymentDialog({
  service,
  onClose,
  onPaid,
}: {
  service: AboutPort;
  onClose: () => void;
  onPaid: () => void;
}) {
  const [selected, setSelected] = useState(29.9);
  const [custom, setCustom] = useState('');
  const [remark, setRemark] = useState('');
  const payment = usePayment(service, onPaid);
  const amount = custom ? Number(custom) : selected;
  const valid =
    Number.isFinite(amount) &&
    amount >= 0.01 &&
    amount <= 9999 &&
    Math.abs(amount * 100 - Math.round(amount * 100)) < 0.00001;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="打赏支持 💗"
      description="选择金额 → 扫码支付 → 支付成功"
      dismissLabel="关闭打赏弹窗"
      showCloseAction={false}
      className={`${styles.dialog} ${paymentStyles.dialogShell}`}
    >
      <ScrollArea label="打赏支持正文" gutter="reserved">
        <div className={styles.dialogBody}>
          <PaymentIntro />
          {(payment.step === 'select' || payment.step === 'creating') && (
            <form
              id="donation-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (valid) void payment.create(amount, remark);
              }}
            >
              <fieldset disabled={payment.step === 'creating'}>
                <legend>选择打赏金额（元）</legend>
                <div className={paymentStyles.amounts}>
                  {amounts.map(([value, label]) => (
                    <Button
                      key={value}
                      className={paymentStyles.amountCard}
                      variant="secondary"
                      aria-label={`￥${value}`}
                      aria-describedby={`donation-amount-${value}`}
                      aria-pressed={!custom && selected === value}
                      onClick={() => {
                        setSelected(value);
                        setCustom('');
                      }}
                    >
                      <strong>￥{value}</strong>
                      <span id={`donation-amount-${value}`}>{label}</span>
                      {!custom && selected === value && (
                        <Check
                          className={paymentStyles.selectedMark}
                          size={14}
                          aria-hidden="true"
                        />
                      )}
                    </Button>
                  ))}
                </div>
                <label className={styles.field}>
                  自定义金额（元）
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    max="9999"
                    step="0.01"
                    placeholder="输入自定义金额"
                    value={custom}
                    onChange={(event) => setCustom(event.target.value)}
                  />
                </label>
                <label className={styles.field}>
                  备注（可选）
                  <textarea
                    rows={2}
                    maxLength={50}
                    value={remark}
                    onChange={(event) => setRemark(event.target.value)}
                    placeholder="想展示的信息，会出现在打赏榜上"
                  />
                </label>
              </fieldset>
              <PaymentBenefits />
            </form>
          )}
          {payment.step === 'waiting' && payment.order && (
            <div className={styles.payment}>
              <ScanLine className={paymentStyles.stateIcon} size={32} aria-hidden="true" />
              <p>
                请使用微信或支付宝扫码支付 <strong>￥{payment.order.amount.toFixed(2)}</strong>
              </p>
              {payment.order.qrCode && <AboutImage src={payment.order.qrCode} alt="支付二维码" />}
              {payment.order.payUrl && (
                <a href={payment.order.payUrl} target="_blank" rel="noopener noreferrer">
                  打开支付页面
                </a>
              )}
              <p role="status">
                {payment.checking ? '正在查询支付结果…' : '等待支付结果，支付后可手动查询'}
              </p>
              <p className={styles.muted}>关闭弹窗会停止查询；未确认支付的订单不会显示为成功。</p>
            </div>
          )}
          {payment.step === 'success' && (
            <div className={styles.payment}>
              <CircleCheck className={paymentStyles.stateIcon} size={48} aria-hidden="true" />
              <h3 role="status">支付成功！感谢您的支持 💝</h3>
              <p>您的打赏已记录，榜单将自动更新。</p>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className={styles.dialogFooter}>
        {payment.error && <p role="alert">{payment.error}</p>}
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>
            关闭
          </Button>
          {(payment.step === 'select' || payment.step === 'creating') && (
            <Button
              form="donation-form"
              type="submit"
              disabled={!valid || payment.step === 'creating'}
            >
              {payment.step === 'creating' ? (
                <LoaderCircle size={15} className={paymentStyles.spinner} aria-hidden="true" />
              ) : (
                <Heart size={15} aria-hidden="true" />
              )}
              {payment.step === 'creating' ? '创建订单中…' : `确认打赏 ￥${valid ? amount : '--'}`}
            </Button>
          )}
          {payment.step === 'waiting' && (
            <>
              <Button variant="secondary" onClick={payment.reset}>
                重新选择金额
              </Button>
              <Button disabled={payment.checking} onClick={payment.recheck}>
                我已支付
              </Button>
            </>
          )}
          {payment.step === 'success' && <Button onClick={payment.reset}>再次打赏</Button>}
        </div>
      </div>
    </Dialog>
  );
}
