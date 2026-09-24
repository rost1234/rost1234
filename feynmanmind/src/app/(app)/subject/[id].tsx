import { useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { OptionsSheet } from '@/components/OptionsSheet';
import { PromptModal } from '@/components/PromptModal';
import { ScoreRing } from '@/components/ScoreRing';
import { Button, Card, EmptyState, ErrorState, IconButton, LoadingState, Screen } from '@/components/ui';
import { useConcepts, useDeleteConcept, useSaveConcept, type ConceptSummary } from '@/data/concepts';
import { useSubject } from '@/data/subjects';
import { useT } from '@/i18n';
import { confirmAsync } from '@/lib/dialogs';
import { errorMessage } from '@/lib/errors';
import { spacing, useTheme } from '@/theme';

export default function SubjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const { colors, typography } = useTheme();
  const subject = useSubject(id);
  const concepts = useConcepts(id);
  const save = useSaveConcept();
  const remove = useDeleteConcept();
  const [editing, setEditing] = useState<{ id?: string; title: string } | null>(null);
  const [menuFor, setMenuFor] = useState<ConceptSummary | null>(null);

  const openNew = () => {
    save.reset();
    setEditing({ title: '' });
  };

  const confirmDelete = async (c: ConceptSummary) => {
    const ok = await confirmAsync({
      title: t('subject.deleteConcept.title', { title: c.title }),
      message: t('subject.deleteConcept.body'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (ok) remove.mutate(c.id);
  };

  return (
    <>
      <Stack.Screen options={{ title: subject.data?.title ?? t('nav.subject') }} />
      <Screen
        refreshControl={<RefreshControl refreshing={concepts.isRefetching} onRefresh={() => void concepts.refetch()} tintColor={colors.primary} />}
      >
        {concepts.isPending ? (
          <LoadingState />
        ) : concepts.isError ? (
          <ErrorState message={errorMessage(concepts.error, t)} onRetry={() => void concepts.refetch()} />
        ) : concepts.data.length === 0 ? (
          <EmptyState
            icon="bulb-outline"
            title={t('subject.empty.title')}
            body={t('subject.empty.body')}
            action={<Button label={t('subject.addConcept')} icon="add" onPress={openNew} />}
          />
        ) : (
          <>
            <Button label={t('subject.addConcept')} icon="add" variant="secondary" onPress={openNew} />
            {concepts.data.map((c) => (
              <Card key={c.id} onPress={() => router.push(`/concept/${c.id}`)} accessibilityLabel={c.title}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <ScoreRing score={c.mastery_level} size={48} stroke={5} caption={t('concept.mastery')} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={typography.subheading} numberOfLines={2}>
                      {c.title}
                    </Text>
                    <Text style={typography.caption}>{t.plural('subject.cards', c.cardCount)}</Text>
                  </View>
                  <IconButton icon="ellipsis-horizontal" label={t('common.options')} onPress={() => setMenuFor(c)} />
                </View>
              </Card>
            ))}
          </>
        )}
      </Screen>

      <PromptModal
        visible={editing !== null}
        title={editing?.id ? t('common.rename') : t('subject.addConcept')}
        label={t('subject.conceptName')}
        initialValue={editing?.title}
        confirmLabel={editing?.id ? t('common.save') : t('common.add')}
        busy={save.isPending}
        error={save.error ? errorMessage(save.error, t) : null}
        onSubmit={(title) =>
          save.mutate(
            { id: editing?.id, subjectId: id, title },
            {
              onSuccess: (newId) => {
                const wasNew = !editing?.id;
                setEditing(null);
                // A new concept goes straight to its page to start learning.
                if (wasNew) router.push(`/concept/${newId}`);
              },
            },
          )
        }
        onClose={() => {
          setEditing(null);
          save.reset();
        }}
      />
      <OptionsSheet
        visible={menuFor !== null}
        title={menuFor?.title}
        onClose={() => setMenuFor(null)}
        options={
          menuFor
            ? [
                { label: t('common.rename'), icon: 'create-outline', onPress: () => { save.reset(); setEditing({ id: menuFor.id, title: menuFor.title }); } },
                { label: t('common.delete'), icon: 'trash-outline', destructive: true, onPress: () => void confirmDelete(menuFor) },
              ]
            : []
        }
      />
    </>
  );
}
