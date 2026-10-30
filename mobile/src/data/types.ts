import type {
  ActivityEntry,
  CatalogTask,
  CreateFamilyInput,
  DataMode,
  Family,
  FamilyLookup,
  FamilySettings,
  FamilyState,
  JoinFamilyInput,
  Member,
  MemberRole,
  PenaltyRequest,
  PlannedTask,
  Recurrence,
  Reward,
  RewardRedemption,
  Session,
  ShoppingItem,
  TaskKind,
  WeeklySnapshot,
} from '@/types/models';

/** Demo modunda tüm veriyi tutan yerel kayıt. */
export interface LocalDatabase {
  families: Family[];
  members: Member[];
  tasks: CatalogTask[];
  penalties: PenaltyRequest[];
  rewards: Reward[];
  redemptions: RewardRedemption[];
  plannedTasks: PlannedTask[];
  activity: ActivityEntry[];
  shopping: ShoppingItem[];
  snapshots: WeeklySnapshot[];
  accounts: { userId: string; email: string; password: string; familyId: string }[];
  session: Session | null;
}

export interface TaskInput {
  id?: string;
  title: string;
  kind: TaskKind;
  points: number;
  icon: string;
}

export interface RewardInput {
  id?: string;
  title: string;
  cost: number;
  icon: string;
  description?: string | null;
}

export interface MemberInput {
  id?: string;
  name: string;
  role: MemberRole;
  avatar: string;
}

export interface PlannedTaskInput {
  id?: string;
  title: string;
  points: number;
  kind: TaskKind;
  icon: string;
  assignedMemberId: string | null;
  recurrence: Recurrence;
  weekdays: number[];
  dueTime: string | null;
  startDate: string;
  requiresApproval: boolean;
  notify: boolean;
}

export interface FamilyPatch {
  name?: string;
  photoUrl?: string | null;
  settings?: Partial<FamilySettings>;
}

/**
 * Hem demo (cihaz içi) hem Supabase (bulut) modunun uyguladığı ortak arayüz.
 * Ekranlar yalnızca bu arayüzü tanır.
 */
export interface AppRepository {
  mode: DataMode;

  // --- Oturum ---
  getSession(): Promise<Session | null>;
  signOut(): Promise<void>;
  createFamily(input: CreateFamilyInput): Promise<Session>;
  signInParent(email: string, password: string): Promise<Session>;
  lookupFamilyByCode(code: string): Promise<FamilyLookup>;
  joinFamily(input: JoinFamilyInput): Promise<Session>;

  // --- Veri ---
  loadState(): Promise<FamilyState>;

  // --- Aile ---
  updateFamily(patch: FamilyPatch): Promise<void>;
  rotateCode(): Promise<string>;

  // --- Görev kataloğu ---
  saveTask(input: TaskInput): Promise<void>;
  deleteTask(id: string): Promise<void>;

  // --- Puan hareketleri ---
  completeTask(taskId: string, memberId: string): Promise<{ pending: boolean }>;
  requestPenalty(taskId: string, memberId: string, note?: string | null): Promise<void>;
  reviewPenalty(requestId: string, approve: boolean): Promise<void>;
  adjustPoints(memberId: string, delta: number, title: string): Promise<void>;
  resetWeekly(): Promise<void>;

  // --- Ödüller ---
  saveReward(input: RewardInput): Promise<void>;
  deleteReward(id: string): Promise<void>;
  redeemReward(rewardId: string, memberId: string): Promise<void>;

  // --- Üyeler ---
  saveMember(input: MemberInput): Promise<void>;
  deleteMember(id: string): Promise<void>;
  forceUnlinkMember(id: string): Promise<void>;

  // --- Planlı görevler ---
  savePlannedTask(input: PlannedTaskInput): Promise<void>;
  deletePlannedTask(id: string): Promise<void>;
  completePlannedTask(plannedTaskId: string, memberId: string, date: string): Promise<void>;

  // --- Alışveriş ---
  addShoppingItem(title: string, quantity?: string | null): Promise<void>;
  toggleShoppingItem(id: string, isDone: boolean, memberId?: string | null): Promise<void>;
  deleteShoppingItem(id: string): Promise<void>;
  clearDoneShopping(): Promise<void>;
  finishShopping(memberId: string | null): Promise<void>;
}
