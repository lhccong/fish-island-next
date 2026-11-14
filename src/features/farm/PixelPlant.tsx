import styles from './Farm.module.css';
export function PixelPlant({
  mature = false,
  empty = false,
}: {
  mature?: boolean;
  empty?: boolean;
}) {
  return (
    <svg
      className={styles.plant}
      viewBox="0 0 32 32"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <path fill="var(--color-pet-shadow)" d="M6 26h20v3H6z" />
      {!empty && (
        <>
          <path fill="var(--color-pet-tree-dark)" d="M15 12h3v15h-3zM8 14h7v3H8zM18 9h7v4h-7z" />
          <path
            fill="var(--color-pet-tree-light)"
            d="M5 8h7v3h3v6h-5v-3H5zM20 5h7v7h-7v3h-3V8h3z"
          />
          {mature && (
            <>
              <path fill="var(--color-pet-header-amber)" d="M11 15h10v3h3v9h-3v3H11v-3H8v-9h3z" />
              <path fill="var(--color-pet-flower)" d="M12 18h4v3h-4zM19 22h3v4h-3z" />
            </>
          )}
        </>
      )}
      {empty && (
        <path fill="var(--color-pet-path-detail)" d="M8 19h4v2H8zM20 14h3v2h-3zM16 24h4v2h-4z" />
      )}
    </svg>
  );
}
