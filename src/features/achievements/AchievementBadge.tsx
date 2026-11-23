const artwork: Readonly<Record<string, string>> = {
  wheat:
    'M16 24V8m0 8c-5 0-7-3-7-6 4 0 7 2 7 6Zm0 4c-5 0-7-2-7-5m7 1c5 0 7-3 7-6-4 0-7 2-7 6Zm0 4c5 0 7-2 7-5M16 11c-3-2-3-5 0-7 3 2 3 5 0 7Z',
  cards:
    'M15 8h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2ZM10 21l-4-1a2 2 0 0 1-1-2l2-11a2 2 0 0 1 2-2l8 1m2 6 2 4-2 4-2-4 2-4Z',
  forge: 'M6 12h20l-3 4-5 2v4l3 2H11l3-2v-4l-5-2-3-4Zm12-9v6m-3-3h6m3 1 2-2',
  companion: 'M4 24l7-9 4 5 5-7 8 11H4Zm7-14C8 6 4 10 8 13l3 2 3-2c4-3 0-7-3-3Zm12-4v5m-2.5-2.5h5',
};

export function AchievementBadge({ icon }: { icon: string }) {
  const path = Object.hasOwn(artwork, icon)
    ? artwork[icon]
    : 'm16 5 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1 3-7Z';
  return (
    <svg
      aria-hidden="true"
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}
