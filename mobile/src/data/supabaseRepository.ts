import { getSupabase, requireSupabase } from '@/lib/supabase';
import { AppError, normalizeCode, todayISO, withTimeout } from '@/lib/utils';
import type {
  ActivityEntry,
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
  RewardRedemption,
  Session,
  ShoppingItem,
  WeeklySnapshot,
} from '@/types/models';

import type {
  AppRepository,
  FamilyPatch,
  MemberInput,
  PlannedTaskInput,
  RewardInput,
  TaskInput,
} from './types';

/* ------------------------------------------------------------------ eşleme */

type Row = Record<string, any>;

const mapFamily = (row: Row): Family => ({
  id: row.id,
  name: row.name,
  code: row.code,
  photoUrl: row.photo_url,
  ownerName: row.owner_name,
  createdAt: row.created_at,
  lastResetAt: row.last_reset_at,
  settings: row.settings as FamilySettings,
});

const mapMember = (row: Row): Member => ({
  id: row.id,
  familyId: row.family_id,
  name: row.name,
  role: row.role,
  avatar: row.avatar,
  points: row.points,
  isActive: row.is_active,
  isLinked: row.is_linked,
});

const mapTask = (row: Row): CatalogTask => ({
  id: row.id,
  familyId: row.family_id,
  title: row.title,
  kind: row.kind,
  points: row.points,
  icon: row.icon,
  isActive: row.is_active,
  sortOrder: row.sort_order,
});

const mapPenalty = (row: Row): PenaltyRequest => ({
  id: row.id,
  familyId: row.family_id,
  kind: row.kind === 'task' ? 'task' : 'penalty',
  taskId: row.task_id ?? '',
  taskTitle: row.task_title,
  taskIcon: row.task_icon,
  memberId: row.member_id,
  memberName: row.member_name,
  points: row.points,
  note: row.note,
  status: row.status,
  requestedByName: row.requested_by_name,
  reviewedByName: row.reviewed_by_name,
  createdAt: row.created_at,
  reviewedAt: row.reviewed_at,
});

const mapReward = (row: Row): Reward => ({
  id: row.id,
  familyId: row.family_id,
  title: row.title,
  cost: row.cost,
  description: row.description,
  icon: row.icon,
  isActive: row.is_active,
});

const mapRedemption = (row: Row): RewardRedemption => ({
  id: row.id,
  familyId: row.family_id,
  rewardId: row.reward_id ?? '',
  rewardTitle: row.reward_title,
  rewardIcon: row.reward_icon,
  memberId: row.member_id,
  memberName: row.member_name,
  cost: row.cost,
  createdAt: row.created_at,
});

const mapPlanned = (row: Row): PlannedTask => ({
  id: row.id,
  familyId: row.family_id,
  title: row.title,
  points: row.points,
  kind: row.kind,
  icon: row.icon,
  assignedMemberId: row.assigned_member_id,
  recurrence: row.recurrence,
  weekdays: row.weekdays ?? [],
  dueTime: row.due_time ? String(row.due_time).slice(0, 5) : null,
  startDate: row.start_date,
  requiresApproval: row.requires_approval,
  notify: row.notify,
  isActive: row.is_active,
  lastCompletedDate: row.last_completed_date,
});

const mapActivity = (row: Row): ActivityEntry => ({
  id: row.id,
  familyId: row.family_id,
  memberId: row.member_id,
  memberName: row.member_name,
  title: row.title,
  icon: row.icon,
  delta: row.delta,
  balanceAfter: row.balance_after,
  reason: row.reason,
  actorName: row.actor_name,
  createdAt: row.created_at,
});

const mapShopping = (row: Row): ShoppingItem => ({
  id: row.id,
  familyId: row.family_id,
  title: row.title,
  quantity: row.quantity,
  isDone: row.is_done,
  doneByMemberId: row.done_by_member_id,
  doneByName: row.done_by_name,
  createdAt: row.created_at,
});

const mapSnapshot = (row: Row): WeeklySnapshot => ({
  id: String(row.id),
  weekStart: row.week_start,
  familyId: row.family_id,
  memberId: row.member_id,
  memberName: row.member_name,
  points: row.points,
  rank: row.rank,
});

/* ---------------------------------------------------------------- yardımcı */

function throwIfError(error: unknown): void {
  if (error) throw error;
}

/** RPC sonucu { ok: false, error } döndürdüyse uygulama hatasına çevirir. */
function unwrap(result: unknown): any {
  if (result && typeof result === 'object' && 'ok' in (result as Row) && (result as Row).ok === false) {
    throw new AppError(String((result as Row).error ?? 'UNKNOWN').toUpperCase());
  }
  return result;
}

async function activeSession(): Promise<Session | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;

  const { data: member } = await supabase
    .from('members')
    .select('id, family_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (!member) return null;
  return {
    mode: member.role === 'parent' ? 'parent' : 'member',
    userId: user.id,
    memberId: member.id,
    familyId: member.family_id,
    role: member.role,
  };
}

/** Kullanıcının oturumu yoksa anonim oturum açar (aile üyesi girişi için). */
async function ensureAuth(email?: string, password?: string): Promise<void> {
  const supabase = requireSupabase();
  const { data } = await supabase.auth.getSession();
  if (data.session) return;

  if (email && password) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      if (String(error.message).toLowerCase().includes('already')) {
        const signIn = await supabase.auth.signInWithPassword({ email, password });
        throwIfError(signIn.error);
        return;
      }
      throw error;
    }
    return;
  }

  const { error } = await supabase.auth.signInAnonymously();
  throwIfError(error);
}

async function requireFamilyId(): Promise<string> {
  const session = await activeSession();
  if (!session) throw new AppError('SESSION_EXPIRED');
  return session.familyId;
}

/* --------------------------------------------- Supabase (bulut) deposu */

export const supabaseRepository: AppRepository = {
  mode: 'supabase',

  async getSession() {
    return activeSession();
  },

  async signOut() {
    const supabase = requireSupabase();
    const { data } = await supabase.auth.getSession();
    // Anonim (üye) hesaplar çıkışta tamamen silinir; bir dahaki girişte yeni
    // bir kimlik oluşur. Profili tekrar seçilebilir yapmak için önce ilişiği
    // kaldırıyoruz (bkz. migrations/0004_uye_baglantisini_kaldir.sql).
    if (data.session?.user?.is_anonymous) {
      try {
        await supabase.rpc('unlink_member');
      } catch {
        // Ağ hatası olsa bile çıkış işlemine devam edilir.
      }
    }
    await supabase.auth.signOut();
  },

  async createFamily(input: CreateFamilyInput) {
    const supabase = requireSupabase();
    await ensureAuth(input.email, input.password);

    const { data, error } = await withTimeout(
      supabase.rpc('create_family', {
        p_parent_name: input.parentName,
        p_family_name: input.familyName,
        p_avatar: input.avatar,
      }),
    );
    throwIfError(error);
    const payload = unwrap(data) as { family_id: string; member_id: string; code: string };

    const session = await activeSession();
    if (!session) {
      // Anonim/eksik oturumda bile aile oluştu; üye kaydından oturum kurulur.
      return {
        mode: 'parent',
        userId: '',
        memberId: payload.member_id,
        familyId: payload.family_id,
        role: 'parent',
      } satisfies Session;
    }
    return session;
  },

  async signInParent(email: string, password: string) {
    const supabase = requireSupabase();
    const { error } = await withTimeout(supabase.auth.signInWithPassword({ email, password }));
    throwIfError(error);

    const session = await activeSession();
    if (!session) {
      await supabase.auth.signOut();
      throw new AppError('NO_FAMILY');
    }
    return session;
  },

  async lookupFamilyByCode(code: string) {
    const supabase = requireSupabase();
    await ensureAuth();
    const normalized = normalizeCode(code);
    const { data, error } = await withTimeout(
      supabase.rpc('lookup_family_code', { p_code: normalized }),
    );
    throwIfError(error);
    const payload = unwrap(data) as {
      familyId: string;
      familyName: string;
      members: { id: string; name: string; avatar: string; role: 'parent' | 'child' }[];
    };

    return {
      familyId: payload.familyId,
      familyName: payload.familyName,
      members: (payload.members ?? []).map((m) => ({
        id: m.id,
        familyId: payload.familyId,
        name: m.name,
        role: m.role,
        avatar: m.avatar,
        points: 0,
        isActive: true,
        isLinked: false,
      })),
    } satisfies FamilyLookup;
  },

  async joinFamily(input: JoinFamilyInput) {
    const supabase = requireSupabase();
    await ensureAuth();
    const { data, error } = await withTimeout(
      supabase.rpc('join_family_with_code', {
        p_code: normalizeCode(input.code),
        p_member_id: input.memberId ?? null,
        p_new_member_name: input.newMemberName ?? null,
        p_avatar: input.avatar,
        p_as_parent: input.asParent ?? false,
      }),
    );
    throwIfError(error);
    const payload = unwrap(data) as { memberId: string };

    const session = await activeSession();
    if (session) return session;

    const familyId = await requireFamilyId().catch(() => '');
    return {
      mode: input.asParent ? 'parent' : 'member',
      userId: '',
      memberId: payload.memberId,
      familyId,
      role: input.asParent ? 'parent' : 'child',
    } satisfies Session;
  },

  async loadState() {
    const supabase = requireSupabase();
    const familyId = await requireFamilyId();

    const [family, members, tasks, penalties, rewards, redemptions, planned, activity, shopping, snapshots] =
      await withTimeout(
        Promise.all([
          supabase.from('families').select('*').eq('id', familyId).single(),
          supabase.from('members').select('*').eq('family_id', familyId).eq('is_active', true).order('points', { ascending: false }),
          supabase.from('tasks').select('*').eq('family_id', familyId).order('sort_order'),
          supabase.from('penalty_requests').select('*').eq('family_id', familyId).order('created_at', { ascending: false }).limit(100),
          supabase.from('rewards').select('*').eq('family_id', familyId).order('cost'),
          supabase.from('reward_redemptions').select('*').eq('family_id', familyId).order('created_at', { ascending: false }).limit(50),
          supabase.from('planned_tasks').select('*').eq('family_id', familyId).eq('is_active', true),
          supabase.from('activity_log').select('*').eq('family_id', familyId).order('created_at', { ascending: false }).limit(40),
          supabase.from('shopping_items').select('*').eq('family_id', familyId).order('created_at'),
          supabase.from('weekly_snapshots').select('*').eq('family_id', familyId).order('week_start', { ascending: false }).limit(60),
        ]),
        20000,
      );

    for (const result of [family, members, tasks, penalties, rewards, redemptions, planned, activity, shopping, snapshots]) {
      throwIfError(result.error);
    }

    return {
      family: mapFamily(family.data as Row),
      members: (members.data as Row[]).map(mapMember),
      tasks: (tasks.data as Row[]).map(mapTask),
      penalties: (penalties.data as Row[]).map(mapPenalty),
      rewards: (rewards.data as Row[]).map(mapReward),
      redemptions: (redemptions.data as Row[]).map(mapRedemption),
      plannedTasks: (planned.data as Row[]).map(mapPlanned),
      activity: (activity.data as Row[]).map(mapActivity),
      shopping: (shopping.data as Row[]).map(mapShopping),
      snapshots: (snapshots.data as Row[]).map(mapSnapshot),
    } satisfies FamilyState;
  },

  async updateFamily(patch: FamilyPatch) {
    const supabase = requireSupabase();
    const { error } = await supabase.rpc('update_family', {
      p_name: patch.name ?? null,
      p_photo_url: patch.photoUrl === undefined ? null : (patch.photoUrl ?? ''),
      p_settings: patch.settings ?? null,
    });
    throwIfError(error);
  },

  async rotateCode() {
    const supabase = requireSupabase();
    const { data, error } = await supabase.rpc('rotate_family_code');
    throwIfError(error);
    return String(data);
  },

  async saveTask(input: TaskInput) {
    const supabase = requireSupabase();
    if (input.points <= 0) throw new AppError('POSITIVE_REQUIRED');
    if (input.id) {
      const { error } = await supabase
        .from('tasks')
        .update({ title: input.title, kind: input.kind, points: input.points, icon: input.icon })
        .eq('id', input.id);
      throwIfError(error);
      return;
    }
    const familyId = await requireFamilyId();
    const { data: existing } = await supabase
      .from('tasks')
      .select('sort_order')
      .eq('family_id', familyId)
      .order('sort_order', { ascending: false })
      .limit(1);
    const nextOrder = ((existing?.[0]?.sort_order as number) ?? 0) + 1;
    const { error } = await supabase.from('tasks').insert({
      family_id: familyId,
      title: input.title,
      kind: input.kind,
      points: input.points,
      icon: input.icon,
      sort_order: nextOrder,
    });
    throwIfError(error);
  },

  async deleteTask(id: string) {
    const supabase = requireSupabase();
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    throwIfError(error);
  },

  async completeTask(taskId: string, memberId: string) {
    const supabase = requireSupabase();
    const { data, error } = await supabase.rpc('complete_task', { p_task_id: taskId, p_member_id: memberId });
    throwIfError(error);
    const payload = unwrap(data) as { pending?: boolean } | number | null;
    return { pending: typeof payload === 'object' && payload !== null ? !!payload.pending : false };
  },

  async requestPenalty(taskId: string, memberId: string, note?: string | null) {
    const supabase = requireSupabase();
    const { error } = await supabase.rpc('request_penalty', {
      p_task_id: taskId,
      p_member_id: memberId,
      p_note: note ?? null,
    });
    throwIfError(error);
  },

  async reviewPenalty(requestId: string, approve: boolean) {
    const supabase = requireSupabase();
    const { error } = await supabase.rpc('review_penalty', { p_request_id: requestId, p_approve: approve });
    throwIfError(error);
  },

  async adjustPoints(memberId: string, delta: number, title: string) {
    const supabase = requireSupabase();
    const { error } = await supabase.rpc('adjust_points', {
      p_member_id: memberId,
      p_delta: delta,
      p_title: title,
    });
    throwIfError(error);
  },

  async resetWeekly() {
    const supabase = requireSupabase();
    const { error } = await supabase.rpc('reset_weekly_points');
    throwIfError(error);
  },

  async saveReward(input: RewardInput) {
    const supabase = requireSupabase();
    if (input.cost <= 0) throw new AppError('POSITIVE_REQUIRED');
    if (input.id) {
      const { error } = await supabase
        .from('rewards')
        .update({
          title: input.title,
          cost: input.cost,
          icon: input.icon,
          description: input.description ?? null,
        })
        .eq('id', input.id);
      throwIfError(error);
      return;
    }
    const familyId = await requireFamilyId();
    const { error } = await supabase.from('rewards').insert({
      family_id: familyId,
      title: input.title,
      cost: input.cost,
      icon: input.icon,
      description: input.description ?? null,
    });
    throwIfError(error);
  },

  async deleteReward(id: string) {
    const supabase = requireSupabase();
    const { error } = await supabase.from('rewards').delete().eq('id', id);
    throwIfError(error);
  },

  async redeemReward(rewardId: string, memberId: string) {
    const supabase = requireSupabase();
    const { error } = await supabase.rpc('redeem_reward', {
      p_reward_id: rewardId,
      p_member_id: memberId,
    });
    throwIfError(error);
  },

  async saveMember(input: MemberInput) {
    const supabase = requireSupabase();
    const { error } = await supabase.rpc('save_member', {
      p_id: input.id ?? null,
      p_name: input.name,
      p_role: input.role,
      p_avatar: input.avatar,
    });
    throwIfError(error);
  },

  async deleteMember(id: string) {
    const supabase = requireSupabase();
    const { error } = await supabase.rpc('delete_member', { p_id: id });
    throwIfError(error);
  },

  async forceUnlinkMember(id: string) {
    const supabase = requireSupabase();
    const { error } = await supabase.rpc('force_unlink_member', { p_member_id: id });
    throwIfError(error);
  },

  async savePlannedTask(input: PlannedTaskInput) {
    const supabase = requireSupabase();
    const payload = {
      title: input.title,
      points: input.points,
      kind: input.kind,
      icon: input.icon,
      assigned_member_id: input.assignedMemberId,
      recurrence: input.recurrence,
      weekdays: input.weekdays,
      due_time: input.dueTime,
      start_date: input.startDate,
      requires_approval: input.requiresApproval,
      notify: input.notify,
    };
    if (input.id) {
      const { error } = await supabase.from('planned_tasks').update(payload).eq('id', input.id);
      throwIfError(error);
      return;
    }
    const familyId = await requireFamilyId();
    const { error } = await supabase.from('planned_tasks').insert({ ...payload, family_id: familyId });
    throwIfError(error);
  },

  async deletePlannedTask(id: string) {
    const supabase = requireSupabase();
    const { error } = await supabase.from('planned_tasks').delete().eq('id', id);
    throwIfError(error);
  },

  async completePlannedTask(plannedTaskId: string, memberId: string, date: string) {
    const supabase = requireSupabase();
    const { error } = await supabase.rpc('complete_planned_task', {
      p_planned_task_id: plannedTaskId,
      p_member_id: memberId,
      p_date: date || todayISO(),
    });
    throwIfError(error);
  },

  async addShoppingItem(title: string, quantity?: string | null) {
    const supabase = requireSupabase();
    const familyId = await requireFamilyId();
    const { error } = await supabase.from('shopping_items').insert({
      family_id: familyId,
      title: title.trim(),
      quantity: quantity?.trim() || null,
    });
    throwIfError(error);
  },

  async toggleShoppingItem(id: string, isDone: boolean, memberId?: string | null) {
    const supabase = requireSupabase();
    let doneByName: string | null = null;
    if (isDone && memberId) {
      const { data } = await supabase.from('members').select('name').eq('id', memberId).maybeSingle();
      doneByName = (data?.name as string) ?? null;
    }
    const { error } = await supabase
      .from('shopping_items')
      .update({
        is_done: isDone,
        done_by_member_id: isDone ? (memberId ?? null) : null,
        done_by_name: isDone ? doneByName : null,
      })
      .eq('id', id);
    throwIfError(error);
  },

  async deleteShoppingItem(id: string) {
    const supabase = requireSupabase();
    const { error } = await supabase.from('shopping_items').delete().eq('id', id);
    throwIfError(error);
  },

  async clearDoneShopping() {
    const supabase = requireSupabase();
    const familyId = await requireFamilyId();
    const { error } = await supabase.from('shopping_items').delete().eq('family_id', familyId).eq('is_done', true);
    throwIfError(error);
  },

  async finishShopping(memberId: string | null) {
    const supabase = requireSupabase();
    const { error } = await supabase.rpc('finish_shopping', { p_member_id: memberId });
    throwIfError(error);
  },
};

/** Aile verisi değiştiğinde ekranların yenilenmesi için Supabase kanalları. */
export const REALTIME_TABLES = [
  'members',
  'tasks',
  'rewards',
  'penalty_requests',
  'activity_log',
  'shopping_items',
  'planned_tasks',
  'families',
  'reward_redemptions',
  'weekly_snapshots',
] as const;
