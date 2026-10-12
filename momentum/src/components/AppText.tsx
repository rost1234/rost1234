import { createContext, useContext, type ComponentProps } from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput, type StyleProp, type TextStyle } from 'react-native';
import { usePrefsStore, type LookPref } from '@/state/prefsStore';
import { fontFamilyFor, fontsAvailable } from './fonts';

/** True inside another Text, where unstyled text keeps the parent's weight. */
const InsideText = createContext(false);

/**
 * Replaces `fontWeight` with the matching font file of the current look (custom fonts have no
 * weights of their own), and gives text without a weight the regular file. Text nested in other
 * text inherits unless it sets a weight itself.
 */
function withFont(style: StyleProp<TextStyle>, inherit: boolean, look: LookPref): StyleProp<TextStyle> {
  if (!fontsAvailable()) return style;
  const flat = StyleSheet.flatten(style) ?? {};
  if (flat.fontFamily) return style;
  if (inherit && flat.fontWeight === undefined) return style;
  return { ...flat, fontFamily: fontFamilyFor(flat.fontWeight, look), fontWeight: 'normal' };
}

export function Text({ style, children, ...props }: ComponentProps<typeof RNText>) {
  const inside = useContext(InsideText);
  const look = usePrefsStore((s) => s.look);
  return (
    <RNText {...props} style={withFont(style, inside, look)}>
      <InsideText.Provider value>{children}</InsideText.Provider>
    </RNText>
  );
}

export function TextInput({ style, ...props }: ComponentProps<typeof RNTextInput>) {
  const look = usePrefsStore((s) => s.look);
  return <RNTextInput {...props} style={withFont(style, false, look)} />;
}
