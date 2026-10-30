/** Uygulama genelinde kullanılan veri tipleri. */

export type MemberRole = 'parent' | 'child';
export type TaskKind = 'gain' | 'penalty';
export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';
export type ActivityReason = 'task' | 'penalty' | 'reward' | 'manual' | 'weekly_reset' | 'shopping';
export type AiJudgeStyle = 'funny' | 'strict' | 'chaos';
export type ThemeChoice = 'system' | 'light';
export type DataMode = 'demo' | 'supabase';

export interface FamilySettings {
  weeklyResetEnabled: boolean;
  /** 0 = Pazar, 1 = Pazartesi ... 6 = Cumartesi */
  weeklyResetDay: number;
  weeklyResetHour: number;
  aiJudgeEnabled: boolean;
  aiJudgeStyle: AiJudgeStyle;
  shoppingPointsEnabled: boolean;
  shoppingPointsValue: number;
  theme: ThemeChoice;
  soundsEnabled: boolean;
  notificationsEnabled: boolean;
  language: 'tr';
}

export interface Family {
  id: string;
  name: string;
  code: string;
  photoUrl: string | null;
  ownerName: string;
  createdAt: string;
  lastResetAt: string | null;
  settings: FamilySettings;
}

export interface Member {
  id: string;
  familyId: string;
  name: string;
  role: MemberRole;
  avatar: string;
  points: number;
  isActive: boolean;
  /** Üye bir cihaza bağlandı mı? (kod ile giriş yaptı mı) */
  isLinked: boolean;
}

export interface CatalogTask {
  id: string;
  familyId: string;
  title: string;
  kind: TaskKind;
  /** Her zaman pozitif; cezalarda da mutlak değerdir. */
  points: number;
  icon: string;
  isActive: boolean;
  sortOrder: number;
}

export interface PenaltyRequest {
  id: string;
  familyId: string;
  /** 'penalty': onaylanınca puan düşer. 'task': onaylanınca puan eklenir (üyenin kendi kendine verdiği görev puanı). */
  kind: 'penalty' | 'task';
  taskId: string;
  taskTitle: string;
  taskIcon: string;
  /** Cezayı/puanı alan üye. */
  memberId: string;
  memberName: string;
  points: number;
  note: string | null;
  status: RequestStatus;
  requestedByName: string;
  reviewedByName: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export interface Reward {
  id: string;
  familyId: string;
  title: string;
  cost: number;
  description: string | null;
  icon: string;
  isActive: boolean;
}

export interface RewardRedemption {
  id: string;
  familyId: string;
  rewardId: string;
  rewardTitle: string;
  rewardIcon: string;
  memberId: string;
  memberName: string;
  cost: number;
  createdAt: string;
}

export interface PlannedTask {
  id: string;
  familyId: string;
  title: string;
  points: number;
  kind: TaskKind;
  icon: string;
  assignedMemberId: string | null;
  recurrence: Recurrence;
  /** 0 = Pazar ... 6 = Cumartesi (haftalık tekrar için) */
  weekdays: number[];
  /** "18:30" biçiminde */
  dueTime: string | null;
  startDate: string;
  requiresApproval: boolean;
  notify: boolean;
  isActive: boolean;
  /** Son tamamlanma tarihi (YYYY-MM-DD) */
  lastCompletedDate?: string | null;
}

export interface ActivityEntry {
  id: string;
  familyId: string;
  memberId: string | null;
  memberName: string | null;
  title: string;
  icon: string;
  /** Gerçekleşen değişim: +20 / -10 */
  delta: number;
  balanceAfter: number;
  reason: ActivityReason;
  actorName: string | null;
  createdAt: string;
}

export interface ShoppingItem {
  id: string;
  familyId: string;
  title: string;
  quantity: string | null;
  isDone: boolean;
  doneByMemberId: string | null;
  doneByName: string | null;
  createdAt: string;
}

export interface WeeklySnapshot {
  /** Sıfırlama kaydının benzersiz kimliği (React anahtarı için zorunlu). */
  id: string;
  weekStart: string;
  familyId: string;
  memberId: string;
  memberName: string;
  points: number;
  rank: number;
}

/** Cihazdaki oturum bilgisi. */
export interface Session {
  mode: 'parent' | 'member';
  userId: string;
  memberId: string;
  familyId: string;
  role: MemberRole;
}

/** Ekranların ihtiyaç duyduğu tüm aile verisi. */
export interface FamilyState {
  family: Family;
  members: Member[];
  tasks: CatalogTask[];
  penalties: PenaltyRequest[];
  rewards: Reward[];
  redemptions: RewardRedemption[];
  plannedTasks: PlannedTask[];
  activity: ActivityEntry[];
  shopping: ShoppingItem[];
  snapshots: WeeklySnapshot[];
}

export interface CreateFamilyInput {
  parentName: string;
  familyName: string;
  email?: string;
  password?: string;
  avatar: string;
}

export interface JoinFamilyInput {
  code: string;
  memberId?: string;
  newMemberName?: string;
  avatar: string;
  asParent?: boolean;
}

export interface FamilyLookup {
  familyId: string;
  familyName: string;
  members: Member[];
}
