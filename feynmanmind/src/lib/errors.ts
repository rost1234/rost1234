import { ApiError, type ApiErrorCode } from '@/api/functions';
import { ImportError } from '@/content/import';
import type { TranslationKey, Translator } from '@/i18n';

const API_MESSAGES: Partial<Record<ApiErrorCode, TranslationKey>> = {
  network: 'error.network',
  rate_limited: 'error.rateLimited',
  llm_error: 'error.llm',
  source_too_short: 'error.sourceTooShort',
  unreadable_pdf: 'error.unreadablePdf',
  payload_too_large: 'error.payloadTooLarge',
  not_configured: 'error.aiNotConfigured',
  invalid_topic: 'error.invalidTopic',
  invalid_input: 'error.invalidInput',
};


/** Turns any thrown value into a short, translated, user-facing message. */
export function errorMessage(error: unknown, t: Translator): string {
  if (error instanceof ApiError) return t(API_MESSAGES[error.code] ?? 'error.generic');
  if (error instanceof ImportError) {
    const p = error.problem;
    switch (p.code) {
      case 'json':
        return t('import.error.json', { detail: p.detail });
      case 'item_not_object':
        return t('import.error.itemNotObject', { n: p.item });
      case 'missing_field':
        return t('import.error.missingField', { n: p.item, field: p.field });
      case 'bad_key_points':
        return t('import.error.keyPoints', { n: p.item });
      case 'bad_lesson':
        return t('import.error.lesson', { n: p.item, detail: p.detail });
      case 'bad_cards':
        return t('import.error.cards', { n: p.item });
      case 'not_array':
        return t('import.error.notArray');
      default:
        return t('import.error.empty');
    }
  }

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
