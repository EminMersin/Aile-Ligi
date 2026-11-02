import Constants from 'expo-constants';
import type { CatalogTask, TaskKind } from '@/types/models';

/** Kapalı/yer tutucu özellikler tek yerden yönetilir. */
export const FEATURES = {
  aiJudge: false,
  plus: false,
  notifications: false,
  familyPhoto: true,
  backup: false,
  recap: false,
  codeSync: false,
} as const;

/** Yönetici kontrolü gerektiren roller. */
export const ADMIN_ROLES = ['parent'] as const;

// Gerçek yapı sürümü app.json'dan okunur (Expo Go ve Play build'inin
// ikisinde de doğru değer); app.json okunamazsa güvenli varsayılana düşer.
export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

/** Üye avatarı olarak kullanılabilecek simgeler. */
export const AVATAR_CHOICES = [
  '👨',
  '👩',
  '👦',
  '👧',
  '🧑',
  '👴',
  '👵',
  '🧒',
  '👶',
  '🐱',
  '🐶',
  '🦊',
  '🐼',
  '🦁',
] as const;

/** Görev/ceza/ödül simgesi seçenekleri. */
export const ICON_CHOICES = [
  '🧹',
  '🧺',
  '🪴',
  '📚',
  '✏️',
  '🍽️',
  '🛏️',
  '🪥',
  '🗑️',
  '🍳',
  '🎸',
  '🏃',
  '🐕',
  '🚗',
  '🛒',
  '🌿',
  '💡',
  '📺',
  '🥊',
  '⏰',
  '🗣️',
  '😤',
  '🤥',
  '🚫',
  '🎁',
  '🎬',
  '🍦',
  '🎮',
  '⚽',
  '🎯',
  '⭐',
  '🏆',
  '🧽',
  '🧼',
  '🧴',
  '🚿',
  '🚽',
  '🧦',
  '👕',
  '👟',
  '🎒',
  '📝',
  '🔬',
  '🧮',
  '🧩',
  '🎨',
  '🎹',
  '🥁',
  '🎤',
  '🚴',
  '🏊',
  '🏀',
  '🏸',
  '🛝',
  '🪁',
  '🎲',
  '🎳',
  '🎟️',
  '🎢',
  '🏕️',
  '🏖️',
  '🍕',
  '🍿',
  '🍰',
  '🍓',
  '🥞',
  '🥤',
  '🧸',
  '🪙',
  '💝',
  '🤝',
  '💬',
  '🙉',
  '😠',
  '📱',
  '🔇',
  '⌛',
  '🚦',
  '💧',
  '🍴',
] as const;

export const WEEKDAY_SHORT = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'] as const;
export const WEEKDAY_LONG = [
  'Pazar',
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
] as const;
export const MONTH_LONG = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
] as const;

type SeedTask = Pick<CatalogTask, 'title' | 'kind' | 'points' | 'icon'>;

/**
 * Aile oluşturulduğunda otomatik eklenen hazır görev ve ceza listesi
 * (referans ekran görüntülerindeki liste).
 */
export const DEFAULT_GAIN_TASKS: SeedTask[] = [
  { title: 'Elektrik süpürgesi', kind: 'gain', points: 20, icon: '🧹' },
  { title: 'Bitkileri sula', kind: 'gain', points: 10, icon: '🪴' },
  { title: 'Çamaşır katla', kind: 'gain', points: 15, icon: '🧺' },
  { title: 'Sınavda mükemmel', kind: 'gain', points: 50, icon: '📝' },
  { title: 'Çöpü çıkar', kind: 'gain', points: 15, icon: '🗑️' },
  { title: 'Yemek yapmaya yardım', kind: 'gain', points: 20, icon: '🍳' },
  { title: '20 dk kitap oku', kind: 'gain', points: 20, icon: '📚' },
  { title: 'Enstrüman çalış', kind: 'gain', points: 25, icon: '🎸' },
  { title: 'Bulaşık yıka', kind: 'gain', points: 15, icon: '🍽️' },
  { title: 'Odanı topla', kind: 'gain', points: 10, icon: '🛏️' },
  { title: 'Dişlerini fırçala', kind: 'gain', points: 5, icon: '🪥' },
  { title: 'Ödevini yap', kind: 'gain', points: 25, icon: '✏️' },
  { title: 'Kardeşine yardım et', kind: 'gain', points: 15, icon: '🤝' },
  { title: 'Spor yap', kind: 'gain', points: 20, icon: '🏃' },
  { title: 'Köpeği gezdir', kind: 'gain', points: 15, icon: '🐕' },
  { title: 'Alışverişe yardım et', kind: 'gain', points: 10, icon: '🛒' },
  { title: 'Bahçe işleri', kind: 'gain', points: 20, icon: '🌿' },
  { title: 'Masayı topla', kind: 'gain', points: 10, icon: '🍴' },
];

export const DEFAULT_PENALTY_TASKS: SeedTask[] = [
  { title: 'Yer dağınık', kind: 'penalty', points: 10, icon: '🧦' },
  { title: 'Çok fazla TV', kind: 'penalty', points: 15, icon: '📺' },
  { title: 'Kavga', kind: 'penalty', points: 25, icon: '🥊' },
  { title: 'Yatağını toplamadı', kind: 'penalty', points: 5, icon: '🛏️' },
  { title: 'Dinlememek', kind: 'penalty', points: 10, icon: '🙉' },
  { title: 'Işıklar açık kaldı', kind: 'penalty', points: 5, icon: '💡' },
  { title: 'Sifonu çekmedi', kind: 'penalty', points: 10, icon: '🚽' },
  { title: 'Yemeğe geç kaldı', kind: 'penalty', points: 15, icon: '⏰' },
  { title: 'Bağırmak', kind: 'penalty', points: 20, icon: '🗣️' },
  { title: 'Ters cevap', kind: 'penalty', points: 15, icon: '😤' },
  { title: 'Kaba davranış', kind: 'penalty', points: 20, icon: '😠' },
  { title: 'Ödevi unuttu', kind: 'penalty', points: 25, icon: '📚' },
  { title: 'Yalan söylemek', kind: 'penalty', points: 30, icon: '🤥' },
  { title: 'Kuralları çiğnedi', kind: 'penalty', points: 30, icon: '🚫' },
];

export const DEFAULT_TASK_SEED: SeedTask[] = [...DEFAULT_GAIN_TASKS, ...DEFAULT_PENALTY_TASKS];

export const KIND_LABEL: Record<TaskKind, string> = {
  gain: 'Puan kazan',
  penalty: 'Cezalar',
};

/** Haftalık sıfırlamada puanların 0’a inmesinden sonra gösterilen varsayılan sıfırlama saati. */
export const DEFAULT_RESET_HOUR = 0;
export const DEFAULT_RESET_DAY = 0;
