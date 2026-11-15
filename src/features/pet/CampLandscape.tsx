import { useId } from 'react';

export function CampLandscape() {
  const grassId = useId();
  return (
    <svg
      viewBox="0 0 1000 680"
      preserveAspectRatio="none"
      width="100%"
      height="100%"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <defs>
        <pattern id={grassId} width="64" height="52" patternUnits="userSpaceOnUse">
          <path
            d="M8 16h4v-4h4v4h4v4H8Zm30 24h4v-8h4v8h4v4H38Z"
            fill="var(--color-pet-grass-detail)"
          />
          <path d="M50 8h4v4h-4Zm-26 30h4v4h-4Z" fill="var(--color-pet-flower)" />
        </pattern>
      </defs>
      <path d="M0 0H1000V680H0Z" fill="var(--color-pet-meadow)" />
      <path d="M0 0H1000V680H0Z" fill={`url(#${grassId})`} />
      <path
        d="M0 498h82v-32h84v-40h92v-40h110v-28h206v26h144v-28h120v-40h162v100H856v34H724v30H560v-24H390v26H280v36H180v38H84v34H0Z"
        fill="var(--color-pet-path-edge)"
      />
      <path
        d="M0 518h90v-34h86v-38h94v-40h108v-28h186v26h164v-28h120v-40h152v60H844v34H712v30H570v-24H380v26H270v36H170v38H74v34H0Z"
        fill="var(--color-pet-path)"
      />
      <path
        d="M16 548h16v4H16Zm102-42h12v4h-12Zm90-36h12v4h-12Zm120-42h14v4h-14Zm126-24h14v4h-14Zm164 24h12v4h-12Zm150-6h16v4h-16Zm160-40h16v4h-16Z"
        fill="var(--color-pet-path-detail)"
      />
      <path
        d="M620 0h380v188H860v24H706v-20h-66v-28h-40v-48h-20V48h40Z"
        fill="var(--color-pet-water-edge)"
      />
      <path
        d="M640 0h360v168H850v24H716v-20h-62v-28h-34V96h-20V60h40Z"
        fill="var(--color-pet-water)"
      />
      <path
        d="M670 56h48v4h-48Zm126 70h64v4h-64Zm112-82h40v4h-40ZM728 150h24v4h-24Z"
        fill="var(--color-pet-water-glint)"
      />
      <path d="M804 108h76v168h-76Z" fill="var(--color-pet-wood)" />
      <path
        d="M810 116h64v12h-64Zm0 22h64v12h-64Zm0 22h64v12h-64Zm0 22h64v12h-64Zm0 22h64v12h-64Zm0 22h64v12h-64Zm0 22h64v12h-64Z"
        fill="var(--color-pet-path)"
      />
      <path
        d="M800 100h8v190h-8Zm76 0h8v190h-8ZM80 568h10v80H80Zm70-20h10v90h-10Zm70-20h10v88h-10ZM80 590h80v10H80Zm80-20h70v10h-70Z"
        fill="var(--color-pet-wood)"
      />
      <path
        d="M130 188h146v12H130Zm0 24h146v12H130Zm12 12h12v30h-12Zm108 0h12v30h-12Z"
        fill="var(--color-pet-wood)"
      />
    </svg>
  );
}
export function CampProp({ kind }: { kind: 'tree' | 'rock' | 'bush' }) {
  return (
    <svg
      viewBox="0 0 120 150"
      width="100%"
      height="100%"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <path d="M24 130h72v8H24Zm-8-8h88v8H16Z" fill="var(--color-pet-shadow)" />
      {kind === 'tree' ? (
        <>
          <path d="M52 84h16v52H52Z" fill="var(--color-pet-wood)" />
          <path
            d="M52 6h16v14h10v14h10v14h10v16h-8v12h12v16h10v24H8V92h12V76h12V64H20V48h12V34h10V20h10Z"
            fill="var(--color-pet-tree-dark)"
          />
          <path
            d="M52 6h8v50H32V44h10V28h10ZM32 70h28v34H20V92h12Z"
            fill="var(--color-pet-tree-light)"
          />
          <path
            d="M60 20h10v16h10v16h10v12H60Zm0 50h22v16h12v18H60Z"
            fill="var(--color-pet-tree)"
          />
          <path d="M44 106h16v8H44Zm24-54h12v6H68Z" fill="var(--color-pet-grass-detail)" />
        </>
      ) : kind === 'rock' ? (
        <>
          <path d="M30 88h54v10h14v16h8v18H18v-26h12Z" fill="var(--color-pet-rock-dark)" />
          <path d="M34 88h42v12h8v14H26v-12h8Z" fill="var(--color-pet-rock)" />
          <path d="M40 92h28v6H40Z" fill="var(--color-pet-water-edge)" />
        </>
      ) : (
        <>
          <path d="M38 78h38v10h22v12h12v28H10v-28h12V88h16Z" fill="var(--color-pet-tree-dark)" />
          <path d="M40 84h32v12h22v24H20v-18h20Z" fill="var(--color-pet-tree)" />
          <path d="M44 84h24v8H44Zm-18 16h10v12H26Z" fill="var(--color-pet-tree-light)" />
          <path d="M34 110h8v8h-8Zm42-8h8v8h-8Z" fill="var(--color-pet-flower)" />
        </>
      )}
    </svg>
  );
}
