import { create } from 'zustand';
import { toErrorMessage } from '@/core/errors';
import { addDays, lastNDays, parseLocalDate, type LocalDateString } from '@/core/localDate';
import { repositories } from '@/data/repositories';
import { averageOf, buildHeatmap, buildTrend, type HeatRow, type TrendPoint } from '@/domain/analytics';
import { summarizeUsage, type UsageSummary } from '@/domain/usage';

export type AnalyticsRange = 'week' | 'month';

export const RANGE_DAYS: Readonly<Record<AnalyticsRange, number>> = { week: 7, month: 30 };

export interface AnalyticsData {
  dates: LocalDateString[];
  heatmap: HeatRow[];
  trend: TrendPoint[];
  averageCompletion: number | null;
  averageMood: number | null;
  focusMinutes: number;
  freezesAvailable: number;
  usage: UsageSummary;
}

interface AnalyticsState {
  range: AnalyticsRange;
  data: AnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  setRange: (range: AnalyticsRange) => void;
  load: (today: LocalDateString) => Promise<void>;
}

async function fetchAnalytics(today: LocalDateString, range: AnalyticsRange): Promise<AnalyticsData> {
  const dates = lastNDays(today, RANGE_DAYS[range]);
  const start = dates[0] ?? today;
  const startIso = new Date(parseLocalDate(start).setHours(0, 0, 0, 0)).toISOString();
  const endIso = new Date(parseLocalDate(addDays(today, 1)).setHours(0, 0, 0, 0)).toISOString();

  const [habits, logs, reflections, sessions, settings, usage] = await Promise.all([
    repositories.habits.getAll(),
    repositories.habitLogs.getInRange(start, today),
    repositories.reflections.getInRange(start, today),
    repositories.focusSessions.getInRange(startIso, endIso),
    repositories.settings.get(),
    repositories.usage.getInRange(start, today),
  ]);

  const trend = buildTrend(habits, logs, reflections, dates);
  return {
    dates,
    heatmap: buildHeatmap(habits, logs, dates, today),
    trend,
    averageCompletion: averageOf(trend.map((p) => p.completionPercent)),
    averageMood: averageOf(trend.map((p) => p.mood)),
    focusMinutes: sessions.reduce((sum, s) => sum + s.durationMinutes, 0),
    freezesAvailable: settings.streakFreezesAvailable,
    usage: summarizeUsage(usage, today),
  };
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  range: 'week',
  data: null,
  isLoading: false,
  error: null,

  setRange: (range) => set({ range }),

  load: async (today) => {
    const range = get().range;
    set({ isLoading: true, error: null });
    try {
      const data = await fetchAnalytics(today, range);
      if (get().range === range) set({ data, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: toErrorMessage(error) });
    }
  },
}));
