import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ProgressRing } from '@/components/ProgressRing';
import { heroGradient, radius, shadow, spacing } from '@/components/theme';
import { formatFriendlyDate, type LocalDateString } from '@/core/localDate';

interface DashboardHeaderProps {
  today: LocalDateString;
  hour: number;
  percent: number;
  doneCount: number;
  totalCount: number;
  freezes: number;
}

function greetingFor(hour: number): string {
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardHeader({ today, hour, percent, doneCount, totalCount, freezes }: DashboardHeaderProps) {
  const message =
    totalCount === 0
      ? 'A quiet day.'
      : percent >= 100
        ? 'All done. Beautiful work ✨'
        : `${doneCount} of ${totalCount} habits done`;

  return (
    <LinearGradient colors={heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text style={styles.greeting}>{greetingFor(hour)}</Text>
        <Text style={styles.date} accessibilityRole="header">
          {formatFriendlyDate(today)}
        </Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.freeze} accessibilityLabel={`${freezes} streak freezes available`}>
          <Ionicons name="snow" size={13} color="#FFFFFF" />
          <Text style={styles.freezeText}>
            {freezes} freeze{freezes === 1 ? '' : 's'}
          </Text>
        </View>
      </View>
      <ProgressRing value={percent / 100} size={92} stroke={9} track="rgba(255,255,255,0.22)" from="#FFFFFF" to="#C7D2FE">
        <Text style={styles.percent} accessibilityLabel={`${percent} percent of today done`}>
          {percent}%
        </Text>
      </ProgressRing>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
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
});
