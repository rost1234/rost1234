import { ApiError } from '@/api/functions';
import { translate, type Translator } from '@/i18n';
import { DuplicateError } from '@/local/types';
import { errorMessage } from '../errors';

const t = ((key: Parameters<typeof translate>[1]) => translate('en', key)) as Translator;

describe('errorMessage', () => {
  it.each([
    [new ApiError('rate_limited', 'x', 429), "You've hit the hourly limit. Take a short break and try again."],
    [new ApiError('unreadable_pdf', 'x', 422), expect.stringContaining('PDF')],
    [new ApiError('internal', 'x', 500), 'Something went wrong. Please try again.'],
    [new DuplicateError(), 'An item with this name already exists.'],
    [new ApiError('not_configured', 'x'), expect.stringContaining('AI features are off')],
    [new TypeError('Network request failed'), 'No connection. Check your internet and try again.'],
    ['weird', 'Something went wrong. Please try again.'],
  ])('%p', (error, expected) => {
    expect(errorMessage(error, t)).toEqual(expected);
  });

  it('marks transient API errors as retryable', () => {
    expect(new ApiError('llm_error', '').retryable).toBe(true);
    expect(new ApiError('invalid_input', '').retryable).toBe(false);
  });
});
