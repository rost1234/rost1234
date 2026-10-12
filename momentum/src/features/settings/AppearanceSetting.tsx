import { I18nManager, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/AppText';
import { Card, Chip } from '@/components/ui';
import { radius, spacing, useTheme, makeStyles } from '@/components/theme';
import { haptics } from '@/core/haptics';
import { Sprout } from '@/features/garden/Sprout';
import { resolveLanguage, useT } from '@/i18n';
import { usePrefsStore, type LanguagePref, type LookPref, type ThemePref } from '@/state/prefsStore';

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

/** One look to pick: a small picture of it, its name and one line. */
function LookOption({ look, selected, onPress }: { look: LookPref; selected: boolean; onPress: () => void }) {
  const styles = useStyles();
  const t = useT();
  const { colors, typography, scenery } = useTheme();
  const name = look === 'garden' ? t('app.lookGarden') : t('app.lookCalm');
  const desc = look === 'garden' ? t('app.lookGardenDesc') : t('app.lookCalmDesc');
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${name}. ${desc}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.look,
        { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primarySoft : colors.surface },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={[styles.lookArt, { backgroundColor: look === 'garden' ? scenery.hill : '#2D6A9F' }]}>
        {look === 'garden' ? (
          <Sprout stage={2} mood="happy" size={56} />
        ) : (
          <View style={styles.calmRing}>
            <Ionicons name="checkmark" size={22} color="#FFFFFF" />
          </View>
        )}
      </View>
      <View style={styles.lookText}>
        <Text style={typography.label}>{name}</Text>
        <Text style={typography.caption}>{desc}</Text>
      </View>
      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? colors.primary : colors.textMuted} />
    </Pressable>
  );
}

/** Theme and language. Direction (RTL/LTR) changes need an app restart on Android. */
export function AppearanceSetting() {
  const styles = useStyles();
  const t = useT();
  const { typography, colors } = useTheme();
  const theme = usePrefsStore((s) => s.theme);
  const language = usePrefsStore((s) => s.language);
  const setTheme = usePrefsStore((s) => s.setTheme);
  const setLanguage = usePrefsStore((s) => s.setLanguage);
  const look = usePrefsStore((s) => s.look);
  const setLook = usePrefsStore((s) => s.setLook);
  const chooseLook = (next: LookPref) => {
    if (next === look) return;
    haptics.select();
    setLook(next);
  };

  const chooseLanguage = (next: LanguagePref) => {
    setLanguage(next);
    const wantRTL = resolveLanguage(next) === 'he';
    I18nManager.allowRTL(true);
    if (I18nManager.isRTL !== wantRTL) I18nManager.forceRTL(wantRTL);
  };
  const needsRestart = I18nManager.isRTL !== (resolveLanguage(language) === 'he');

  return (
    <Card style={styles.card}>
      <Text style={typography.label}>{t('app.look')}</Text>
      <View accessibilityRole="radiogroup" style={styles.looks}>
        <LookOption look="calm" selected={look === 'calm'} onPress={() => chooseLook('calm')} />
        <LookOption look="garden" selected={look === 'garden'} onPress={() => chooseLook('garden')} />
      </View>
      <Text style={typography.caption}>{t('app.lookNote')}</Text>
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

// Rebuilt per look (calm or garden), so the focus colors and corners follow it.
const useStyles = makeStyles(() => ({
  card: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  looks: { gap: spacing.sm },
  look: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm, borderWidth: 2, borderRadius: radius.lg, minHeight: 72 },
  lookArt: { width: 64, height: 64, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  lookText: { flex: 1, gap: 2 },
  calmRing: { width: 40, height: 40, borderRadius: 20, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
}));
