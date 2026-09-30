import type { LocalDateString } from '@/core/localDate';
import { dayOffKind, defaultWeekendDays, type DayOff } from '@/domain/dayOff';
import type { HolidayKey } from '@/domain/holidays';
import { useT, type TranslationKey } from '@/i18n';
import { usePlanningStore } from '@/state/planningStore';
import { usePrefsStore } from '@/state/prefsStore';

const HOLIDAY_ICON: Record<HolidayKey, string> = {
  roshHashana: '🍎',
  yomKippur: '🕊',
  sukkot: '🌿',
  simchatTorah: '📜',
  pesach: '🍷',
  pesach7: '🌊',
  shavuot: '🌾',
  independence: '🇮🇱',
};

/** Today's day off (weekend, Israeli holiday or vacation pause), if any, with its label. */
export function useDayOff(today: LocalDateString): { dayOff: DayOff; label: string } | null {
  const t = useT();
  const enabled = usePrefsStore((s) => s.dayOffMode);
  const weekendDays = usePrefsStore((s) => s.weekendDays);
  const holidays = usePrefsStore((s) => s.holidays);
  const pauses = usePlanningStore((s) => s.pauses);
  const dayOff = dayOffKind(today, { enabled, holidays, weekendDays: weekendDays ?? defaultWeekendDays(t.language) }, pauses);
  if (!dayOff) return null;
  const label =
    dayOff.kind === 'holiday'
      ? `${HOLIDAY_ICON[dayOff.holiday]} ${t(`holiday.${dayOff.holiday}` as TranslationKey)}`
      : dayOff.kind === 'vacation'
        ? t('dayoff.vacation')
        : t('dayoff.weekend');
  return { dayOff, label };
}
