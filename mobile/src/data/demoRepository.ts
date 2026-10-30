import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_TASK_SEED, DEFAULT_RESET_DAY, DEFAULT_RESET_HOUR } from '@/constants/config';
import { AppError, clampPoints, generateFamilyCode, normalizeCode, todayISO, uid } from '@/lib/utils';
import type {
  ActivityEntry,
  ActivityReason,
  CatalogTask,
  CreateFamilyInput,
  Family,
  FamilyLookup,
  FamilySettings,
  FamilyState,
  JoinFamilyInput,
  Member,
  PenaltyRequest,
  PlannedTask,
  Reward,
  Session,
  ShoppingItem,
} from '@/types/models';

import type {
  AppRepository,
  FamilyPatch,
  LocalDatabase,
  MemberInput,
  PlannedTaskInput,
  RewardInput,
  TaskInput,
} from './types';

const STORAGE_KEY = 'aile-ligi-db-v1';

const emptyDb = (): LocalDatabase => ({
  families: [],
  members: [],
  tasks: [],
  penalties: [],
  rewards: [],
  redemptions: [],
  plannedTasks: [],
  activity: [],
  shopping: [],
  snapshots: [],
  accounts: [],
  session: null,
});

export const defaultSettings = (): FamilySettings => ({
  weeklyResetEnabled: false,
  weeklyResetDay: DEFAULT_RESET_DAY,
  weeklyResetHour: DEFAULT_RESET_HOUR,
  aiJudgeEnabled: true,
  aiJudgeStyle: 'funny',
  shoppingPointsEnabled: false,
  shoppingPointsValue: 10,
  theme: 'system',
  soundsEnabled: true,
  notificationsEnabled: false,
  language: 'tr',
});

async function readDb(): Promise<LocalDatabase> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyDb();
  try {
    const parsed = JSON.parse(raw) as Partial<LocalDatabase>;
    return { ...emptyDb(), ...parsed };
  } catch {
    return emptyDb();
  }
}

async function writeDb(db: LocalDatabase): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

/** Oku → değiştir → yaz. Tüm demo işlemleri buradan geçer. */
async function mutate<T>(fn: (db: LocalDatabase) => T): Promise<T> {
  const db = await readDb();
  const result = fn(db);
  await writeDb(db);
  return result;
}

async function requireSession(db: LocalDatabase): Promise<Session> {
  if (!db.session) throw new AppError('SESSION_EXPIRED');
  return db.session;
}

function isParent(db: LocalDatabase): boolean {
  return db.session?.role === 'parent';
}

function memberOf(db: LocalDatabase, memberId: string): Member {
  const member = db.members.find((m) => m.id === memberId);
  if (!member) throw new AppError('NOT_FOUND');
  return member;
}

/** Puanı uygular: 0’ın altına inmez, deftere gerçek düşüş yazılır. */
function applyPoints(
  db: LocalDatabase,
  memberId: string,
  delta: number,
  reason: ActivityReason,
  title: string,
  icon: string,
  actorName: string | null,
): number {
  const member = memberOf(db, memberId);
  const before = member.points;
  const after = clampPoints(member.points, delta);
  member.points = after;
  if (after === before) return after;

  const entry: ActivityEntry = {
    id: uid(),
    familyId: member.familyId,
    memberId: member.id,
    memberName: member.name,
    title,
    icon,
    delta: after - before,
    balanceAfter: after,
    reason,
    actorName,
    createdAt: new Date().toISOString(),
  };
  db.activity.unshift(entry);
  db.activity = db.activity.slice(0, 300);
  // Komut verenin adı oturumdan gelir.
  return after;
}

function actorName(db: LocalDatabase): string | null {
  const session = db.session;
  if (!session) return null;
  const member = db.members.find((m) => m.id === session.memberId);
  return member?.name ?? null;
}

function seedTasks(familyId: string): CatalogTask[] {
  return DEFAULT_TASK_SEED.map((task, index) => ({
    id: uid(),
    familyId,
    title: task.title,
    kind: task.kind,
    points: task.points,
    icon: task.icon,
    isActive: true,
    sortOrder: index,
  }));
}

function toState(db: LocalDatabase, familyId: string): FamilyState {
  const family = db.families.find((f) => f.id === familyId);
  if (!family) throw new AppError('NOT_FOUND');
  const members = db.members
    .filter((m) => m.familyId === familyId && m.isActive)
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, 'tr'));
  return {
    family,
    members,
    tasks: db.tasks.filter((t) => t.familyId === familyId).sort((a, b) => a.sortOrder - b.sortOrder),
    penalties: db.penalties
      .filter((p) => p.familyId === familyId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    rewards: db.rewards.filter((r) => r.familyId === familyId),
    redemptions: db.redemptions
      .filter((r) => r.familyId === familyId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    plannedTasks: db.plannedTasks.filter((p) => p.familyId === familyId),
    activity: db.activity.filter((a) => a.familyId === familyId).slice(0, 40),
    shopping: db.shopping.filter((s) => s.familyId === familyId),
    snapshots: db.snapshots.filter((s) => s.familyId === familyId),
  };
}

/**
 * Demo modu: veriler yalnızca bu cihazda (AsyncStorage) saklanır.
 * Gerçek aile senkronu Supabase modunda çalışır.
 */
export const demoRepository: AppRepository = {
  mode: 'demo',

  async getSession() {
    const db = await readDb();
    return db.session;
  },

  async signOut() {
    await mutate((db) => {
      db.session = null;
    });
  },

  async createFamily(input: CreateFamilyInput) {
    return mutate((db) => {
      const familyId = uid();
      const userId = `demo-${uid()}`;
      let code = generateFamilyCode();
      while (db.families.some((f) => f.code === code)) code = generateFamilyCode();

      const family: Family = {
        id: familyId,
        name: input.familyName.trim(),
        code,
        photoUrl: null,
        ownerName: input.parentName.trim(),
        createdAt: new Date().toISOString(),
        lastResetAt: null,
        settings: defaultSettings(),
      };
      const parent: Member = {
        id: uid(),
        familyId,
        name: input.parentName.trim(),
        role: 'parent',
        avatar: input.avatar,
        points: 0,
        isActive: true,
        isLinked: true,
      };
      db.families.push(family);
      db.members.push(parent);
      db.tasks.push(...seedTasks(familyId));
      if (input.email) {
        db.accounts.push({ userId, email: input.email.trim().toLowerCase(), password: input.password ?? '', familyId });
      }
      const session: Session = {
        mode: 'parent',
        userId,
        memberId: parent.id,
        familyId,
        role: 'parent',
      };
      db.session = session;
      return session;
    });
  },

  async signInParent(email: string, password: string) {
    return mutate((db) => {
      const account = db.accounts.find((a) => a.email === email.trim().toLowerCase());
      if (!account || account.password !== password) throw new AppError('NO_ACCOUNT');
      const parent = db.members.find(
        (m) => m.familyId === account.familyId && m.role === 'parent' && m.isLinked,
      );
      if (!parent) throw new AppError('NOT_FOUND');
      const session: Session = {
        mode: 'parent',
        userId: account.userId,
        memberId: parent.id,
        familyId: account.familyId,
        role: 'parent',
      };
      db.session = session;
      return session;
    });
  },

  async lookupFamilyByCode(code: string) {
    const db = await readDb();
    const normalized = normalizeCode(code);
    const family = db.families.find((f) => f.code === normalized);
    if (!family) {
      // Demo modunda aile yalnızca bu cihazda olduğu için ayrı bir mesaj verilir.
      if (db.families.length === 0) throw new AppError('DEMO_CODE_ONLY');
      throw new AppError('INVALID_CODE');
    }
    const members = db.members.filter((m) => m.familyId === family.id && m.isActive && !m.isLinked);
    return { familyId: family.id, familyName: family.name, members } satisfies FamilyLookup;
  },

  async joinFamily(input: JoinFamilyInput) {
    return mutate((db) => {
      const normalized = normalizeCode(input.code);
      const family = db.families.find((f) => f.code === normalized);
      if (!family) throw new AppError('INVALID_CODE');

      let member: Member | undefined;
      if (input.memberId) {
        member = db.members.find((m) => m.id === input.memberId);
        if (!member) throw new AppError('NOT_FOUND');
        if (member.isLinked) throw new AppError('MEMBER_LINKED');
      } else {
        const name = (input.newMemberName ?? '').trim();
        if (!name) throw new AppError('NAME_REQUIRED');
        if (db.members.some((m) => m.familyId === family.id && m.name.toLowerCase() === name.toLowerCase())) {
          throw new AppError('NAME_TAKEN');
        }
        member = {
          id: uid(),
          familyId: family.id,
          name,
          role: input.asParent ? 'parent' : 'child',
          avatar: input.avatar,
          points: 0,
          isActive: true,
          isLinked: true,
        };
        db.members.push(member);
      }
      member.isLinked = true;
      if (input.asParent) member.role = 'parent';

      const session: Session = {
        mode: member.role === 'parent' ? 'parent' : 'member',
        userId: `demo-${uid()}`,
        memberId: member.id,
        familyId: family.id,
        role: member.role,
      };
      db.session = session;
      return session;
    });
  },

  async loadState() {
    const db = await readDb();
    const session = await requireSession(db);
    return toState(db, session.familyId);
  },

  async updateFamily(patch: FamilyPatch) {
    await mutate((db) => {
      const session = db.session;
      if (!session) throw new AppError('SESSION_EXPIRED');
      const family = db.families.find((f) => f.id === session.familyId);
      if (!family) throw new AppError('NOT_FOUND');
      if (patch.name !== undefined) family.name = patch.name;
      if (patch.photoUrl !== undefined) family.photoUrl = patch.photoUrl === '' ? null : patch.photoUrl;
      if (patch.settings) family.settings = { ...family.settings, ...patch.settings };
    });
  },

  async rotateCode() {
    return mutate((db) => {
      if (!isParent(db)) throw new AppError('NOT_PARENT');
      const session = db.session as Session;
      const family = db.families.find((f) => f.id === session.familyId);
      if (!family) throw new AppError('NOT_FOUND');
      let code = generateFamilyCode();
      while (db.families.some((f) => f.code === code)) code = generateFamilyCode();
      family.code = code;
      return code;
    });
  },

  async saveTask(input: TaskInput) {
    await mutate((db) => {
      if (!isParent(db)) throw new AppError('NOT_PARENT');
      const session = db.session as Session;
      if (input.points <= 0) throw new AppError('POSITIVE_REQUIRED');
      if (input.id) {
        const task = db.tasks.find((t) => t.id === input.id);
        if (!task) throw new AppError('NOT_FOUND');
        Object.assign(task, {
          title: input.title,
          kind: input.kind,
          points: input.points,
          icon: input.icon,
        });
      } else {
        db.tasks.push({
          id: uid(),
          familyId: session.familyId,
          title: input.title,
          kind: input.kind,
          points: input.points,
          icon: input.icon,
          isActive: true,
          sortOrder: db.tasks.filter((t) => t.familyId === session.familyId).length,
        });
      }
    });
  },

  async deleteTask(id: string) {
    await mutate((db) => {
      if (!isParent(db)) throw new AppError('NOT_PARENT');
      db.tasks = db.tasks.filter((t) => t.id !== id);
    });
  },

  async completeTask(taskId: string, memberId: string) {
    return mutate((db) => {
      const task = db.tasks.find((t) => t.id === taskId);
      if (!task) throw new AppError('NOT_FOUND');

      if (isParent(db)) {
        applyPoints(db, memberId, task.points, 'task', task.title, task.icon, actorName(db));
        return { pending: false };
      }

      const member = memberOf(db, memberId);
      const request: PenaltyRequest = {
        id: uid(),
        familyId: task.familyId,
        kind: 'task',
        taskId: task.id,
        taskTitle: task.title,
        taskIcon: task.icon,
        memberId: member.id,
        memberName: member.name,
        points: task.points,
        note: null,
        status: 'pending',
        requestedByName: actorName(db) ?? 'Bir aile ferdi',
        reviewedByName: null,
        createdAt: new Date().toISOString(),
        reviewedAt: null,
      };
      db.penalties.unshift(request);
      return { pending: true };
    });
  },

  async requestPenalty(taskId: string, memberId: string, note?: string | null) {
    await mutate((db) => {
      const task = db.tasks.find((t) => t.id === taskId);
      if (!task) throw new AppError('NOT_FOUND');
      const member = memberOf(db, memberId);
      const request: PenaltyRequest = {
        id: uid(),
        familyId: task.familyId,
        kind: 'penalty',
        taskId: task.id,
        taskTitle: task.title,
        taskIcon: task.icon,
        memberId: member.id,
        memberName: member.name,
        points: task.points,
        note: note ?? null,
        status: 'pending',
        requestedByName: actorName(db) ?? 'Bir aile ferdi',
        reviewedByName: null,
        createdAt: new Date().toISOString(),
        reviewedAt: null,
      };
      db.penalties.unshift(request);
    });
  },

  async reviewPenalty(requestId: string, approve: boolean) {
    await mutate((db) => {
      if (!isParent(db)) throw new AppError('NOT_PARENT');
      const request = db.penalties.find((p) => p.id === requestId);
      if (!request) throw new AppError('NOT_FOUND');
      if (request.status !== 'pending') throw new AppError('ALREADY_REVIEWED');
      request.status = approve ? 'approved' : 'rejected';
      request.reviewedAt = new Date().toISOString();
      request.reviewedByName = actorName(db);
      if (approve) {
        const sign = request.kind === 'task' ? 1 : -1;
        applyPoints(
          db,
          request.memberId,
          sign * request.points,
          request.kind === 'task' ? 'task' : 'penalty',
          request.taskTitle,
          request.taskIcon,
          actorName(db),
        );
      }
    });
  },

  async adjustPoints(memberId: string, delta: number, title: string) {
    await mutate((db) => {
      if (!isParent(db)) throw new AppError('NOT_PARENT');
      applyPoints(db, memberId, delta, 'manual', title, '⭐', actorName(db));
    });
  },

  async resetWeekly() {
    await mutate((db) => {
      if (!isParent(db)) throw new AppError('NOT_PARENT');
      const session = db.session as Session;
      const family = db.families.find((f) => f.id === session.familyId);
      if (!family) throw new AppError('NOT_FOUND');
      const weekStart = todayISO();
      const members = db.members
        .filter((m) => m.familyId === family.id && m.isActive)
        .sort((a, b) => b.points - a.points);
      members.forEach((member, index) => {
        if (member.points > 0) {
          db.snapshots.push({
            id: `${weekStart}-${member.id}-${Date.now()}-${index}`,
            weekStart,
            familyId: family.id,
            memberId: member.id,
            memberName: member.name,
            points: member.points,
            rank: index + 1,
          });
        }
        member.points = 0;
        db.activity.unshift({
          id: uid(),
          familyId: family.id,
          memberId: member.id,
          memberName: member.name,
          title: 'Haftalık sıfırlama',
          icon: '🔄',
          delta: 0,
          balanceAfter: 0,
          reason: 'weekly_reset',
          actorName: actorName(db),
          createdAt: new Date().toISOString(),
        });
      });
      family.lastResetAt = new Date().toISOString();
    });
  },

  async saveReward(input: RewardInput) {
    await mutate((db) => {
      if (!isParent(db)) throw new AppError('NOT_PARENT');
      const session = db.session as Session;
      if (input.cost <= 0) throw new AppError('POSITIVE_REQUIRED');
      if (input.id) {
        const reward = db.rewards.find((r) => r.id === input.id);
        if (!reward) throw new AppError('NOT_FOUND');
        Object.assign(reward, {
          title: input.title,
          cost: input.cost,
          icon: input.icon,
          description: input.description ?? null,
        });
      } else {
        const reward: Reward = {
          id: uid(),
          familyId: session.familyId,
          title: input.title,
          cost: input.cost,
          icon: input.icon,
          description: input.description ?? null,
          isActive: true,
        };
        db.rewards.push(reward);
      }
    });
  },

  async deleteReward(id: string) {
    await mutate((db) => {
      if (!isParent(db)) throw new AppError('NOT_PARENT');
      db.rewards = db.rewards.filter((r) => r.id !== id);
    });
  },

  async redeemReward(rewardId: string, memberId: string) {
    await mutate((db) => {
      const reward = db.rewards.find((r) => r.id === rewardId);
      if (!reward) throw new AppError('NOT_FOUND');
      const member = memberOf(db, memberId);
      if (member.points < reward.cost) throw new AppError('INSUFFICIENT');
      db.redemptions.push({
        id: uid(),
        familyId: member.familyId,
        rewardId: reward.id,
        rewardTitle: reward.title,
        rewardIcon: reward.icon,
        memberId: member.id,
        memberName: member.name,
        cost: reward.cost,
        createdAt: new Date().toISOString(),
      });
      applyPoints(db, memberId, -reward.cost, 'reward', reward.title, reward.icon, actorName(db));
    });
  },

  async saveMember(input: MemberInput) {
    await mutate((db) => {
      if (!isParent(db)) throw new AppError('NOT_PARENT');
      const session = db.session as Session;
      const name = input.name.trim();
      if (!name) throw new AppError('NAME_REQUIRED');
      const duplicate = db.members.some(
        (m) =>
          m.familyId === session.familyId &&
          m.id !== input.id &&
          m.name.toLowerCase() === name.toLowerCase(),
      );
      if (duplicate) throw new AppError('NAME_TAKEN');
      if (input.id) {
        const member = memberOf(db, input.id);
        member.name = name;
        member.role = input.role;
        member.avatar = input.avatar;
      } else {
        db.members.push({
          id: uid(),
          familyId: session.familyId,
          name,
          role: input.role,
          avatar: input.avatar,
          points: 0,
          isActive: true,
          isLinked: false,
        });
      }
    });
  },

  async deleteMember(id: string) {
    await mutate((db) => {
      if (!isParent(db)) throw new AppError('NOT_PARENT');
      const session = db.session as Session;
      if (session.memberId === id) throw new AppError('CANNOT_DELETE_SELF');
      db.members = db.members.filter((m) => m.id !== id);
      db.penalties = db.penalties.filter((p) => p.memberId !== id);
    });
  },

  async forceUnlinkMember(id: string) {
    await mutate((db) => {
      if (!isParent(db)) throw new AppError('NOT_PARENT');
      const member = db.members.find((m) => m.id === id);
      if (!member) throw new AppError('NOT_FOUND');
      if (member.role === 'parent') throw new AppError('NOT_PARENT');
      member.isLinked = false;
    });
  },

  async savePlannedTask(input: PlannedTaskInput) {
    await mutate((db) => {
      if (!isParent(db)) throw new AppError('NOT_PARENT');
      const session = db.session as Session;
      if (input.id) {
        const task = db.plannedTasks.find((t) => t.id === input.id);
        if (!task) throw new AppError('NOT_FOUND');
        Object.assign(task, { ...input, id: task.id, familyId: task.familyId, isActive: true });
      } else {
        const task: PlannedTask = {
          id: uid(),
          familyId: session.familyId,
          title: input.title,
          points: input.points,
          kind: input.kind,
          icon: input.icon,
          assignedMemberId: input.assignedMemberId,
          recurrence: input.recurrence,
          weekdays: input.weekdays,
          dueTime: input.dueTime,
          startDate: input.startDate,
          requiresApproval: input.requiresApproval,
          notify: input.notify,
          isActive: true,
          lastCompletedDate: null,
        };
        db.plannedTasks.push(task);
      }
    });
  },

  async deletePlannedTask(id: string) {
    await mutate((db) => {
      if (!isParent(db)) throw new AppError('NOT_PARENT');
      db.plannedTasks = db.plannedTasks.filter((t) => t.id !== id);
    });
  },

  async completePlannedTask(plannedTaskId: string, memberId: string, date: string) {
    await mutate((db) => {
      const task = db.plannedTasks.find((t) => t.id === plannedTaskId);
      if (!task) throw new AppError('NOT_FOUND');
      if (task.lastCompletedDate === date) throw new AppError('ALREADY_DONE');
      // Ceza türündeki planlı görev puan DÜŞÜRÜR, kazanç türü ekler.
      applyPoints(
        db,
        memberId,
        task.kind === 'penalty' ? -task.points : task.points,
        task.kind === 'penalty' ? 'penalty' : 'task',
        task.title,
        task.icon,
        actorName(db),
      );
      task.lastCompletedDate = date;
    });
  },

  async addShoppingItem(title: string, quantity?: string | null) {
    await mutate((db) => {
      const session = awaitSessionSync(db);
      const item: ShoppingItem = {
        id: uid(),
        familyId: session.familyId,
        title: title.trim(),
        quantity: quantity?.trim() || null,
        isDone: false,
        doneByMemberId: null,
        doneByName: null,
        createdAt: new Date().toISOString(),
      };
      db.shopping.push(item);
    });
  },

  async toggleShoppingItem(id: string, isDone: boolean, memberId?: string | null) {
    await mutate((db) => {
      const item = db.shopping.find((s) => s.id === id);
      if (!item) throw new AppError('NOT_FOUND');
      item.isDone = isDone;
      const member = memberId ? db.members.find((m) => m.id === memberId) : undefined;
      item.doneByMemberId = isDone ? (member?.id ?? null) : null;
      item.doneByName = isDone ? (member?.name ?? null) : null;
    });
  },

  async deleteShoppingItem(id: string) {
    await mutate((db) => {
      db.shopping = db.shopping.filter((s) => s.id !== id);
    });
  },

  async clearDoneShopping() {
    await mutate((db) => {
      const session = awaitSessionSync(db);
      db.shopping = db.shopping.filter((s) => !(s.familyId === session.familyId && s.isDone));
    });
  },

  async finishShopping(memberId: string | null) {
    await mutate((db) => {
      const session = awaitSessionSync(db);
      const family = db.families.find((f) => f.id === session.familyId);
      if (!family) throw new AppError('NOT_FOUND');
      if (memberId && family.settings.shoppingPointsEnabled) {
        applyPoints(
          db,
          memberId,
          family.settings.shoppingPointsValue,
          'shopping',
          'Alışveriş tamamlandı',
          '🛒',
          actorName(db),
        );
      }
      db.shopping = db.shopping.filter((s) => s.familyId !== session.familyId);
    });
  },
};

function awaitSessionSync(db: LocalDatabase): Session {
  if (!db.session) throw new AppError('SESSION_EXPIRED');
  return db.session;
}

export { STORAGE_KEY as DEMO_STORAGE_KEY };
