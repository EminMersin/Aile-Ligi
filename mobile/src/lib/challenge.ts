import { PAIR_CHALLENGES, SOLO_CHALLENGES } from '@/constants/challenges';
import { startOfWeek, toISODate } from '@/lib/utils';
import type { Member } from '@/types/models';

export interface WeeklyChallenge {
  /** Aile üyelerinin adları yerleştirilmiş hazır metin. */
  text: string;
  /** Meydan okumaya katılan üyeler (rozet ve avatar gösterimi için). */
  members: Member[];
}

/** Metni 32 bit tohuma çeviren küçük, hızlı hash (FNV-1a). */
function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Tohumlanabilir basit rastgelelik üreteci (mulberry32). */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Haftanın meydan okumasını seçer.
 *
 * Seçim; aile kimliği + hafta başlangıcı ile tohumlandığı için aynı hafta
 * boyunca tüm aile üyeleri aynı görevi görür ve her hafta kendiliğinden
 * değişir (sunucuya kayıt gerekmez). Üye havuzu kimliğe göre sabit sıralanır;
 * böylece puan sıralaması değişse bile görev ortada değişmez.
 *
 * Not: Aile 2+ kişiyse ikili, tek kişiyse tekli havuz kullanılır. Hiç üye
 * yoksa null döner (ekran bu durumda kartı göstermez).
 */
export function weeklyChallenge(
  familyId: string,
  members: Member[],
  weekStart: Date = startOfWeek(),
): WeeklyChallenge | null {
  if (members.length === 0) return null;

  const pool = [...members].sort((a, b) => a.id.localeCompare(b.id));
  const weekKey = toISODate(weekStart);
  const random = mulberry32(hashSeed(`${familyId}|${weekKey}`));

  const label = (member: Member) => member.name;

  /** Belirli bir hafta için görev havuzu sırası (haftaya özel, deterministik). */
  const templateIndex = (key: string, size: number) =>
    Math.floor(mulberry32(hashSeed(`${familyId}|${key}|gorev`))() * size);
  const pickTemplate = (list: readonly string[]) => {
    const previousWeek = new Date(weekStart);
    previousWeek.setDate(previousWeek.getDate() - 7);
    let index = templateIndex(weekKey, list.length);
    // Aynı görev iki hafta üst üste gelmesin: gerekirse bir sonrakini al.
    if (index === templateIndex(toISODate(previousWeek), list.length)) {
      index = (index + 1) % list.length;
    }
    return list[index];
  };

  if (pool.length >= 2) {
    const firstIndex = Math.floor(random() * pool.length);
    let secondIndex = Math.floor(random() * (pool.length - 1));
    if (secondIndex >= firstIndex) secondIndex += 1;

    const first = pool[firstIndex];
    const second = pool[secondIndex];

    return {
      text: pickTemplate(PAIR_CHALLENGES)
        .replace('{a}', label(first))
        .replace('{b}', label(second)),
      members: [first, second],
    };
  }

  const solo = pool[0];
  return {
    text: pickTemplate(SOLO_CHALLENGES).replace('{a}', label(solo)),
    members: [solo],
  };
}
