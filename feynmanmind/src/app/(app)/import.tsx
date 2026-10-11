import { useState } from 'react';
import { Platform } from 'react-native';
import { Text } from '@/components/Text';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { Button, Card, InlineError, Screen, TextField } from '@/components/ui';
import { RICH_FORMAT_PROMPT } from '@/content/import';
import { useImportLessons } from '@/data/imports';
import { useT } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import { KeyboardInsetView } from '@/lib/keyboard';
import { pickLessonsFile } from '@/services/importFile';
import { makeStyles, spacing, useTheme } from '@/theme';

const EXAMPLE = `[
  {
    "topic": "Buffer Overflow",
    "concept": "ROP (Return-Oriented Programming)",
    "reference": "כשהגנת NX חוסמת הרצת shellcode על המחסנית, בונים שרשרת מתוך gadgets — קטעי קוד קצרים שכבר קיימים בזיכרון ומסתיימים ב-ret — ומשרשרים אותם כדי להשיג ביצוע שרירותי בלי להזריק קוד חדש.",
    "keyPoints": ["NX חוסם הרצה על המחסנית", "gadget מסתיים ב-ret", "לא מזריקים קוד חדש, משתמשים בקיים"]
  }
]`;

/**
 * Paste lessons as JSON (topic, concept, reference, optional keyPoints). They
 * join the "Imported lessons" course without touching anything already there;
 * concepts that already exist are skipped.
 */
export default function ImportScreen() {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const importLessons = useImportLessons();
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState(false);
  const [copied, setCopied] = useState(false);

  const submit = (source = text) =>
    importLessons.mutate(
      {
        text: source,
        texts: {
          title: t('import.courseTitle'),
          description: t('import.courseDescription'),
          cardPrompt: (concept) => t('import.cardPrompt', { concept }),
        },
      },
      {
        onSuccess: ({ added }) => {
          if (added) {
            haptics.success();
            if (source === text) setText('');
          }
        },
        onError: () => haptics.warning(),
      },
    );

  const pickFile = async () => {
    setFileError(false);
    importLessons.reset();
    try {
      const file = await pickLessonsFile();
      if (!file) return;
      setFileName(file.name);
      submit(file.text);
    } catch {
      setFileError(true);
    }
  };

  const result = importLessons.data;
  return (
    <KeyboardInsetView safeBottom={false}>
      <Screen>
        <Text style={typography.body}>{t('import.intro')}</Text>
        <Button label={t('import.pickFile')} icon="folder-open-outline" onPress={() => void pickFile()} disabled={importLessons.isPending} />
        {fileName ? <Text style={typography.caption}>📄 {fileName}</Text> : null}
        <Text style={[typography.caption, { textAlign: 'center' }]}>{t('import.orPaste')}</Text>
        <TextField
          value={text}
          onChangeText={(v) => {
            setText(v);
            setFileName(null);
            if (importLessons.error) importLessons.reset();
          }}
          placeholder={t('import.placeholder')}
          accessibilityLabel={t('import.field')}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          style={styles.json}
          testID="import-json"
        />
        <InlineError message={fileError ? t('import.fileError') : importLessons.error ? errorMessage(importLessons.error, t) : null} />
        <Button label={t('import.run')} icon="clipboard-outline" variant="secondary" onPress={() => submit()} disabled={!text.trim() || importLessons.isPending} />
        {!text ? <Button label={t('import.example')} variant="ghost" icon="document-text-outline" onPress={() => setText(EXAMPLE)} /> : null}
        {result ? (
          <Card style={{ gap: spacing.xs, borderColor: result.added ? colors.success : colors.border }}>
            <Text style={typography.subheading}>{result.added ? `✓ ${(result.added === 1 ? t('import.addedOne') : t('import.added', { added: result.added }))}` : t('import.nothing', { n: result.skipped })}</Text>
            {result.added && result.skipped ? <Text style={typography.caption}>{t('import.skipped', { n: result.skipped })}</Text> : null}
            <Button label={t('import.openCourse')} icon="map-outline" variant={result.added ? 'primary' : 'secondary'} onPress={() => router.replace(`/course/${result.courseId}`)} />
          </Card>
        ) : null}
        <Card style={{ gap: spacing.sm }}>
          <Text style={typography.subheading}>✨ {t('import.richTitle')}</Text>
          <Text style={typography.caption}>{t('import.richBody')}</Text>
          <Button
            label={copied ? t('import.promptCopied') : t('import.copyPrompt')}
            icon={copied ? 'checkmark' : 'copy-outline'}
            variant="secondary"
            onPress={() => void Clipboard.setStringAsync(RICH_FORMAT_PROMPT).then(() => setCopied(true))}
          />
        </Card>
      </Screen>
    </KeyboardInsetView>
  );
}

const useStyles = makeStyles(() => ({
  json: {
    minHeight: 220,
    maxHeight: 420,
    textAlign: 'left',
    writingDirection: 'ltr',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 13,
  },
}));
