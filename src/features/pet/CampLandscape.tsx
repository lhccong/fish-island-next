export function CampLandscape() {
  return (
    <svg
      viewBox="0 0 1000 680"
      preserveAspectRatio="none"
      width="100%"
      height="100%"
      aria-hidden="true"
    >
      <defs>
        <pattern id="camp-grass" width="57" height="43" patternUnits="userSpaceOnUse">
          <path
            d="M6 14l3-6 2 6m24 18 2-5 3 5"
            fill="none"
            stroke="var(--color-pet-grass-detail)"
            strokeWidth="2"
          />
          <path d="M46 7h3m-1-2v4" stroke="var(--color-pet-flower)" strokeWidth="2" />
        </pattern>
      </defs>
      <path d="M0 0H1000V680H0Z" fill="var(--color-pet-meadow)" />
      <path d="M0 0H1000V680H0Z" fill="url(#camp-grass)" />
      <path
        d="M-80 600C180 510 150 300 460 340S750 500 1080 250"
        fill="none"
        stroke="var(--color-pet-path-edge)"
        strokeWidth="110"
      />
      <path
        d="M-80 600C180 510 150 300 460 340S750 500 1080 250"
        fill="none"
        stroke="var(--color-pet-path)"
        strokeWidth="84"
      />
      <path
        d="M-80 600C180 510 150 300 460 340S750 500 1080 250"
        fill="none"
        stroke="var(--color-pet-path-detail)"
        strokeWidth="3"
        strokeDasharray="8 36"
      />
      <path d="M640-30C550 70 610 156 750 157S1060 90 1060-20" fill="var(--color-pet-water-edge)" />
      <path d="M660-30C580 55 634 130 760 130S1060 65 1060-20" fill="var(--color-pet-water)" />
      <path
        d="M700 65h40m60 27h54m50-45h32"
        stroke="var(--color-pet-water-glint)"
        strokeWidth="4"
        fill="none"
      />
      <ellipse
        cx="490"
        cy="383"
        rx="117"
        ry="39"
        fill="var(--color-pet-grass-detail)"
        opacity=".22"
      />
      <path
        d="M110 160v-40m0 13h100v27H110m11-16h65"
        stroke="var(--color-pet-wood)"
        strokeWidth="8"
        fill="var(--color-pet-path)"
      />
    </svg>
  );
}
export function CampProp({ kind }: { kind: 'tree' | 'rock' | 'bush' }) {
  return (
    <svg viewBox="0 0 120 150" width="100%" height="100%" aria-hidden="true">
      <ellipse cx="65" cy="132" rx="49" ry="14" fill="var(--color-pet-shadow)" />
      {kind === 'tree' ? (
        <>
          <path d="M52 79h17v55H52z" fill="var(--color-pet-wood)" />
          <path d="M60 5 12 74h18L6 110q54 30 108 0L91 74h17Z" fill="var(--color-pet-tree-dark)" />
          <path
            d="M60 5 12 74q29 12 48 0V5m0 39-40 66q22 12 40 9Z"
            fill="var(--color-pet-tree-light)"
          />
          <path d="m60 5 48 69q-24 11-48 0Z" fill="var(--color-pet-tree)" />
        </>
      ) : kind === 'rock' ? (
        <>
          <path d="m21 108 26-30 42 8 20 36-30 14-61-8Z" fill="var(--color-pet-rock-dark)" />
          <path d="m21 108 26-30 42 8-23 30Z" fill="var(--color-pet-rock)" />
        </>
      ) : (
        <>
          <path
            d="M12 127q-14-40 24-42 24-44 48-4 40 4 24 46-50 21-96 0Z"
            fill="var(--color-pet-tree)"
          />
          <path
            d="M22 110q-3-25 24-21 20-28 35-6"
            fill="none"
            stroke="var(--color-pet-tree-light)"
            strokeWidth="8"
          />
          <circle cx="38" cy="107" r="5" fill="var(--color-pet-flower)" />
          <circle cx="85" cy="113" r="4" fill="var(--color-pet-flower)" />
        </>
      )}
    </svg>
  );
}
