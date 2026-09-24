import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui';
import type { TranslationKey } from '@/i18n';
import { makeStyles, spacing, useTheme } from '@/components/theme';
import { useT } from '@/i18n';

const STORED: TranslationKey[] = [
  'data.s1',
  'data.s2',
  'data.s3',
  'data.s4',
];

const NEVER: TranslationKey[] = [
  'data.n1',
  'data.n2',
  'data.n3',
  'data.n4',
];

function Row({ icon, color, text }: { icon: 'checkmark-circle' | 'close-circle'; color: string; text: string }) {
  const { typography } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[typography.body, styles.rowText]}>{text}</Text>
    </View>
  );
}

/** Plain-language summary of what Momentum keeps, and what it never collects. */
export function DataTransparency() {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
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
          <Text style={typography.label}>{t('data.title')}</Text>
          <Text style={typography.caption}>{t('data.subtitle')}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
      </Pressable>
      {open ? (
        <View style={styles.body}>
          <Text style={typography.overline}>{t('data.stored')}</Text>
          {STORED.map((key) => (
            <Row key={key} icon="checkmark-circle" color={colors.success} text={t(key)} />
          ))}
          <Text style={[typography.overline, styles.gap]}>{t('data.never')}</Text>
          {NEVER.map((key) => (
            <Row key={key} icon="close-circle" color={colors.danger} text={t(key)} />
          ))}
          <Text style={[typography.caption, styles.gap]}>
            {t('data.uninstall')}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const useStyles = makeStyles(() => ({
  card: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  body: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  rowText: { flex: 1, fontSize: 15 },
  gap: { marginTop: spacing.sm },
}));
