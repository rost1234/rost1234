import { ApiError, type ApiErrorCode } from '@/api/functions';
import type { TranslationKey, Translator } from '@/i18n';

const API_MESSAGES: Partial<Record<ApiErrorCode, TranslationKey>> = {
  network: 'error.network',
  rate_limited: 'error.rateLimited',
  llm_error: 'error.llm',
  source_too_short: 'error.sourceTooShort',
  unreadable_pdf: 'error.unreadablePdf',
  payload_too_large: 'error.payloadTooLarge',
  not_configured: 'error.aiNotConfigured',
  invalid_input: 'error.invalidInput',
};


/** Turns any thrown value into a short, translated, user-facing message. */
export function errorMessage(error: unknown, t: Translator): string {
  if (error instanceof ApiError) return t(API_MESSAGES[error.code] ?? 'error.generic');

  if (error && typeof error === 'object') {
    const e = error as { code?: unknown; message?: unknown; name?: unknown; status?: unknown };
    // Local store errors (see local/types.ts).
    if (e.code === 'duplicate') return t('error.duplicate');
    if (e.code === 'not_found') return t('error.notFound');
    if (typeof e.message === 'string' && /network request failed|failed to fetch|fetch failed/i.test(e.message)) {
      return t('error.network');
    }
  }
  return t('error.generic');
}
