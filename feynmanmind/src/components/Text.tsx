import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Text as RNText, TextInput as RNTextInput } from 'react-native';
import { fixBidi } from '@/lib/bidi';
import { useTheme } from '@/theme';

/**
 * React Native's Text in the current mode's body font (serif on paper, sans on the chalkboard); a style's own
 * fontFamily wins. Plain-text children get direction marks so mixed Hebrew/English reads the right way (`lib/bidi`).
 */
export function Text({ style, children, ...rest }: ComponentPropsWithRef<typeof RNText>) {
  const { fonts } = useTheme();
  return (
    <RNText {...rest} style={[{ fontFamily: fonts.body }, style]}>
      {bidiChildren(children)}
    </RNText>
  );
}

/** Fixes a string child, or a list of strings and numbers (`{a} text {b}`) joined into one. Anything else is left as is. */
function bidiChildren(children: ReactNode): ReactNode {
  if (typeof children === 'string') return fixBidi(children);
  if (Array.isArray(children) && children.length && children.every((c) => typeof c === 'string' || typeof c === 'number')) return fixBidi(children.join(''));
  return children;
}

/** React Native's TextInput in the current mode's body font. */
export function TextInput({ style, ...rest }: ComponentPropsWithRef<typeof RNTextInput>) {
  const { fonts } = useTheme();
  return <RNTextInput {...rest} style={[{ fontFamily: fonts.body }, style]} />;
}
