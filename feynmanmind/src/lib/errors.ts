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

const AUTH_MESSAGES: Record<string, TranslationKey> = {
  invalid_credentials: 'auth.invalidCredentials',
  email_not_confirmed: 'auth.emailNotConfirmed',
  user_already_exists: 'auth.userExists',
  email_exists: 'auth.userExists',
  otp_expired: 'auth.invalidCode',
  weak_password: 'auth.passwordTooShort',
  validation_failed: 'auth.invalidEmail',
};

/** Turns any thrown value into a short, translated, user-facing message. */
export function errorMessage(error: unknown, t: Translator): string {
  if (error instanceof ApiError) return t(API_MESSAGES[error.code] ?? 'error.generic');

  if (error && typeof error === 'object') {
    const e = error as { code?: unknown; message?: unknown; name?: unknown; status?: unknown };
    // Supabase Auth errors carry a stable string code.
    if (typeof e.code === 'string' && e.code in AUTH_MESSAGES) return t(AUTH_MESSAGES[e.code]!);
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
