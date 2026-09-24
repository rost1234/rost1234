import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from 'react-native';
import { useT } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import { Button, InlineError, TextField } from './ui';

interface PromptModalProps {
  visible: boolean;
  title: string;
  label: string;
  initialValue?: string;
  confirmLabel: string;
  maxLength?: number;
  busy?: boolean;
  error?: string | null;
  onSubmit: (value: string) => void;
  onClose: () => void;
}

/** Cross-platform text prompt (Alert.prompt is iOS-only). */
export function PromptModal(props: PromptModalProps) {
  const styles = useStyles();
  const t = useT();
  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={props.onClose} accessibilityLabel={t('common.cancel')} />
        {/* Keyed so each opening starts from the current initial value. */}
        {props.visible ? <PromptForm key={props.initialValue ?? ''} {...props} /> : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PromptForm({ title, label, initialValue = '', confirmLabel, maxLength = 200, busy, error, onSubmit, onClose }: PromptModalProps) {
  const t = useT();
  const styles = useStyles();
  const { typography } = useTheme();
  const [value, setValue] = useState(initialValue);

  const trimmed = value.trim();
  const submit = () => {
    if (trimmed && !busy) onSubmit(trimmed);
  };

  return (
    <View style={styles.sheet} accessibilityViewIsModal>
      <Text style={typography.heading}>{title}</Text>
      <TextField
        label={label}
        value={value}
        onChangeText={setValue}
        autoFocus
        maxLength={maxLength}
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <InlineError message={error} />
      <View style={styles.actions}>
        <Button label={t('common.cancel')} variant="ghost" onPress={onClose} style={styles.flex} />
        <Button label={confirmLabel} onPress={submit} disabled={!trimmed} loading={busy} style={styles.flex} />
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  backdrop: { flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: 'rgba(0,0,0,0.45)' },
  dismiss: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.lg, maxWidth: 480, width: '100%', alignSelf: 'center' },
  actions: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
}));
