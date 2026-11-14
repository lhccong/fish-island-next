import styles from './WorksheetHeader.module.css';

export function WorksheetHeader() {
  return (
    <div className={styles.header} aria-label="消息工作表列">
      <div className={styles.letters} aria-hidden="true">
        <span className={styles.corner} />
        <span>A</span>
        <span>B</span>
        <span className={styles.active}>C</span>
      </div>
      <div className={styles.columns}>
        <span aria-hidden="true">#</span>
        <span className={styles.sender}>发送者</span>
        <span className={styles.time}>时间</span>
        <span className={styles.content}>消息内容</span>
      </div>
    </div>
  );
}
