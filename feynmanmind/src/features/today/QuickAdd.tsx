import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { OptionsSheet } from '@/components/OptionsSheet';
import { PromptModal } from '@/components/PromptModal';
import { useAddLooseConcept } from '@/data/concepts';
import { useT } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import { spacing, useTheme } from '@/theme';

/** Floating "+" button: add a concept, build a course with the AI, or start reviewing — from anywhere. */
export function QuickAdd() {
  const t = useT();
  const { colors } = useTheme();
  const add = useAddLooseConcept();
  const [menu, setMenu] = useState(false);
  const [prompt, setPrompt] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('quick.title')}
        onPress={() => {
          haptics.tap();
          setMenu(true);
        }}
        style={({ pressed }) => [styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }, pressed && { transform: [{ scale: 0.94 }] }]}
      >
        <Ionicons name="add" size={32} color={colors.onPrimary} />
      </Pressable>
      <OptionsSheet
        visible={menu}
        title={t('quick.title')}
        onClose={() => setMenu(false)}
        options={[
          {
            label: t('quick.concept'),
            icon: 'bulb-outline',
            onPress: () => {
              add.reset();
              setPrompt(true);
            },
          },
          { label: t('quick.course'), icon: 'sparkles-outline', onPress: () => router.push('/new-course') },
          { label: t('quick.review'), icon: 'albums-outline', onPress: () => router.push('/study') },
        ]}
      />
      <PromptModal
        visible={prompt}
        title={t('loose.title')}
        label={t('loose.placeholder')}
        confirmLabel={t('loose.add')}
        busy={add.isPending}
        error={add.error ? errorMessage(add.error, t) : null}
        onClose={() => setPrompt(false)}
        onSubmit={(title) =>
          add.mutate(
            { title, looseTitle: t('loose.subject') },
            {
              onSuccess: (id) => {
                haptics.success();
                setPrompt(false);
                router.push(`/concept/${id}`);
              },
            },
          )
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    end: spacing.lg,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
