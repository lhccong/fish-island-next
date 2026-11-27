const artwork: Readonly<Record<string, string>> = {
  user: 'M16 4l10 4v7c0 6-4 10-10 13C10 25 6 21 6 15V8l10-4Zm-5 13 5-5 5 5m-5-5v10',
  wheat:
    'M16 24V8m0 8c-5 0-7-3-7-6 4 0 7 2 7 6Zm0 4c-5 0-7-2-7-5m7 1c5 0 7-3 7-6-4 0-7 2-7 6Zm0 4c5 0 7-2 7-5M16 11c-3-2-3-5 0-7 3 2 3 5 0 7Z',
  cards:
    'M15 8h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2ZM10 21l-4-1a2 2 0 0 1-1-2l2-11a2 2 0 0 1 2-2l8 1m2 6 2 4-2 4-2-4 2-4Z',
  forge: 'M6 12h20l-3 4-5 2v4l3 2H11l3-2v-4l-5-2-3-4Zm12-9v6m-3-3h6m3 1 2-2',
  companion: 'M4 24l7-9 4 5 5-7 8 11H4Zm7-14C8 6 4 10 8 13l3 2 3-2c4-3 0-7-3-3Zm12-4v5m-2.5-2.5h5',
  turntable: 'M16 5a11 11 0 1 0 0 22 11 11 0 0 0 0-22Zm0 0v11l9.5 5.5M16 16l-9.5 5.5',
  invitation:
    'M14 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM5 25v-2a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v2M25 9v8m-4-4h8',
  sponsor: 'M16 25 7 16a6 6 0 0 1 9-8 6 6 0 0 1 9 8l-9 9Z',
  'major-sponsor': 'M6 11l5 4 5-8 5 8 5-4-3 12H9L6 11Zm4 15h12',
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
