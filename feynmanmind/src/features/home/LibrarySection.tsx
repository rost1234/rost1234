import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { OptionsSheet } from '@/components/OptionsSheet';
import { PromptModal } from '@/components/PromptModal';
import { ScoreRing } from '@/components/ScoreRing';
import { Button, Card, Chevron, EmptyState, ErrorState, IconButton, LoadingState, ProgressBar, SectionHeader } from '@/components/ui';
import { useConcepts, useDeleteConcept, useSaveConcept, type ConceptSummary } from '@/data/concepts';
import { useDeleteSubject, useSaveSubject, useSubjects, type SubjectSummary } from '@/data/subjects';
import { useT } from '@/i18n';
import { confirmAsync } from '@/lib/dialogs';
import { errorMessage } from '@/lib/errors';
import { makeStyles, radius, scoreColor, spacing, useTheme } from '@/theme';

type Editing =
  | { kind: 'subject'; id?: string; title: string }
  | { kind: 'concept'; id?: string; subjectId: string; title: string };

type Menu = { kind: 'subject'; item: SubjectSummary } | { kind: 'concept'; item: ConceptSummary; subjectId: string };

/** Subjects, each opening in place to show its concepts. */
export function LibrarySection() {
  const t = useT();
  const subjects = useSubjects();
  const saveSubject = useSaveSubject();
  const saveConcept = useSaveConcept();
  const deleteSubject = useDeleteSubject();
  const deleteConcept = useDeleteConcept();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Editing | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);

  const save = editing?.kind === 'concept' ? saveConcept : saveSubject;
  const startEditing = (e: Editing) => {
    saveSubject.reset();
    saveConcept.reset();
    setEditing(e);
  };

  const submit = (title: string) => {
    if (!editing) return;
    if (editing.kind === 'subject') {
      saveSubject.mutate(
        { id: editing.id, title },
        {
          onSuccess: (id) => {
            setEditing(null);
            if (!editing.id) setOpen((o) => ({ ...o, [id]: true }));
          },
        },
      );
    } else {
      saveConcept.mutate(
        { id: editing.id, subjectId: editing.subjectId, title },
        {
          onSuccess: (id) => {
            setEditing(null);
            // A new concept goes straight to its page to start learning.
            if (!editing.id) router.push(`/concept/${id}`);
          },
        },
      );
    }
  };

  const confirmDelete = async (m: Menu) => {
    const ok = await confirmAsync({
      title: t(m.kind === 'subject' ? 'library.deleteSubject.title' : 'subject.deleteConcept.title', { title: m.item.title }),
      message: t(m.kind === 'subject' ? 'library.deleteSubject.body' : 'subject.deleteConcept.body'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    if (m.kind === 'subject') deleteSubject.mutate(m.item.id);
    else deleteConcept.mutate(m.item.id);
  };

  return (
    <>
      <SectionHeader
        title={t('tabs.library')}
        action={
          subjects.data?.length ? (
            <Button label={t('library.addSubject')} icon="add" variant="ghost" onPress={() => startEditing({ kind: 'subject', title: '' })} />
          ) : undefined
        }
      />
      {subjects.isPending ? (
        <LoadingState />
      ) : subjects.isError ? (
        <ErrorState message={errorMessage(subjects.error, t)} onRetry={() => void subjects.refetch()} />
      ) : subjects.data.length === 0 ? (
        <Card>
          <EmptyState
            icon="library-outline"
            title={t('today.emptyTitle')}
            body={t('today.emptyBody')}
            action={<Button label={t('library.addSubject')} icon="add" onPress={() => startEditing({ kind: 'subject', title: '' })} />}
          />
        </Card>
      ) : (
        subjects.data.map((s) => (
          <SubjectBlock
            key={s.id}
            subject={s}
            open={!!open[s.id]}
            onToggle={() => setOpen((o) => ({ ...o, [s.id]: !o[s.id] }))}
            onMenu={() => setMenu({ kind: 'subject', item: s })}
            onConceptMenu={(c) => setMenu({ kind: 'concept', item: c, subjectId: s.id })}
            onAddConcept={() => startEditing({ kind: 'concept', subjectId: s.id, title: '' })}
          />
        ))
      )}

      <PromptModal
        visible={editing !== null}
        title={
          editing?.id ? t('common.rename') : editing?.kind === 'concept' ? t('subject.addConcept') : t('library.addSubject')
        }
        label={editing?.kind === 'concept' ? t('subject.conceptName') : t('library.subjectName')}
        initialValue={editing?.title}
        confirmLabel={editing?.id ? t('common.save') : t('common.add')}
        busy={save.isPending}
        error={save.error ? errorMessage(save.error, t) : null}
        onSubmit={submit}
        onClose={() => setEditing(null)}
      />
      <OptionsSheet
        visible={menu !== null}
        title={menu?.item.title}
        onClose={() => setMenu(null)}
        options={
          menu
            ? [
                {
                  label: t('common.rename'),
                  icon: 'create-outline',
                  onPress: () =>
                    startEditing(
                      menu.kind === 'subject'
                        ? { kind: 'subject', id: menu.item.id, title: menu.item.title }
                        : { kind: 'concept', id: menu.item.id, subjectId: menu.subjectId, title: menu.item.title },
                    ),
                },
                { label: t('common.delete'), icon: 'trash-outline', destructive: true, onPress: () => void confirmDelete(menu) },
              ]
            : []
        }
      />
    </>
  );
}

function SubjectBlock({ subject, open, onToggle, onMenu, onConceptMenu, onAddConcept }: {
  subject: SubjectSummary;
  open: boolean;
  onToggle: () => void;
  onMenu: () => void;
  onConceptMenu: (c: ConceptSummary) => void;
  onAddConcept: () => void;
}) {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();

  return (
    <Card style={{ padding: 0, gap: 0 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={subject.title}
        onPress={onToggle}
        style={({ pressed }) => [styles.subjectHead, pressed && { opacity: 0.85 }]}
      >
        <Ionicons name={open ? 'chevron-down' : t.isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textMuted} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={typography.subheading} numberOfLines={2}>
            {subject.title}
          </Text>
          <Text style={typography.caption}>{t.plural('library.concepts', subject.conceptCount)}</Text>
          {subject.conceptCount > 0 ? (
            <View style={styles.row}>
              <ProgressBar value={subject.avgMastery / 100} color={scoreColor(subject.avgMastery, colors)} height={6} />
              <Text style={[typography.caption, styles.pct]}>{subject.avgMastery}%</Text>
            </View>
          ) : null}
        </View>
        <IconButton icon="ellipsis-horizontal" label={t('common.options')} onPress={onMenu} />
      </Pressable>
      {open ? <ConceptList subjectId={subject.id} onMenu={onConceptMenu} onAdd={onAddConcept} /> : null}
    </Card>
  );
}

function ConceptList({ subjectId, onMenu, onAdd }: { subjectId: string; onMenu: (c: ConceptSummary) => void; onAdd: () => void }) {
  const t = useT();
  const styles = useStyles();
  const { typography } = useTheme();
  const concepts = useConcepts(subjectId);

  return (
    <View style={styles.concepts}>
      {concepts.data?.length === 0 ? <Text style={typography.caption}>{t('subject.empty.body')}</Text> : null}
      {concepts.data?.map((c) => (
        <Pressable
          key={c.id}
          accessibilityRole="button"
          accessibilityLabel={c.title}
          onPress={() => router.push(`/concept/${c.id}`)}
          style={({ pressed }) => [styles.conceptRow, pressed && { opacity: 0.8 }]}
        >
          <ScoreRing score={c.mastery_level} size={40} stroke={4} caption={t('concept.mastery')} />
          <View style={{ flex: 1 }}>
            <Text style={typography.body} numberOfLines={2}>
              {c.title}
            </Text>
            <Text style={typography.caption}>{t.plural('subject.cards', c.cardCount)}</Text>
          </View>
          <IconButton icon="ellipsis-horizontal" label={t('common.options')} onPress={() => onMenu(c)} />
          <Chevron />
        </Pressable>
      ))}
      <Button label={t('subject.addConcept')} icon="add" variant="secondary" onPress={onAdd} />
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  subjectHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  pct: { minWidth: 36, textAlign: 'right' },
  concepts: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  conceptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
}));
