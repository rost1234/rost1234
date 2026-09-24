import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui';
import { colors, spacing, typography } from '@/components/theme';

const STORED = [
  'Habits, daily check-offs and streak freezes',
  'Tasks, focus sessions and evening reflections',
  'Time spent in the app per day (a number, nothing else)',
  'Your settings: reminder time, focus sound, tips seen',
];

const NEVER = [
  'No account, e-mail or phone number',
  'No analytics, ads or tracking of any kind',
  'No location, contacts, photos or microphone',
  'Nothing is uploaded — there is no server',
];

function Row({ icon, color, text }: { icon: 'checkmark-circle' | 'close-circle'; color: string; text: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[typography.body, styles.rowText]}>{text}</Text>
    </View>
  );
}

/** Plain-language summary of what Momentum keeps, and what it never collects. */
export function DataTransparency() {
  const [open, setOpen] = useState(false);
  return (
    <Card style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={styles.header}
      >
        <Ionicons name="shield-checkmark-outline" size={22} color={colors.success} />
        <View style={{ flex: 1 }}>
          <Text style={typography.label}>Your data stays on this phone</Text>
          <Text style={typography.caption}>See exactly what is stored — and what never is</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
      </Pressable>
      {open ? (
        <View style={styles.body}>
          <Text style={typography.overline}>Stored on this device</Text>
          {STORED.map((t) => (
            <Row key={t} icon="checkmark-circle" color={colors.success} text={t} />
          ))}
          <Text style={[typography.overline, styles.gap]}>Never collected</Text>
          {NEVER.map((t) => (
            <Row key={t} icon="close-circle" color={colors.danger} text={t} />
          ))}
          <Text style={[typography.caption, styles.gap]}>
            Uninstalling the app deletes everything. Export a backup first if you want to keep your history.
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  body: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  rowText: { flex: 1, fontSize: 15 },
  gap: { marginTop: spacing.sm },
});
