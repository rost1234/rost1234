import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ProgressRing } from '@/components/ProgressRing';
import { heroGradient, makeStyles, radius, spacing } from '@/components/theme';
import { formatFriendlyDate, type LocalDateString } from '@/core/localDate';
import type { TranslationKey } from '@/i18n';
import { useT } from '@/i18n';

interface DashboardHeaderProps {
  today: LocalDateString;
  hour: number;
  percent: number;
  doneCount: number;
  totalCount: number;
  freezes: number;
}

function greetingKey(hour: number): TranslationKey {
  if (hour < 5) return 'today.greeting.night';
  if (hour < 12) return 'today.greeting.morning';
  if (hour < 18) return 'today.greeting.afternoon';
  return 'today.greeting.evening';
}

export function DashboardHeader({ today, hour, percent, doneCount, totalCount, freezes }: DashboardHeaderProps) {
  const t = useT();
  const styles = useStyles();
  const message =
    totalCount === 0
      ? t('today.quietDay')
      : percent >= 100
        ? t('today.allDone')
        : t('today.doneOf', { done: doneCount, total: totalCount });

  return (
    <LinearGradient colors={heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text style={styles.greeting}>{t(greetingKey(hour))}</Text>
        <Text style={styles.date} accessibilityRole="header">
          {formatFriendlyDate(today, t.locale)}
        </Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.freeze} accessibilityLabel={t('today.freezesA11y', { count: freezes })}>
          <Ionicons name="snow" size={13} color="#FFFFFF" />
          <Text style={styles.freezeText}>
            {t.plural('today.freezes', freezes)}
          </Text>
        </View>
      </View>
      <ProgressRing value={percent / 100} size={92} stroke={9} track="rgba(255,255,255,0.22)" from="#FFFFFF" to="#C7D2FE">
        <Text style={styles.percent} maxFontSizeMultiplier={1.2} accessibilityLabel={t('today.percentA11y', { percent })}>
          {percent}%
        </Text>
      </ProgressRing>
    </LinearGradient>
  );
}

const useStyles = makeStyles(({ shadow }) => ({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
    borderRadius: radius.xl,
    ...shadow,
    shadowOpacity: 0.18,
  },
  greeting: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  date: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', letterSpacing: -0.3 },
  message: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  freeze: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  freezeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  percent: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
}));
