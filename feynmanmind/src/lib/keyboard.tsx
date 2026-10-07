import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Keyboard, Platform, View, type StyleProp, type ViewStyle } from 'react-native';

/** Whether the on-screen keyboard is open. */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

/**
 * A view that keeps its bottom edge above the keyboard. It measures how much of
 * itself the keyboard actually covers and pads exactly that much, so it works
 * whether or not the system already resized the window (Android edge-to-edge
 * often doesn't). Put a fixed bar as its last child and it sits on the keyboard.
 */
export function KeyboardInsetView({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const ref = useRef<View>(null);
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null);
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setKeyboardTop(e.endCoordinates.screenY));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardTop(null));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const measure = useCallback(() => {
    if (keyboardTop === null) return;
    // Wait a frame so a window resize (if the system does one) has been laid out.
    requestAnimationFrame(() =>
      ref.current?.measureInWindow((_x, y, _w, height) => {
        setInset(Math.max(0, Math.round(y + height - keyboardTop)));
      }),
    );
  }, [keyboardTop]);

  useEffect(measure, [measure]);

  return (
    <View ref={ref} onLayout={measure} style={[{ flex: 1 }, style, { paddingBottom: keyboardTop === null ? 0 : inset }]}>
      {children}
    </View>
  );
}
