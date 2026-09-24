import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Chip } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/components/theme';
import { runDetached } from '@/core/errors';
import { playFocusSound, setFocusSoundVolume, stopFocusSound } from '@/services/focusSoundPlayer';
import { useFocusSoundStore } from '@/state/focusSoundStore';
import { FOCUS_SOUNDS, VOLUME_LEVELS, findSound, type FocusSoundId } from './sounds';

interface SoundPickerProps {
  /** When a session is running, changes apply to what's playing right away. */
  isPlaying: boolean;
}

/** Optional background sound for focus sessions. */
export function SoundPicker({ isPlaying }: SoundPickerProps) {
  const soundId = useFocusSoundStore((s) => s.soundId);
  const volume = useFocusSoundStore((s) => s.volume);
  const setSound = useFocusSoundStore((s) => s.setSound);
  const setVolume = useFocusSoundStore((s) => s.setVolume);
  const selected = findSound(soundId);

  const choose = (id: FocusSoundId) => {
    setSound(id);
    if (!isPlaying) return;
    if (id === 'off') stopFocusSound();
    else runDetached(playFocusSound(id, volume));
  };

  const chooseVolume = (value: number) => {
    setVolume(value);
    if (isPlaying) setFocusSoundVolume(value);
  };

  return (
    <View style={styles.container}>
      <Text style={typography.label}>Focus sound</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <Chip label="Silence" selected={soundId === 'off'} onPress={() => choose('off')} />
        {FOCUS_SOUNDS.map((sound) => (
          <Chip
            key={sound.id}
            label={sound.needsHeadphones ? `🎧 ${sound.label}` : sound.label}
            selected={soundId === sound.id}
            onPress={() => choose(sound.id)}
          />
        ))}
      </ScrollView>

      {selected ? (
        <View style={styles.details}>
          <Text style={typography.caption}>{selected.description}</Text>
          <Text style={[typography.caption, styles.evidence]}>ⓘ {selected.evidence}</Text>
          <View style={styles.volumeRow} accessibilityRole="radiogroup" accessibilityLabel="Volume">
            {VOLUME_LEVELS.map((level) => (
              <Pressable
                key={level.label}
                accessibilityRole="radio"
                accessibilityState={{ selected: volume === level.value }}
                onPress={() => chooseVolume(level.value)}
                style={[styles.volume, volume === level.value && styles.volumeSelected]}
              >
                <Text style={[typography.caption, volume === level.value && styles.volumeTextSelected]}>{level.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm, alignSelf: 'stretch' },
  row: { gap: spacing.sm, paddingVertical: spacing.xs },
  details: { gap: spacing.xs },
  evidence: { fontStyle: 'italic' },
  volumeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  volume: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  volumeSelected: { backgroundColor: colors.primarySoft },
  volumeTextSelected: { color: colors.primary, fontWeight: '700' },
});
