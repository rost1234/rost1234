import { I18nManager, StyleSheet, Text, View } from 'react-native';
import { Card, Chip } from '@/components/ui';
import { spacing, useTheme } from '@/components/theme';
import { resolveLanguage, useT } from '@/i18n';
import { usePrefsStore, type LanguagePref, type ThemePref } from '@/state/prefsStore';

const THEMES: { id: ThemePref; key: 'app.system' | 'app.light' | 'app.dark' }[] = [
  { id: 'system', key: 'app.system' },
  { id: 'light', key: 'app.light' },
  { id: 'dark', key: 'app.dark' },
];

const LANGUAGES: { id: LanguagePref; key: 'app.auto' | 'app.english' | 'app.hebrew' }[] = [
  { id: 'auto', key: 'app.auto' },
  { id: 'en', key: 'app.english' },
  { id: 'he', key: 'app.hebrew' },
];

/** Theme and language. Direction (RTL/LTR) changes need an app restart on Android. */
export function AppearanceSetting() {
  const t = useT();
  const { typography, colors } = useTheme();
  const theme = usePrefsStore((s) => s.theme);
  const language = usePrefsStore((s) => s.language);
  const setTheme = usePrefsStore((s) => s.setTheme);
  const setLanguage = usePrefsStore((s) => s.setLanguage);

  const chooseLanguage = (next: LanguagePref) => {
    setLanguage(next);
    const wantRTL = resolveLanguage(next) === 'he';
    I18nManager.allowRTL(true);
    if (I18nManager.isRTL !== wantRTL) I18nManager.forceRTL(wantRTL);
  };
  const needsRestart = I18nManager.isRTL !== (resolveLanguage(language) === 'he');

  return (
    <Card style={styles.card}>
      <Text style={typography.label}>{t('app.theme')}</Text>
      <View style={styles.chips}>
        {THEMES.map((option) => (
          <Chip key={option.id} label={t(option.key)} selected={theme === option.id} onPress={() => setTheme(option.id)} />
        ))}
      </View>
      <Text style={typography.label}>{t('app.language')}</Text>
      <View style={styles.chips}>
        {LANGUAGES.map((option) => (
          <Chip key={option.id} label={t(option.key)} selected={language === option.id} onPress={() => chooseLanguage(option.id)} />
        ))}
      </View>
      {needsRestart ? <Text style={[typography.caption, { color: colors.warning }]}>{t('app.restart')}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
