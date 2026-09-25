import { ApiError, type ApiErrorCode } from '@/api/functions';
import type { TranslationKey, Translator } from '@/i18n';

const API_MESSAGES: Partial<Record<ApiErrorCode, TranslationKey>> = {
  network: 'error.network',
  rate_limited: 'error.rateLimited',
  llm_error: 'error.llm',
  source_too_short: 'error.sourceTooShort',
  unreadable_pdf: 'error.unreadablePdf',
  payload_too_large: 'error.payloadTooLarge',
  not_found: 'error.notFound',
  unauthorized: 'error.unauthorized',
  invalid_input: 'error.invalidInput',
};


/** Turns any thrown value into a short, translated, user-facing message. */
export function errorMessage(error: unknown, t: Translator): string {
  if (error instanceof ApiError) return t(API_MESSAGES[error.code] ?? 'error.generic');

  if (error && typeof error === 'object') {
    const e = error as { code?: unknown; message?: unknown; name?: unknown; status?: unknown };
    // PostgREST: unique violation (e.g. two subjects with the same title).
    if (e.code === '23505') return t('error.duplicate');
    if (e.code === 'PGRST116') return t('error.notFound');
    if (e.status === 401 || e.code === 'PGRST301') return t('error.unauthorized');
    if (typeof e.message === 'string' && /network request failed|failed to fetch|fetch failed/i.test(e.message)) {
      return t('error.network');
    }
  }
  return t('error.generic');
}
