import styles from './PixelBattle.module.css';

export function PixelLandscape({ tower = false }: { tower?: boolean }) {
  return (
    <svg
      className={styles.landscape}
      viewBox="0 0 800 360"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <path
        fill="var(--color-pet-battle-haze)"
        d="M0 124h60v-20h60V88h60v22h40v36h70v-28h60V78h64v30h40v18h70V96h70v32h60v-20h66v20h60v232H0Z"
      />
      <path
        fill="var(--color-pet-tree-light)"
        d="M0 190h50v-30h55v-16h70v30h65v30h80v-22h60v-28h70v32h50v18h90v-36h70v-18h65v34h75v176H0Z"
      />
      <path
        fill="var(--color-pet-meadow)"
        d="M0 228h90v-10h160v12h160v-18h160v16h130v-12h100v144H0Z"
      />
      <g fill="var(--color-pet-tree-dark)">
        <path d="M4 154h12v-18h12v-20h12v20h12v18h12v20h12v20H0v-20h4Zm720 2h12v-18h12v-20h12v20h12v18h12v20h16v24h-88v-24h12Z" />
        <path d="M72 188h12v-18h12v-18h12v18h12v18h12v20H72Zm604 0h10v-16h10v-16h10v16h10v16h10v20h-60Z" />
      </g>
      <path
        fill="var(--color-pet-tree)"
        d="M16 154h12v-18h12v18h12v16H16Zm720 2h12v-18h12v18h12v16h-36Z"
      />
      <path
        fill="var(--color-pet-wood)"
        d="M28 194h12v26H28Zm720 6h12v20h-12ZM92 208h8v12h-8Zm600 0h8v12h-8Z"
      />
      <path
        fill="var(--color-pet-grass-detail)"
        d="M28 278h8v-8h4v8h8v4H28Zm90-26h8v-8h4v8h8v4h-20Zm480 62h8v-8h4v8h8v4h-20Zm122-50h8v-8h4v8h8v4h-20ZM356 328h8v-8h4v8h8v4h-20Z"
      />
      <path
        fill="var(--color-pet-water-glint)"
        opacity=".6"
        d="M56 54h32V44h48v10h24v10H56Zm510 16h28V58h64v12h32v10H566Z"
      />
      {tower && (
        <g fill="var(--color-pet-rock-dark)">
          <path d="M344 170V56h-8V28h20v12h18V28h20v12h18V28h20v28h-8v114Z" />
          <path fill="var(--color-pet-rock)" d="M356 60h56v110h-56Z" />
          <path
            fill="var(--color-pet-tree-dark)"
            d="M378 76h12v18h-12Zm0 38h12v18h-12Zm-8 56v-22h28v22Z"
          />
        </g>
      )}
    </svg>
  );
}
