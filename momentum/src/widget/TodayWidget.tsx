import type { ReactNode } from 'react';
import { FlexWidget, TextWidget, type HexColor } from 'react-native-android-widget';
import type { TodayWidgetModel, WidgetHabitRow } from './widgetModel';

export const TODAY_WIDGET_NAME = 'Today';
export const TOGGLE_HABIT_ACTION = 'TOGGLE_HABIT';

interface Palette {
  bg: HexColor;
  row: HexColor;
  rowDone: HexColor;
  text: HexColor;
  muted: HexColor;
  accent: HexColor;
  success: HexColor;
}

const LIGHT: Palette = {
  bg: '#FFFFFF',
  row: '#F6F7FB',
  rowDone: '#DCF5E4',
  text: '#141726',
  muted: '#646A80',
  accent: '#4F46E5',
  success: '#16A34A',
};

const DARK: Palette = {
  bg: '#16181F',
  row: '#232633',
  rowDone: '#173B25',
  text: '#F2F3F7',
  muted: '#A3A8BA',
  accent: '#8B85FF',
  success: '#4ADE80',
};

function HabitRow({ row, p }: { row: WidgetHabitRow; p: Palette }) {
  const mark = row.isDone ? '✓' : row.isSkipped ? '–' : '○';
  return (
    <FlexWidget
      clickAction={TOGGLE_HABIT_ACTION}
      clickActionData={{ habitId: row.habitId }}
      accessibilityLabel={`${row.title} ${row.detail}`.trim()}
      style={{
        width: 'match_parent',
        height: 32,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        marginTop: 4,
        borderRadius: 10,
        backgroundColor: row.isDone ? p.rowDone : p.row,
      }}
    >
      <TextWidget
        text={mark}
        style={{ fontSize: 15, fontWeight: 'bold', color: row.isDone ? p.success : p.accent, marginRight: 8 }}
      />
      <FlexWidget style={{ flex: 1 }}>
        <TextWidget text={row.title} maxLines={1} truncate="END" style={{ fontSize: 14, color: p.text }} />
      </FlexWidget>
      {row.detail ? <TextWidget text={row.detail} style={{ fontSize: 12, color: p.muted, marginLeft: 6 }} /> : null}
    </FlexWidget>
  );
}

function Frame({ p, children }: { p: Palette; children: ReactNode }) {
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        flexDirection: 'column',
        padding: 10,
        borderRadius: 18,
        backgroundColor: p.bg,
      }}
    >
      {children}
    </FlexWidget>
  );
}

function TodayWidgetView({ model, p }: { model: TodayWidgetModel; p: Palette }) {
  if (model.kind === 'setup') {
    return (
      <Frame p={p}>
        <FlexWidget clickAction="OPEN_APP" style={{ width: 'match_parent', height: 'match_parent', justifyContent: 'center' }}>
          <TextWidget text="Momentum" style={{ fontSize: 16, fontWeight: 'bold', color: p.text }} />
          <TextWidget text="Tap to set up your habits" style={{ fontSize: 13, color: p.muted }} />
        </FlexWidget>
      </Frame>
    );
  }

  return (
    <Frame p={p}>
      <FlexWidget
        clickAction="OPEN_APP"
        style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}
      >
        <TextWidget text={model.dateLabel} style={{ fontSize: 14, fontWeight: 'bold', color: p.text }} />
        <TextWidget
          text={`${model.percent}%`}
          style={{ fontSize: 14, fontWeight: 'bold', color: model.percent >= 100 ? p.success : p.accent }}
        />
      </FlexWidget>
      {model.rows.length === 0 ? (
        <TextWidget text="Nothing scheduled today 🌿" style={{ fontSize: 13, color: p.muted, marginTop: 8, marginLeft: 4 }} />
      ) : (
        model.rows.map((row) => <HabitRow key={row.habitId} row={row} p={p} />)
      )}
      {model.hiddenCount > 0 ? (
        <TextWidget
          text={`+${model.hiddenCount} more — open app`}
          clickAction="OPEN_APP"
          style={{ fontSize: 12, color: p.muted, marginTop: 4, marginLeft: 4 }}
        />
      ) : null}
    </Frame>
  );
}

/** Light and dark variants; the launcher picks the one matching the system theme. */
export function renderTodayWidget(model: TodayWidgetModel) {
  return { light: <TodayWidgetView model={model} p={LIGHT} />, dark: <TodayWidgetView model={model} p={DARK} /> };
}
