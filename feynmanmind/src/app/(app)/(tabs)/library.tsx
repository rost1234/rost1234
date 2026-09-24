import { useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { router } from 'expo-router';
import { OptionsSheet } from '@/components/OptionsSheet';
import { PromptModal } from '@/components/PromptModal';
import { Button, Card, EmptyState, ErrorState, IconButton, LoadingState, ProgressBar, Screen } from '@/components/ui';
import { useDeleteSubject, useSaveSubject, useSubjects, type SubjectSummary } from '@/data/subjects';
import { useT } from '@/i18n';
import { confirmAsync } from '@/lib/dialogs';
import { errorMessage } from '@/lib/errors';
import { scoreColor, spacing, useTheme } from '@/theme';

export default function LibraryScreen() {
  const t = useT();
  const { colors, typography } = useTheme();
  const subjects = useSubjects();
  const save = useSaveSubject();
  const remove = useDeleteSubject();
  const [editing, setEditing] = useState<{ id?: string; title: string } | null>(null);
  const [menuFor, setMenuFor] = useState<SubjectSummary | null>(null);

  const submit = (title: string) =>
    save.mutate({ id: editing?.id, title }, { onSuccess: () => setEditing(null) });

  const confirmDelete = async (s: SubjectSummary) => {
    const ok = await confirmAsync({
      title: t('library.deleteSubject.title', { title: s.title }),
      message: t('library.deleteSubject.body'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (ok) remove.mutate(s.id);
  };

  return (
    <>
      <Screen
        refreshControl={<RefreshControl refreshing={subjects.isRefetching} onRefresh={() => void subjects.refetch()} tintColor={colors.primary} />}
      >
        {subjects.isPending ? (
          <LoadingState />
        ) : subjects.isError ? (
          <ErrorState message={errorMessage(subjects.error, t)} onRetry={() => void subjects.refetch()} />
        ) : subjects.data.length === 0 ? (
          <EmptyState
            icon="library-outline"
            title={t('library.empty.title')}
            body={t('library.empty.body')}
            action={<Button label={t('library.addSubject')} icon="add" onPress={() => setEditing({ title: '' })} />}
          />
        ) : (
          <>
            <Button label={t('library.addSubject')} icon="add" variant="secondary" onPress={() => { save.reset(); setEditing({ title: '' }); }} />
            {subjects.data.map((s) => (
              <Card key={s.id} onPress={() => router.push(`/subject/${s.id}`)} accessibilityLabel={s.title}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={typography.subheading} numberOfLines={2}>
                      {s.title}
                    </Text>
                    <Text style={typography.caption}>{t.plural('library.concepts', s.conceptCount)}</Text>
                  </View>
                  <IconButton icon="ellipsis-horizontal" label={t('common.options')} onPress={() => setMenuFor(s)} />
                </View>
                {s.conceptCount > 0 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <ProgressBar value={s.avgMastery / 100} color={scoreColor(s.avgMastery, colors)} height={6} />
                    <Text style={[typography.caption, { minWidth: 36, textAlign: 'right' }]}>{s.avgMastery}%</Text>
                  </View>
                ) : null}
              </Card>
            ))}
          </>
        )}
      </Screen>

      <PromptModal
        visible={editing !== null}
        title={editing?.id ? t('common.rename') : t('library.addSubject')}
        label={t('library.subjectName')}
        initialValue={editing?.title}
        confirmLabel={editing?.id ? t('common.save') : t('common.add')}
        busy={save.isPending}
        error={save.error ? errorMessage(save.error, t) : null}
        onSubmit={submit}
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
