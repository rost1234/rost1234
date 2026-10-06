import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Card, Chevron } from '@/components/ui';
import type { SearchHit } from '@/content/search';
import { useSearch } from '@/data/courses';
import { useT } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

const ICON = { course: 'map-outline', station: 'flag-outline', concept: 'bulb-outline' } as const;

/** Matches for the Learn tab's search box: courses, stations on every map, and your own concepts. */
export function SearchResults({ query }: { query: string }) {
  const t = useT();
  const { typography } = useTheme();
  const hits = useSearch(query);
  if (query.trim().length < 2) return <Text style={typography.caption}>{t('learn.searchHint')}</Text>;
  if (!hits.length) return <Text style={typography.body}>{t('learn.noResults', { query: query.trim() })}</Text>;
  return (
    <>
      <Text style={typography.caption}>{t.plural('learn.results', hits.length)}</Text>
      {hits.map((hit) => (
        <Hit key={`${hit.kind}:${hit.id}`} hit={hit} />
      ))}
    </>
  );
}

function Hit({ hit }: { hit: SearchHit }) {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  return (
    <Card onPress={() => router.push(hit.href as Href)} accessibilityLabel={`${t(`learn.kind.${hit.kind}`)}: ${hit.title}`}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Ionicons name={ICON[hit.kind]} size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={typography.subheading} numberOfLines={1}>
            {hit.title}
          </Text>
          <Text style={typography.caption} numberOfLines={1}>
            {t(`learn.kind.${hit.kind}`)}
            {hit.context ? ` · ${hit.context}` : ''}
          </Text>
        </View>
        <Chevron />
      </View>
    </Card>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
}));
