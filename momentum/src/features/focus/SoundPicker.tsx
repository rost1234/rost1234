import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { focusColors, radius, spacing } from '@/components/theme';
import { runDetached } from '@/core/errors';
import { haptics } from '@/core/haptics';
import { playFocusMix, setFocusSoundVolume } from '@/services/focusSoundPlayer';
import { useFocusSoundStore } from '@/state/focusSoundStore';
import { FocusLabel } from './focusUi';
import { FOCUS_SOUNDS, VOLUME_LEVELS, findSound, type FocusSoundId } from './sounds';
import { useT } from '@/i18n';

interface SoundPickerProps {
  /** When a session is running, changes apply to what's playing right away. */
  isPlaying: boolean;
}

function SoundTile({
  label,
  icon,
  tint,
  selected,
  badge,
  onPress,
}: {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  tint: string;
  selected: boolean;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, selected && styles.tileSelected, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${tint}33` }]}>
        <Ionicons name={icon} size={20} color={selected ? '#FFFFFF' : tint} />
      </View>
      <Text style={[styles.tileLabel, selected && styles.tileLabelSelected]} numberOfLines={1}>
        {label}
      </Text>
      {badge ? <Text style={styles.badge}>{badge}</Text> : null}
    </Pressable>
  );
}

function VolumeRow({ volume, label, onChange }: { volume: number; label: string; onChange: (value: number) => void }) {
  const t = useT();
  return (
    <View style={styles.volumeRow} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Ionicons name="volume-low-outline" size={18} color={focusColors.textMuted} />
      {VOLUME_LEVELS.map((level) => {
        const active = volume === level.value;
        return (
          <Pressable
            key={level.label}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t('sound.volumeA11y', { level: t(level.label) })}
            onPress={() => onChange(level.value)}
            style={[styles.volume, active && styles.volumeSelected]}
          >
            <Text style={[styles.volumeText, active && styles.volumeTextSelected]}>{t(level.label)}</Text>
          </Pressable>
        );
      })}
      <Ionicons name="volume-high-outline" size={18} color={focusColors.textMuted} />
    </View>
  );
}

/** Optional background sound for focus sessions, with an optional second layer. */
export function SoundPicker({ isPlaying }: SoundPickerProps) {
  const t = useT();
  const layers = useFocusSoundStore((s) => s.layers);
  const setSound = useFocusSoundStore((s) => s.setSound);
  const setSecondLayer = useFocusSoundStore((s) => s.setSecondLayer);
  const setVolume = useFocusSoundStore((s) => s.setVolume);
  const [first, second] = layers;
  const selected = first ? findSound(first.id) : undefined;

  // Changes apply to what's playing right away.
  const replay = () => {
    if (isPlaying) runDetached(playFocusMix(useFocusSoundStore.getState().layers));
  };

  const choose = (id: FocusSoundId) => {
    haptics.select();
    setSound(id);
    replay();
  };

  const chooseSecond = (id: FocusSoundId) => {
    haptics.select();
    setSecondLayer(second?.id === id ? 'off' : id);
    replay();
  };

  const chooseVolume = (index: number, value: number) => {
    haptics.select();
    setVolume(index, value);
    if (isPlaying) setFocusSoundVolume(index, value);
  };

  return (
    <View style={styles.container}>
      <FocusLabel>{t('sound.title')}</FocusLabel>
      <View style={styles.grid} accessibilityRole="radiogroup">
        <SoundTile label={t('sound.silence')} icon="volume-mute-outline" tint="#9C9DC6" selected={!first} onPress={() => choose('off')} />
        {FOCUS_SOUNDS.map((sound) => (
          <SoundTile
            key={sound.id}
            label={t(sound.label)}
            icon={sound.icon}
            tint={sound.tint}
            selected={first?.id === sound.id}
            badge={sound.needsHeadphones ? '🎧' : undefined}
            onPress={() => choose(sound.id)}
          />
        ))}
      </View>

      {first && selected ? (
        <View style={styles.details}>
          <Text style={styles.description}>{t(selected.description)}</Text>
          <View style={styles.evidenceRow}>
            <Ionicons name="information-circle-outline" size={14} color={focusColors.textMuted} />
            <Text style={styles.evidence}>{t(selected.evidence)}</Text>
          </View>
          <VolumeRow volume={first.volume} label={t('sound.volume')} onChange={(v) => chooseVolume(0, v)} />

          <Text style={styles.layerTitle}>{t('sound.layerTitle')}</Text>
          <View style={styles.chips}>
            {FOCUS_SOUNDS.filter((s) => s.id !== first.id).map((sound) => {
              const active = second?.id === sound.id;
              return (
                <Pressable
                  key={sound.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={t('sound.layerA11y', { sound: t(sound.label) })}
                  onPress={() => chooseSecond(sound.id)}
                  style={[styles.chip, active && styles.chipSelected]}
                >
                  <Ionicons name={active ? 'checkmark' : 'add'} size={14} color={active ? '#FFFFFF' : sound.tint} />
                  <Text style={[styles.chipText, active && styles.volumeTextSelected]}>{t(sound.label)}</Text>
                </Pressable>
              );
            })}
          </View>
          {second ? <VolumeRow volume={second.volume} label={t('sound.layerVolume')} onChange={(v) => chooseVolume(1, v)} /> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md, alignSelf: 'stretch' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: '31.5%',
    flexGrow: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: focusColors.surface,
    borderWidth: 1,
    borderColor: focusColors.border,
  },
  tileSelected: { backgroundColor: focusColors.surfaceActive, borderColor: focusColors.ringStart },
  iconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { color: focusColors.textMuted, fontSize: 12, fontWeight: '600' },
  tileLabelSelected: { color: focusColors.text },
  badge: { position: 'absolute', top: 6, right: 8, fontSize: 11 },
  details: { gap: spacing.sm },
  description: { color: focusColors.text, fontSize: 14 },
  evidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  evidence: { color: focusColors.textMuted, fontSize: 12, fontStyle: 'italic', flex: 1 },
  volumeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  volume: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: focusColors.surface,
  },
  volumeSelected: { backgroundColor: focusColors.surfaceActive },
  volumeText: { color: focusColors.textMuted, fontSize: 13, fontWeight: '600' },
  volumeTextSelected: { color: focusColors.text },
  layerTitle: { color: focusColors.textMuted, fontSize: 12, fontWeight: '700', marginTop: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: focusColors.surface,
    borderWidth: 1,
    borderColor: focusColors.border,
  },
  chipSelected: { backgroundColor: focusColors.surfaceActive, borderColor: focusColors.ringStart },
  chipText: { color: focusColors.textMuted, fontSize: 12, fontWeight: '600' },
});
