import { useRef, useState } from 'react';
import { Dialog } from '@/shared/ui/Dialog';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { AboutImage } from './AboutImage';
import meituan1 from './assets/meituan-1.jpg';
import meituan2 from './assets/meituan-2.jpg';
import eleme from './assets/eleme.jpg';
import taobao from './assets/taobao.jpg';
import styles from './AboutExtras.module.css';
const platforms = [
  { name: '美团外卖', description: '美团福利券1', image: meituan1 },
  { name: '美团外卖', description: '美团福利券2', image: meituan2 },
  { name: '饿了么', description: '超值外卖红包', image: eleme },
  { name: '淘宝闪购', description: '限时特价商品', image: taobao },
];
export function WelfareWorkspace() {
  const [preview, setPreview] = useState<(typeof platforms)[number] | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <>
      <ScrollArea label="外卖福利" gutter="reserved">
        <div className={styles.container}>
          <h2>外卖福利专区 🎁</h2>
          <p>扫码领券，享受美食优惠</p>
          <section className={styles.panel}>
            <h3>如何使用外卖券？</h3>
            <p>1. 扫描下方二维码 → 2. 领取专属优惠券 → 3. 下单享受折扣</p>
            <p>温馨提示：通过扫码下单还能给站点带来一点分红收益，感谢您的支持 ❤️</p>
            <p className={styles.muted}>保留旧版活动图片，优惠有效期及领取条件以对应平台为准。</p>
          </section>
          <div className={styles.welfareGrid}>
            {platforms.map((platform) => (
              <article className={styles.panel} key={platform.description}>
                <AboutImage src={platform.image} alt={platform.description} />
                <h3>{platform.name}</h3>
                <p>{platform.description}</p>
                <Button
                  variant="secondary"
                  onClick={(event) => {
                    returnFocus.current = event.currentTarget;
                    setPreview(platform);
                  }}
                >
                  查看{platform.description}大图
                </Button>
              </article>
            ))}
          </div>
          <section className={styles.panel}>
            <h3>更多福利持续更新中…</h3>
            <p>欢迎常来看看优惠券和福利活动。</p>
          </section>
        </div>
      </ScrollArea>
      {preview && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setPreview(null);
          }}
          title={preview.description}
          description="长按图片保存到相册，然后用微信扫一扫识别"
          returnFocusRef={returnFocus}
          dismissLabel="关闭图片预览"
          showCloseAction={false}
          className={styles.dialog ?? ''}
        >
          <ScrollArea label="福利图片预览" gutter="reserved">
            <div className={styles.dialogBody}>
              <AboutImage src={preview.image} alt={`${preview.description}大图`} />
            </div>
          </ScrollArea>
          <div className={styles.dialogFooter}>
            <div className={styles.actions}>
              <Button variant="secondary" onClick={() => setPreview(null)}>
                关闭
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
