import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { PromptModal } from '@/components/PromptModal';
import { Card, EmptyState, ProgressBar, Screen, type IconName } from '@/components/ui';
import { useSaveConcept } from '@/data/concepts';
import { useT } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import { subjectPath, type PathConcept } from '@/local/logic';
import { useDBStore } from '@/local/store';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

const GOLD = { main: '#FFC800', lip: '#E0A800', ink: '#6B4A00' };
const UNIT_COLORS = [
  { main: '#58CC02', lip: '#46A302' },
  { main: '#1CB0F6', lip: '#1899D6' },
  { main: '#CE82FF', lip: '#A568CC' },
  { main: '#FF9600', lip: '#CC7800' },
];
const WIND = [0, 48, 72, 48, 0, -48, -72, -48];

/**
 * A library subject as a path, like the course maps: its concepts in the order
 * you added them, in units of five. Mastered concepts (explained with 71+) are
 * gold, the next one to work on is marked, and you can add concepts at the end.
 */
export default function SubjectMapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const db = useDBStore((s) => s.db);
  const subject = db.subjects[id];
  const save = useSaveConcept();
  const [adding, setAdding] = useState(false);

  if (!subject) return <EmptyState icon="alert-circle-outline" title={t('error.title')} body={t('error.generic')} />;
  const path = subjectPath(db, id);
  let step = 0;

  return (
    <>
      <Stack.Screen options={{ title: subject.title }} />
      <Screen>
        <Card style={{ gap: spacing.sm }}>
          <Text style={typography.heading}>{subject.title}</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <ProgressBar value={path.total ? path.done / path.total : 0} height={8} />
            </View>
            <Text style={typography.caption}>{t('subjectMap.progress', { done: path.done, total: path.total })}</Text>
          </View>
        </Card>

        {path.total === 0 ? <Text style={typography.body}>{t('subject.empty.body')}</Text> : null}
        {path.units.map((unit, u) => {
          const palette = UNIT_COLORS[u % UNIT_COLORS.length]!;
          const unitDone = unit.filter((c) => c.status === 'mastered').length;
          return (
            <View key={u} style={{ gap: spacing.md }}>
              <View style={[styles.unit, { backgroundColor: palette.main }]}>
                <Text style={styles.unitTitle}>{t('course.unit', { n: u + 1 })}</Text>
                <Text style={styles.unitSub}>{t('course.unitProgress', { done: unitDone, total: unit.length })}</Text>
              </View>
              {unit.map((c) => (
                <View key={c.id} style={[styles.nodeRow, { transform: [{ translateX: WIND[step++ % WIND.length]! }] }]}>
                  <Node concept={c} current={c.id === path.nextId} palette={palette} />
                </View>
              ))}
              <View style={styles.nodeRow}>
                <View style={[styles.trophy, unitDone === unit.length ? { backgroundColor: GOLD.main, borderBottomColor: GOLD.lip } : null]}>
                  <Ionicons name="trophy" size={28} color={unitDone === unit.length ? GOLD.ink : colors.textMuted} />
                </View>
              </View>
            </View>
          );
        })}

        <Card onPress={() => setAdding(true)} accessibilityLabel={t('subject.addConcept')} style={{ borderStyle: 'dashed', borderColor: colors.primary }}>
          <View style={styles.row}>
            <View style={styles.addIcon}>
              <Ionicons name="add" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={typography.subheading}>{t('subjectMap.add')}</Text>
              <Text style={typography.caption}>{t('subjectMap.addHint')}</Text>
            </View>
          </View>
        </Card>
      </Screen>
      <PromptModal
        visible={adding}
        title={t('subject.addConcept')}
        label={t('subject.conceptName')}
        confirmLabel={t('common.add')}
        busy={save.isPending}
        error={save.error ? errorMessage(save.error, t) : null}
        onClose={() => setAdding(false)}
        onSubmit={(title) =>
          save.mutate(
            { subjectId: id, title },
            {
              onSuccess: () => {
                haptics.success();
                setAdding(false);
              },
            },
          )
        }
      />
    </>
  );
}

function Node({ concept, current, palette }: { concept: PathConcept; current: boolean; palette: { main: string; lip: string } }) {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const mastered = concept.status === 'mastered';
  const fill = mastered ? GOLD : current || concept.status === 'started' ? palette : { main: colors.surfaceMuted, lip: colors.border };
  const icon: IconName = mastered ? 'star' : current ? 'play' : concept.status === 'started' ? 'chatbubbles' : 'bulb';
  return (
    <View style={styles.nodeWrap}>
      {current ? (
        <View style={[styles.bubble, { borderColor: palette.main }]}>
          <Text style={[styles.bubbleText, { color: palette.main }]}>{t('course.go')}</Text>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${concept.title}, ${t('concept.mastery')} ${concept.mastery}%`}
        onPress={() => router.push(`/concept/${concept.id}`)}
        style={({ pressed }) => [
          styles.node,
          current && styles.nodeCurrent,
          { backgroundColor: fill.main, borderBottomColor: fill.lip },
          pressed && { borderBottomWidth: 2, transform: [{ translateY: 4 }] },
        ]}
      >
        <Ionicons name={icon} size={30} color={mastered ? GOLD.ink : fill === palette ? '#FFFFFF' : colors.textMuted} />
      </Pressable>
      <Text style={[typography.caption, styles.nodeTitle, current && { color: colors.text, fontWeight: '700' }]} numberOfLines={2}>
        {concept.title}
      </Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  unit: { borderRadius: radius.lg, padding: spacing.md, gap: 2 },
  unitTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 17 },
  unitSub: { color: '#FFFFFF', opacity: 0.9, fontSize: 13 },
  nodeRow: { alignItems: 'center' },
  nodeWrap: { alignItems: 'center', gap: 6, width: 140 },
  node: { width: 70, height: 66, borderRadius: 35, borderBottomWidth: 6, alignItems: 'center', justifyContent: 'center' },
  nodeCurrent: { width: 80, height: 76, borderRadius: 40 },
  nodeTitle: { textAlign: 'center' },
  bubble: { borderWidth: 2, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 4, backgroundColor: colors.surface },
  bubbleText: { fontWeight: '800' },
  trophy: {
    width: 64,
    height: 58,
    borderRadius: 32,
    borderBottomWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    borderBottomColor: colors.border,
  },
  addIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
}));
