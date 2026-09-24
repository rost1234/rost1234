import { FlexWidget, TextWidget, type HexColor } from 'react-native-android-widget';
import { t } from '@/i18n';
import type { FocusWidgetModel } from './focusWidgetModel';

export const FOCUS_WIDGET_NAME = 'Focus';
export const START_FOCUS_ACTION = 'START_FOCUS';

/** Always dark, like the Focus screen. */
const P = {
  bg: '#1B1C3A' as HexColor,
  button: '#5B5BD6' as HexColor,
  text: '#F2F3F7' as HexColor,
  muted: '#A3A8BA' as HexColor,
};

function Body({ model, minutes }: { model: FocusWidgetModel; minutes: number }) {
  if (model.kind === 'running') {
    const title = model.isPaused ? t('fwidget.paused') : model.isBreak ? t('fwidget.break') : t('fwidget.focusing');
    return (
      <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: 'momentum://focus' }} style={{ alignItems: 'center' }}>
        <TextWidget text={title} style={{ fontSize: 15, fontWeight: 'bold', color: P.text }} />
        {model.isPaused ? null : (
          <TextWidget text={t('fwidget.until', { time: model.endsAt })} style={{ fontSize: 13, color: P.muted, marginTop: 4 }} />
        )}
      </FlexWidget>
    );
  }
  if (model.kind === 'finished') {
    return (
      <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: 'momentum://focus' }} style={{ alignItems: 'center' }}>
        <TextWidget text={t('fwidget.finished')} style={{ fontSize: 15, fontWeight: 'bold', color: P.text }} />
        <TextWidget text={t('fwidget.openToLog')} style={{ fontSize: 12, color: P.muted, marginTop: 4 }} />
      </FlexWidget>
    );
  }
  return (
    <FlexWidget style={{ alignItems: 'center' }}>
      <FlexWidget
        clickAction={START_FOCUS_ACTION}
        accessibilityLabel={t('quick.focus', { minutes })}
        style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: P.button, alignItems: 'center', justifyContent: 'center' }}
      >
        <TextWidget text="▶" style={{ fontSize: 24, color: P.text }} />
      </FlexWidget>
      <TextWidget text={t('quick.focus', { minutes })} style={{ fontSize: 13, fontWeight: 'bold', color: P.text, marginTop: 8 }} />
    </FlexWidget>
  );
}

export function renderFocusWidget(model: FocusWidgetModel, minutes: number) {
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        borderRadius: 18,
        backgroundColor: P.bg,
      }}
    >
      <Body model={model} minutes={minutes} />
    </FlexWidget>
  );
}
