import { ApiError } from '@/api/functions';
import { translate, type Translator } from '@/i18n';
import { errorMessage } from '../errors';

const t = ((key: Parameters<typeof translate>[1]) => translate('en', key)) as Translator;

describe('errorMessage', () => {
  it.each([
    [new ApiError('rate_limited', 'x', 429), "You've hit the hourly limit. Take a short break and try again."],
    [new ApiError('unreadable_pdf', 'x', 422), expect.stringContaining('PDF')],
    [new ApiError('db_error', 'x', 500), 'Something went wrong. Please try again.'],
    [{ code: '23505', message: 'duplicate key value' }, 'An item with this name already exists.'],
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
