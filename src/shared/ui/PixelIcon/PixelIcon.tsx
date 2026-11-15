import styles from './PixelIcon.module.css';

export type PixelIconName =
  'flame' | 'message' | 'palm' | 'garden' | 'cat' | 'gamepad' | 'book' | 'link';

export function PixelIcon({ name, size = 28 }: { name: PixelIconName; size?: 28 | 32 }) {
  return (
    <svg
      className={styles.icon}
      width={size}
      height={size}
      viewBox="0 0 28 28"
      shapeRendering="crispEdges"
      data-pixel-icon={name}
      aria-hidden="true"
    >
      {name === 'garden' ? (
        <>
          <path className={styles.ink} d="M1 17h4v-4h18v4h4v8h-4v2H5v-2H1z" />
          <path className={styles.wood} d="M3 18h22v5h-4v2H7v-2H3z" />
          <path className={styles.gold} d="M5 16h18v4H5zm2 6h4v2H7zm10 0h4v2h-4z" />
          <path
            className={styles.ink}
            d="M5 3h4v4h2v6H9v6H5v-6H3V7h2zm14 2h4v4h2v6h-2v4h-4v-4h-2V9h2zM12 1h4v6h2v6h-2v6h-4v-6h-2V7h2z"
          />
          <path
            className={styles.detail}
            d="M5 7h4v4H5zm8-4h2v8h-2zm6 6h4v4h-4zM7 13h2v4H7zm12 2h2v2h-2z"
          />
        </>
      ) : name === 'cat' ? (
        <>
          <path
            className={styles.ink}
            d="M5 1h4v2h2v2h6V3h2V1h4v10h2v10h-2v4h-4v2H9v-2H5v-4H3V11h2z"
          />
          <path className={styles.gold} d="M7 3h2v4h10V3h2v10h2v8h-2v2H7v-2H5v-8h2z" />
          <path className={styles.paper} d="M9 11h10v2h2v8h-2v2H9v-2H7v-8h2z" />
          <path className={styles.ink} d="M9 13h2v4H9zm8 0h2v4h-2zm-5 6h4v2h-4z" />
          <path className={styles.wood} d="M12 7h4v4h-4zM9 23h10v2H9z" />
        </>
      ) : name === 'gamepad' ? (
        <>
          <path
            className={styles.ink}
            d="M7 3h14v2h4v4h2v14h-2v2h-6v-2h-2v-4h-6v4H9v2H3v-2H1V9h2V5h4z"
          />
          <path
            className={styles.paper}
            d="M7 5h14v2h2v4h2v10h-2v2h-2v-2h-2v-4H9v4H7v2H3V11h2V7h2z"
          />
          <path
            className={styles.detail}
            d="M7 7h14v2H7zm-2 4h6v6H5zm14-2h2v4h-2zm2 4h2v2h-2zm-4 0h2v2h-2z"
          />
          <path className={styles.ink} d="M7 9h2v4h4v2H9v4H7v-4H3v-2h4z" />
          <path className={styles.gold} d="M19 9h2v2h-2zm2 4h2v2h-2z" />
        </>
      ) : name === 'book' ? (
        <>
          <path className={styles.ink} d="M1 3h10v2h6V3h10v22H17v2h-6v-2H1z" />
          <path className={styles.detail} d="M3 5h8v2h2v16h-2v-2H3zm14 2V5h8v16h-8v2h-2V7z" />
          <path className={styles.paper} d="M5 7h6v2h2v12h-2v-2H5zm12 2V7h6v12h-6v2h-2V9z" />
          <path className={styles.wood} d="M7 11h4v2H7zm0 4h4v2H7zm10-4h4v2h-4zm0 4h4v2h-4z" />
        </>
      ) : name === 'link' ? (
        <>
          <path
            className={styles.ink}
            d="M3 3h10v2h2v6h-2V7H5v8h4v4H3v-2H1V5h2zm12 6h10v2h2v14h-2v2H15v-2h-2v-6h2v4h8V13h-8z"
          />
          <path className={styles.detail} d="M11 9h4v2h2v2h2v4h-4v-2h-2v-2h-2z" />
          <path className={styles.gold} d="M5 5h6v2H5zm12 18h6v2h-6z" />
        </>
      ) : name === 'message' ? (
        <>
          <path className={styles.ink} d="M5 3h18v2h2v16h-2v2H13v2h-2v2H7v-4H5v-2H3V5h2z" />
          <path className={styles.paper} d="M7 5h14v2h2v12h-2v2H11v2H9v-2H7v-2H5V7h2z" />
          <path className={styles.ink} d="M8 11h2v4H8zm5 0h2v4h-2zm5 0h2v4h-2z" />
        </>
      ) : name === 'flame' ? (
        <>
          <path
            className={styles.ink}
            d="M12 1h4v4h2v4h2V7h2v4h2v10h-2v4h-4v2H8v-2H4v-4H2v-8h2V9h4v4h2V5h2z"
          />
          <path
            className={styles.detail}
            d="M14 5h2v6h4v2h2v6h-2v4h-4v2h-6v-2H6v-4H4v-4h2v-2h2v4h4V9h2z"
          />
          <path className={styles.paper} d="M12 15h4v4h2v4h-2v2h-6v-2H8v-4h4z" />
        </>
      ) : (
        <>
          <path className={styles.wood} d="M14 9h4v8h-2v8h-4v-8h2z" />
          <path
            className={styles.ink}
            d="M12 1h6v2h4v2h4v6h-4V9h-4v4h-4V9h-4v2H6v2H2V7h4V5h6zM4 25h20v2H4z"
          />
          <path className={styles.detail} d="M12 3h6v2h4v2h2v2h-4V7h-6v2h-4V7H6v2H4V7h4V5h4z" />
          <path className={styles.paper} d="M6 23h16v2H6z" />
        </>
      )}
    </svg>
  );
}
