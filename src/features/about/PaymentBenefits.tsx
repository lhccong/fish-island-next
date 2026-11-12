import { Award, Crown, Gift } from 'lucide-react';
import styles from './Payment.module.css';

export function PaymentBenefits() {
  return (
    <section className={styles.benefits} aria-label="打赏福利说明">
      <h3>
        <Gift size={16} aria-hidden="true" /> 心意有回响
      </h3>
      <ul>
        <li>
          <Award size={18} aria-hidden="true" />
          <div>
            <strong>￥1 · 天使投资人</strong>
            <span>获得专属头衔，让支持留下印记</span>
          </div>
        </li>
        <li>
          <Crown size={18} aria-hidden="true" />
          <div>
            <strong>￥29.9 · 永久会员</strong>
            <span>自动领取，未到账请联系岛主</span>
          </div>
        </li>
        <li>
          <Gift size={18} aria-hidden="true" />
          <div>
            <strong>￥100 · 专属定制</strong>
            <span>联系岛主定制称号及专属福利兑换码</span>
          </div>
        </li>
      </ul>
      <p>福利沿用旧版说明，具体发放以站点服务为准。量力而行，心意同样珍贵。</p>
    </section>
  );
}
