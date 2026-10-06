import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Screen } from '@/components/ui';
import { TabHeader } from '@/components/TabHeader';
import { LibrarySection } from '@/features/home/LibrarySection';
import { LearnCourses } from '@/features/learn/LearnCourses';
import { SearchResults } from '@/features/learn/SearchResults';
import { QuickAdd } from '@/features/today/QuickAdd';
import { useT } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

/** Learn: search, the courses you're taking, the catalog by field, and your own library. */
export default function LearnTab() {
  const t = useT();
  const styles = useStyles();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const searching = query.length > 0;

  return (
    <View style={{ flex: 1 }}>
      <Screen edges={['top']}>
        <TabHeader title={t('tabs.learn')} />
        <View style={styles.search}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('learn.searchPlaceholder')}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={t('learn.search')}
            returnKeyType="search"
            style={[styles.input, { textAlign: t.isRTL ? 'right' : 'left' }]}
          />
          {searching ? (
            <Pressable accessibilityRole="button" accessibilityLabel={t('learn.clearSearch')} hitSlop={10} onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        {searching ? (
          <SearchResults query={query} />
        ) : (
          <>
            <LearnCourses />
            <LibrarySection />
          </>
        )}
      </Screen>
      <QuickAdd />
    </View>
  );
}

const useStyles = makeStyles(({ colors, textScale }) => ({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 50,
  },
  input: { flex: 1, color: colors.text, fontSize: Math.round(16 * textScale), paddingVertical: spacing.sm },
}));
