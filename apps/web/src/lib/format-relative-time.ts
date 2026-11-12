const RELATIVE_TIME_UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
  { unit: 'year', seconds: 60 * 60 * 24 * 365 },
  { unit: 'month', seconds: 60 * 60 * 24 * 30 },
  { unit: 'week', seconds: 60 * 60 * 24 * 7 },
  { unit: 'day', seconds: 60 * 60 * 24 },
  { unit: 'hour', seconds: 60 * 60 },
  { unit: 'minute', seconds: 60 },
];

const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** "just now", "5 minutes ago", "yesterday"… */
export function formatRelativeTime(isoTimestamp: string, now: Date = new Date()): string {
  const elapsedSeconds = (new Date(isoTimestamp).getTime() - now.getTime()) / 1000;
  for (const { unit, seconds } of RELATIVE_TIME_UNITS) {
    if (Math.abs(elapsedSeconds) >= seconds) {
      return relativeTimeFormatter.format(Math.round(elapsedSeconds / seconds), unit);
    }
  }
  return 'just now';
}
