import styles from './SiteFooter.module.css';

export function SiteFooter({
  showOnMobile = false,
  placement = 'content',
}: {
  showOnMobile?: boolean;
  placement?: 'content' | 'mobile-overlay';
}) {
  return (
    <footer
      className={styles.footer}
      aria-label="网站备案与版权"
      data-mobile-visible={showOnMobile}
      data-placement={placement}
    >
      <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">
        粤ICP备2024313392号
      </a>
      <span className={styles.separator} aria-hidden="true">
        |
      </span>
      <span>MIT 协议, 版权所有 © 2025 聪，All rights reserved.</span>
    </footer>
  );
}
