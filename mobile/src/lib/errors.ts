import { t, type TranslationKey } from '@/i18n';
import { AppError } from './utils';

/** Sunucu ve veritabanından gelen hata kodlarını Türkçe mesaj anahtarına çevirir. */
const MESSAGE_KEYS: Record<string, TranslationKey> = {
  INVALID_CODE: 'error.invalidCode',
  TOO_MANY_ATTEMPTS: 'error.tooManyAttempts',
  NAME_TAKEN: 'error.nameTaken',
  MEMBER_LINKED: 'error.memberLinked',
  NOT_PARENT: 'error.notParent',
  INSUFFICIENT: 'error.insufficient',
  ALREADY_REVIEWED: 'error.alreadyReviewed',
  ALREADY_DONE: 'error.alreadyDone',
  NOT_FOUND: 'error.notFound',
  CANNOT_DELETE_SELF: 'error.cannotDeleteSelf',
  NAME_REQUIRED: 'error.nameRequired',
  POSITIVE_REQUIRED: 'error.positiveRequired',
  NO_ACCOUNT: 'error.noAccount',
  BAD_CREDENTIALS: 'error.badCredentials',
  EMAIL_IN_USE: 'error.emailInUse',
  NO_FAMILY: 'error.noFamily',
  DEMO_CODE_ONLY: 'error.demoCodeOnly',
  SUPABASE_NOT_CONFIGURED: 'error.supabaseNotConfigured',
  NETWORK: 'error.network',
  NOT_AUTHENTICATED: 'error.sessionExpired',
  SESSION_EXPIRED: 'error.sessionExpired',
  UNAUTHORIZED: 'error.unauthorized',
  EMAIL_NOT_CONFIRMED: 'error.emailNotConfirmed',
};

/** Veritabanı mesajındaki kodu yakalayıp uygulama hatasına dönüştürür. */
export function mapError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  const message = String((error as { message?: string })?.message ?? error ?? '');

  for (const code of Object.keys(MESSAGE_KEYS)) {
    if (message.includes(code.toLowerCase()) || message.includes(code)) {
      return new AppError(code);
    }
  }
  if (message.includes('violates check constraint')) return new AppError('POSITIVE_REQUIRED');
  if (message.includes('duplicate key') || message.includes('unique constraint')) {
    return new AppError('NAME_TAKEN');
  }
  if (message.includes('Invalid login credentials')) return new AppError('BAD_CREDENTIALS');
  if (message.includes('Email not confirmed')) return new AppError('EMAIL_NOT_CONFIRMED');
  if (message.includes('already registered')) return new AppError('EMAIL_IN_USE');
  if (message.includes('Network') || message.includes('fetch')) return new AppError('NETWORK');
  if (message.includes('permission denied') || message.includes('row-level security')) {
    return new AppError('UNAUTHORIZED');
  }

  return new AppError('UNKNOWN', message);
}

/** Kullanıcıya gösterilecek Türkçe mesaj. */
export function messageForError(error: unknown): string {
  const appError = mapError(error);
  const key = MESSAGE_KEYS[appError.code];
  return key ? t(key) : t('error.generic');
}
