import { MONTH_LONG, WEEKDAY_LONG, WEEKDAY_SHORT } from '@/constants/config';

/** Basit ve benzersiz kimlik üretimi (demo modu için yeterli). */
export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** 6 haneli aile kodu üretir (100000–999999 arası). */
export function generateFamilyCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Uygulamaya özel hata tipi: kod ile birlikte taşınır. */
export class AppError extends Error {
  code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = 'AppError';
    this.code = code;
  }
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Haftanın başlangıcı Pazartesi kabul edilir (Türkiye alışkanlığı). */
export function startOfWeek(date = new Date()): Date {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function formatDateTR(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getDate()} ${MONTH_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDateTimeTR(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${formatDateTR(iso)} ${hh}:${mm}`;
}

/** "11 Eylül haftası" biçiminde hafta etiketi. */
export function weekLabelTR(date = new Date()): string {
  const start = startOfWeek(date);
  return `${MONTH_LONG[start.getMonth()]} ${start.getDate()}`;
}

export function weekdayLong(day: number): string {
  return WEEKDAY_LONG[((day % 7) + 7) % 7];
}

export function weekdayShort(day: number): string {
  return WEEKDAY_SHORT[((day % 7) + 7) % 7];
}

export function formatPoints(points: number): string {
  return new Intl.NumberFormat('tr-TR').format(points);
}

export function formatDelta(delta: number): string {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${formatPoints(delta)}`;
}

/** Göreli zaman: "az önce", "3 sa önce", "dün". */
export function relativeTimeTR(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'az önce';
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'dün';
  if (days < 7) return `${days} gün önce`;
  return formatDateTR(iso);
}

/** Kodu güvenli biçimde normalize eder: boşluk ve harf dışı karakterleri atar. */
export function normalizeCode(input: string): string {
  return input.replace(/\D/g, '').slice(0, 6);
}

export function isEmailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Zaman aşımı olan bir söz (promise) — ağ isteklerinin asılı kalmasını engeller. */
export function withTimeout<T>(thenable: PromiseLike<T>, ms = 12000): Promise<T> {
  return Promise.race<T>([
    Promise.resolve(thenable),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new AppError('NETWORK', 'İstek zaman aşımına uğradı')), ms),
    ),
  ]);
}

/** Puan 0’ın altına inmesin kuralı — tek yerden uygulanır. */
export function clampPoints(current: number, delta: number): number {
  return Math.max(current + delta, 0);
}
