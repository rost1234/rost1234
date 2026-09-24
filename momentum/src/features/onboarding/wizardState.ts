import { presetsForGoal, type GoalId, type HabitPreset, type PresetLanguage } from '@/domain/presets';

export type WizardStep = 1 | 2 | 3;

export interface WizardState {
  step: WizardStep;
  goal: GoalId | null;
  selectedPresetKeys: string[];
  notificationStatus: 'unknown' | 'granted' | 'denied' | 'unavailable';
}

export type WizardAction =
  | { type: 'selectGoal'; goal: GoalId }
  | { type: 'togglePreset'; key: string }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'setNotificationStatus'; status: WizardState['notificationStatus'] };

export const initialWizardState: WizardState = {
  step: 1,
  goal: null,
  selectedPresetKeys: [],
  notificationStatus: 'unknown',
};

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'selectGoal':
      // Changing goal pre-selects all three of its presets.
      return state.goal === action.goal
        ? state
        : { ...state, goal: action.goal, selectedPresetKeys: presetsForGoal(action.goal, 'en').map((p) => p.key) };
    case 'togglePreset': {
      const selected = state.selectedPresetKeys.includes(action.key)
        ? state.selectedPresetKeys.filter((k) => k !== action.key)
        : [...state.selectedPresetKeys, action.key];
      return { ...state, selectedPresetKeys: selected };
    }
    case 'next':
      return canAdvance(state) && state.step < 3 ? { ...state, step: (state.step + 1) as WizardStep } : state;
    case 'back':
      return state.step > 1 ? { ...state, step: (state.step - 1) as WizardStep } : state;
    case 'setNotificationStatus':
      return { ...state, notificationStatus: action.status };
  }
}

export function canAdvance(state: WizardState): boolean {
  switch (state.step) {
    case 1:
      return state.goal !== null;
    case 2:
      return state.selectedPresetKeys.length > 0;
    case 3:
      return true;
  }
}

export function selectedPresets(state: WizardState, lang: PresetLanguage): HabitPreset[] {
  if (!state.goal) return [];
  return presetsForGoal(state.goal, lang).filter((preset) => state.selectedPresetKeys.includes(preset.key));
}
