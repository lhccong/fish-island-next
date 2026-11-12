import { Crown, Gift, Users, Flame, Star } from 'lucide-react';
import { NavLink } from 'react-router';
import styles from './AboutNavigation.module.css';

const sections = [
  { to: '/rank/reward', label: '赞助榜', icon: Crown },
  { to: '/rank/welfare', label: '外卖福利', icon: Gift },
  { to: '/rank/about', label: '共建与反馈', icon: Users },
  { to: '/rank/other', label: '其他产品', icon: Flame },
];
export function AboutNavigation() {
  return (
    <nav className={styles.navigation} aria-label="关于模块">
      {sections.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to}>
          <Icon size={21} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
      <a
        href="https://github.com/lhccong/fish-island-backend"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Star size={21} aria-hidden="true" />
        <span>狠狠点个 star</span>
      </a>
    </nav>
  );
}
