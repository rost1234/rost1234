import { Switch, Text, View } from 'react-native';
import { Card, SectionHeader, Segmented } from '@/components/ui';
import { useT } from '@/i18n';
import { usePrefsStore, type TextSizePref } from '@/state/prefsStore';
import { spacing, useTheme } from '@/theme';

/** Text size, contrast, motion and vibration. */
export function AccessibilitySettings() {
  const t = useT();
  const { colors, typography } = useTheme();
  const prefs = usePrefsStore();
  const toggle = (label: string, hint: string, value: boolean, onChange: (v: boolean) => void) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={typography.subheading}>{label}</Text>
        <Text style={typography.caption}>{hint}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label} trackColor={{ true: colors.primary, false: colors.border }} />
    </View>
  );
  return (
    <>
      <SectionHeader title={t('a11y.title')} />
      <Card style={{ gap: spacing.md }}>
        <Text style={typography.subheading}>{t('a11y.textSize')}</Text>
        <Segmented<TextSizePref>
          value={prefs.textSize}
          onChange={(textSize) => prefs.set({ textSize })}
          options={[
            { value: 'normal', label: t('a11y.textNormal') },
            { value: 'large', label: t('a11y.textLarge') },
            { value: 'xlarge', label: t('a11y.textXLarge') },
          ]}
        />
        {toggle(t('a11y.contrast'), t('a11y.contrastHint'), prefs.highContrast, (highContrast) => prefs.set({ highContrast }))}
        {toggle(t('a11y.motion'), t('a11y.motionHint'), prefs.reduceMotion, (reduceMotion) => prefs.set({ reduceMotion }))}
        {toggle(t('a11y.haptics'), t('a11y.hapticsHint'), prefs.hapticsEnabled, (hapticsEnabled) => prefs.set({ hapticsEnabled }))}
      </Card>
    </>
  );
}
