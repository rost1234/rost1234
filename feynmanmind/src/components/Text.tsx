import type { ComponentPropsWithRef } from 'react';
import { Text as RNText, TextInput as RNTextInput } from 'react-native';
import { useTheme } from '@/theme';

/** React Native's Text in the current mode's body font (serif on paper, sans on the chalkboard); a style's own fontFamily wins. */
export function Text({ style, ...rest }: ComponentPropsWithRef<typeof RNText>) {
  const { fonts } = useTheme();
  return <RNText {...rest} style={[{ fontFamily: fonts.body }, style]} />;
}

/** React Native's TextInput in the current mode's body font. */
export function TextInput({ style, ...rest }: ComponentPropsWithRef<typeof RNTextInput>) {
  const { fonts } = useTheme();
  return <RNTextInput {...rest} style={[{ fontFamily: fonts.body }, style]} />;
}
