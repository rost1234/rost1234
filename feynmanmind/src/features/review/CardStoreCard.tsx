import { View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/Text';
import { Card, Chevron } from '@/components/ui';
import { useT } from '@/i18n';
import { useDBStore } from '@/local/store';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

/** On the Review tab: how many cards there are, with a way into the card store. */
export function CardStoreCard() {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const total = useDBStore((s) => Object.keys(s.db.cards).length);
  return (
    <Card onPress={() => router.push('/cards')} accessibilityLabel={t('cards.title')}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Ionicons name="albums-outline" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={typography.subheading}>{t('cards.title')}</Text>
          <Text style={typography.caption}>{t('cards.cardBody', { n: total })}</Text>
        </View>
        <Chevron />
      </View>
    </Card>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
}));
