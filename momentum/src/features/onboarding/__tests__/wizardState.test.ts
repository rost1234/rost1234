/** @jest-environment node */
import { presetsForGoal } from '@/domain/presets';
import { initialWizardState, wizardReducer } from '../wizardState';

describe('onboarding wizard', () => {
  it('pre-selects only the first habit of a goal, and more are one tap away', () => {
    const [first, second] = presetsForGoal('focus', 'en');
    const picked = wizardReducer(initialWizardState, { type: 'selectGoal', goal: 'focus' });
    expect(picked.selectedPresetKeys).toEqual([first?.key]);
    const more = wizardReducer(picked, { type: 'togglePreset', key: second?.key ?? '' });
    expect(more.selectedPresetKeys).toEqual([first?.key, second?.key]);
  });
});
