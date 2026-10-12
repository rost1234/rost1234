import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

/** True while the on-screen keyboard is up (floating bars hide so they don't ride up over a field). */
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return open;
}
