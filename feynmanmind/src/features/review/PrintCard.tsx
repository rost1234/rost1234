import { Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Card } from '@/components/ui';
import { useT } from '@/i18n';
import { openPrintKit } from '@/local/logic';
import { useDBStore } from '@/local/store';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

/** "Learn without a phone": make a printed month kit, and enter its results once the month has started. */
export function PrintCard() {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const kit = useDBStore((s) => openPrintKit(s.db));
  const now = new Date();
  const started = kit && now >= new Date(kit.year, kit.month, 1);
  return (
    <Card style={{ borderColor: colors.primary, borderWidth: 2, gap: spacing.sm }}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Ionicons name="print-outline" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={typography.subheading}>{t('print.cardTitle')}</Text>
          <Text style={typography.caption}>{t('print.cardBody')}</Text>
        </View>
      </View>
      <Button label={t('print.create')} icon="calendar-outline" onPress={() => router.push('/print')} />
      {started ? (
        <Button
          label={t('print.enterResults', { month: new Date(kit.year, kit.month, 1).toLocaleDateString(t.locale, { month: 'long' }) })}
          icon="create-outline"
          variant="secondary"
          onPress={() => router.push('/print/results')}
        />
      ) : null}
    </Card>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
}));
