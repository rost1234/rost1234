import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { focusColors, radius, spacing } from '@/components/theme';
import { runDetached } from '@/core/errors';
import { haptics } from '@/core/haptics';
import { playFocusSound, setFocusSoundVolume, stopFocusSound } from '@/services/focusSoundPlayer';
import { useFocusSoundStore } from '@/state/focusSoundStore';
import { FocusLabel } from './focusUi';
import { FOCUS_SOUNDS, VOLUME_LEVELS, findSound, type FocusSoundId } from './sounds';

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

/** Optional background sound for focus sessions. */
export function SoundPicker({ isPlaying }: SoundPickerProps) {
  const soundId = useFocusSoundStore((s) => s.soundId);
  const volume = useFocusSoundStore((s) => s.volume);
  const setSound = useFocusSoundStore((s) => s.setSound);
  const setVolume = useFocusSoundStore((s) => s.setVolume);
  const selected = findSound(soundId);

  const choose = (id: FocusSoundId) => {
    haptics.select();
    setSound(id);
    if (!isPlaying) return;
    if (id === 'off') stopFocusSound();
    else runDetached(playFocusSound(id, volume));
  };

  const chooseVolume = (value: number) => {
    haptics.select();
    setVolume(value);
    if (isPlaying) setFocusSoundVolume(value);
  };

  return (
    <View style={styles.container}>
      <FocusLabel>Focus sound</FocusLabel>
      <View style={styles.grid} accessibilityRole="radiogroup">
        <SoundTile label="Silence" icon="volume-mute-outline" tint="#9C9DC6" selected={soundId === 'off'} onPress={() => choose('off')} />
        {FOCUS_SOUNDS.map((sound) => (
          <SoundTile
            key={sound.id}
            label={sound.label}
            icon={sound.icon}
            tint={sound.tint}
            selected={soundId === sound.id}
            badge={sound.needsHeadphones ? '🎧' : undefined}
            onPress={() => choose(sound.id)}
          />
        ))}
      </View>

      {selected ? (
        <View style={styles.details}>
          <Text style={styles.description}>{selected.description}</Text>
          <View style={styles.evidenceRow}>
            <Ionicons name="information-circle-outline" size={14} color={focusColors.textMuted} />
            <Text style={styles.evidence}>{selected.evidence}</Text>
          </View>
          <View style={styles.volumeRow} accessibilityRole="radiogroup" accessibilityLabel="Volume">
            <Ionicons name="volume-low-outline" size={18} color={focusColors.textMuted} />
            {VOLUME_LEVELS.map((level) => {
              const active = volume === level.value;
              return (
                <Pressable
                  key={level.label}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${level.label} volume`}
                  onPress={() => chooseVolume(level.value)}
                  style={[styles.volume, active && styles.volumeSelected]}
                >
                  <Text style={[styles.volumeText, active && styles.volumeTextSelected]}>{level.label}</Text>
                </Pressable>
              );
            })}
            <Ionicons name="volume-high-outline" size={18} color={focusColors.textMuted} />
          </View>
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
});
