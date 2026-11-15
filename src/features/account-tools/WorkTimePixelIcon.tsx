export type WorkTimePhase = 'rest' | 'start' | 'lunch' | 'end' | 'done';

const shapes: Record<WorkTimePhase, string> = {
  rest: 'M3 1h2v3H3zm4 0h2v3H7zM2 6h10v2h3v5h-3v2H4v-2H2zm2 2v4h6V8zm8 2v2h1v-2zM1 15h13v1H1z',
  start: 'M5 2h6v3h3v2h1v7H1V7h1V5h3zm2 2v1h2V4zM3 7v2h4V8h2v1h4V7zm0 4v1h10v-1H9v1H7v-1z',
  lunch:
    'M4 1h1v3H4zm3 1h1v3H7zm3-1h1v3h-1zM1 7h14v3h-1v2h-2v2H4v-2H2v-2H1zm3 2v2h2v1h4v-1h2V9zM5 15h6v1H5z',
  end: 'M5 1h6v1h2v2h2v8h-2v2h-2v1H5v-1H3v-2H1V4h2V2h2zm0 3H3v8h2v1h6v-1h2V4h-2V3H5zm2 1h2v4h3v2H7z',
  done: 'M7 1h2v2h2v2h2v2h2v2h-2v6H3V9H1V7h2V5h2V3h2zm0 4v2H5v2H4v4h3v-3h2v3h3V9h-1V7H9V5z',
};

export function WorkTimePixelIcon({ phase }: { phase: WorkTimePhase }) {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" data-work-icon={phase}>
      <path d={shapes[phase]} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}
