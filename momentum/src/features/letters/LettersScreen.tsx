import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { showConfirm } from '@/components/Overlay';
import { SheetHeader } from '@/components/SheetHeader';
import { Banner, Button, Card, Chip } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { useBottomSpace } from '@/components/useBottomSpace';
import { runDetached, toErrorMessage } from '@/core/errors';
import { addDays, formatFriendlyDate, type LocalDateString } from '@/core/localDate';
import type { FutureLetter } from '@/domain/models';
import { ReflectionLock } from '@/features/reflection/ReflectionLock';
import { useLocalDate } from '@/hooks/useLocalDate';
import { useT, type TranslationKey } from '@/i18n';
import { dueLetters, useLettersStore } from './lettersStore';

const WHEN: { key: TranslationKey; openOn: (today: LocalDateString) => LocalDateString }[] = [
  { key: 'letter.inMonth', openOn: (today) => addDays(today, 30) },
  { key: 'letter.in3Months', openOn: (today) => addDays(today, 91) },
  { key: 'letter.inYear', openOn: (today) => addDays(today, 365) },
];

function LetterView({ letter, today }: { letter: FutureLetter; today: LocalDateString }) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const remove = useLettersStore((s) => s.remove);
  const sealed = letter.openOn > today;
  const askRemove = () =>
    showConfirm({
      title: t('letter.deleteTitle'),
      confirmLabel: t('letter.delete'),
      destructive: true,
      onConfirm: () => runDetached(remove(letter.id)),
    });
  return (
    <Card style={styles.letter}>
      <View style={styles.letterHeader}>
        <Ionicons name={sealed ? 'mail-outline' : 'mail-open-outline'} size={18} color={sealed ? colors.textMuted : colors.primary} />
        <Text style={[typography.caption, { flex: 1 }]}>
          {t('letter.written', { date: formatFriendlyDate(letter.writtenOn, t.locale) })}
          {sealed ? ` · ${t('letter.opensOn', { date: formatFriendlyDate(letter.openOn, t.locale) })}` : ''}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t('letter.delete')} onPress={askRemove} hitSlop={8}>
          <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
        </Pressable>
      </View>
      {sealed ? <Text style={typography.caption}>{t('letter.sealed')}</Text> : <Text style={typography.body}>{letter.body}</Text>}
    </Card>
  );
}

function Letters() {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const today = useLocalDate();
  const letters = useLettersStore((s) => s.letters);
  const load = useLettersStore((s) => s.load);
  const write = useLettersStore((s) => s.write);
  const markOpened = useLettersStore((s) => s.markOpened);
  const [body, setBody] = useState('');
  const [when, setWhen] = useState(2);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    runDetached(load());
  }, [load]);

  // Opening this screen reads the letters whose day has come.
  useEffect(() => {
    if (!letters) return;
    for (const letter of dueLetters(letters, today)) runDetached(markOpened(letter.id));
  }, [letters, today, markOpened]);

  const save = async () => {
    const choice = WHEN[when];
    if (!body.trim() || !choice) return;
    setSaving(true);
    try {
      await write(body, today, choice.openOn(today));
      setBody('');
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const opened = (letters ?? []).filter((l) => l.openOn <= today).reverse();
  const sealed = (letters ?? []).filter((l) => l.openOn > today);

  return (
    <>
      {error ? <Banner message={error} onDismiss={() => setError(null)} /> : null}
      {opened.map((letter) => (
        <LetterView key={letter.id} letter={letter} today={today} />
      ))}

      <Card style={styles.compose}>
        <Text style={typography.label}>{t('letter.writeTitle')}</Text>
        <Text style={typography.caption}>{t('letter.writeLead')}</Text>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder={t('letter.placeholder')}
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={2000}
          style={styles.input}
          accessibilityLabel={t('letter.writeTitle')}
        />
        <Text style={typography.label}>{t('letter.when')}</Text>
        <View style={styles.chips}>
          {WHEN.map((option, index) => (
            <Chip key={option.key} label={t(option.key)} selected={when === index} onPress={() => setWhen(index)} />
          ))}
        </View>
        <Button label={t('letter.seal')} onPress={() => void save()} loading={saving} disabled={!body.trim()} />
      </Card>

      {sealed.map((letter) => (
        <LetterView key={letter.id} letter={letter} today={today} />
      ))}
    </>
  );
}

/** A letter to your future self: written today, sealed, and opened on its day. */
export function LettersScreen() {
  const t = useT();
  const styles = useStyles();
  const bottomSpace = useBottomSpace();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]} keyboardShouldPersistTaps="handled">
          <SheetHeader title={t('letter.title')} />
          <ReflectionLock>
            <Letters />
          </ReflectionLock>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors, typography }) => ({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  letter: { gap: spacing.sm },
  letterHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  compose: { gap: spacing.sm },
  input: {
    ...typography.body,
    minHeight: 140,
    textAlignVertical: 'top',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
}));
