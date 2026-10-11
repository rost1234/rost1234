import type { ComponentPropsWithRef } from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput } from 'react-native';

/** The app's typeface (Hebrew + Latin). Bundled per weight; see the expo-font plugin in app.json and lib/fonts. */
export const FONT_FAMILY = 'Rubik';

const styles = StyleSheet.create({ font: { fontFamily: FONT_FAMILY } });

/** React Native's Text in the app's typeface; a style's own fontFamily still wins. */
export function Text({ style, ...rest }: ComponentPropsWithRef<typeof RNText>) {
  return <RNText {...rest} style={[styles.font, style]} />;
}

/** React Native's TextInput in the app's typeface. */
export function TextInput({ style, ...rest }: ComponentPropsWithRef<typeof RNTextInput>) {
  return <RNTextInput {...rest} style={[styles.font, style]} />;
}
