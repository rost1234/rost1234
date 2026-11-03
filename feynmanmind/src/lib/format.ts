import type { Translator } from '@/i18n';

export function formatInterval(days: number, t: Translator): string {
  return t.plural('interval.days', days);
}

export function formatDate(iso: string, t: Translator): string {
  return new Date(iso).toLocaleDateString(t.locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string, t: Translator): string {
  return new Date(iso).toLocaleString(t.locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Short weekday for chart labels ("Mon", "ב׳"). `date` is YYYY-MM-DD. */
export function formatWeekday(date: string, t: Translator): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString(t.locale, { weekday: 'narrow' });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatHour(hour: number, t: Translator): string {
  return new Date(2000, 0, 1, hour, 0).toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' });
}

export function greetingKey(now: Date = new Date()): 'today.morning' | 'today.afternoon' | 'today.evening' {
  const h = now.getHours();
  if (h < 12) return 'today.morning';
  if (h < 18) return 'today.afternoon';
  return 'today.evening';
}

/** The device's IANA time zone, for server-side day boundaries. */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
