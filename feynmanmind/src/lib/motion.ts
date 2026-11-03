import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { usePrefsStore } from '@/state/prefsStore';

/** True when animations should be skipped: the app's "reduce motion" setting or the phone's own. */
export function useReduceMotion(): boolean {
  const pref = usePrefsStore((s) => s.reduceMotion);
  const [system, setSystem] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setSystem(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystem);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return pref || system;
}
