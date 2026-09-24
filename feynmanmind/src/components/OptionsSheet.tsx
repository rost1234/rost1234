import { Modal, Pressable, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useT } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import type { IconName } from './ui';

export interface SheetOption {
  label: string;
  icon: IconName;
  destructive?: boolean;
  onPress: () => void;
}

/** Bottom sheet of actions (rename, delete, …) for a list item. */
export function OptionsSheet({ visible, title, options, onClose }: { visible: boolean; title?: string; options: SheetOption[]; onClose: () => void }) {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.cancel')}>
        <Pressable style={styles.sheet} accessibilityViewIsModal onPress={() => {}}>
          {title ? (
            <Text style={[typography.caption, styles.title]} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {options.map((o) => (
            <Pressable
              key={o.label}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceMuted }]}
              onPress={() => {
                onClose();
                o.onPress();
              }}
            >
              <Ionicons name={o.icon} size={20} color={o.destructive ? colors.danger : colors.text} />
              <Text style={[typography.body, o.destructive && { color: colors.danger }]}>{o.label}</Text>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" style={styles.row} onPress={onClose}>
            <Text style={[typography.body, { color: colors.textMuted }]}>{t('common.cancel')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  title: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md },
}));
