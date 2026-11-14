import styles from './Farm.module.css';
function Tree({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="32" cy="78" rx="30" ry="8" fill="var(--color-pet-shadow)" />
      <path d="M26 46h12v34H26z" fill="var(--color-pet-wood)" />
      <path d="M16 0h32v8h12v16h6v28h-8v12H8V52H0V24h6V8h10z" fill="var(--color-pet-tree-dark)" />
      <path d="M18 0h26v8h12v16h4v20H48v8H12V40H6V20h8V8h4z" fill="var(--color-pet-tree)" />
      <path d="M20 5h22v8h10v12H40v-6H20v11H10V18h10z" fill="var(--color-pet-tree-light)" />
    </g>
  );
}
export function FarmScenery() {
  return (
    <svg
      className={styles.scenery}
      viewBox="0 0 960 190"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <path d="M330 155h275v35H330zM411 115h58v75h-58z" fill="var(--color-pet-path)" />
      <Tree x={48} y={70} scale={1.1} />
      <Tree x={119} y={28} scale={1.3} />
      <Tree x={220} y={65} />
      <g transform="translate(344 32)">
        <path d="M-10 116h170v10H-10z" fill="var(--color-pet-shadow)" />
        <path d="M6 44h130v75H6z" fill="var(--color-pet-path)" />
        <path d="M8 99h126v20H8zM91 0h15v33H91z" fill="var(--color-pet-wood)" />
        <path
          d="M20 0h94v8h10v8h10v8h10v8h10v16H-12V32h12V20h12V8h8z"
          fill="var(--color-farm-furrow)"
        />
        <path d="M22 8h88v6H22zM12 22h114v6H12zM0 36h144v6H0z" fill="var(--color-farm-edge)" />
        <path d="M58 65h31v54H58zM19 62h24v24H19zM104 62h20v24h-20z" fill="var(--color-pet-wood)" />
        <path d="M23 66h16v16H23zM108 66h12v16h-12z" fill="var(--color-pet-water)" />
        <path d="M66 72h16v47H66z" fill="var(--color-farm-soil)" />
        <path d="M78 94h3v3h-3z" fill="var(--color-pet-flower)" />
        <path d="M16 94h30v8H16zM100 94h28v8h-28z" fill="var(--color-pet-tree)" />
        <path
          d="M21 90h4v5h-4zM33 89h5v6h-5zM105 90h5v5h-5zM119 90h5v5h-5z"
          fill="var(--color-pet-flower)"
        />
      </g>
      <g transform="translate(547 98)">
        <path d="M30 0h5v65h-5z" fill="var(--color-pet-wood)" />
        <path
          d="M0 0h88v36H0z"
          fill="var(--color-pet-path)"
          stroke="var(--color-pet-wood)"
          strokeWidth="4"
        />
        <path d="M14 13h26v4H14zM48 13h26v4H48zM23 23h38v3H23z" fill="var(--color-pet-tree-dark)" />
      </g>
      <path
        d="M733 93h107v10h20v12h14v35h-14v14H737v-8h-20v-14h-12v-28h14v-12h14z"
        fill="var(--color-pet-water-edge)"
      />
      <path d="M737 104h97v9h20v13h10v18h-18v10H737v-9h-20v-24h20z" fill="var(--color-pet-water)" />
      <path
        d="M744 118h35v3h-35zM805 138h35v3h-35zM768 144h20v3h-20z"
        fill="var(--color-pet-water-glint)"
      />
      <Tree x={840} y={25} scale={1.1} />
      <Tree x={890} y={83} scale={0.8} />
    </svg>
  );
}
