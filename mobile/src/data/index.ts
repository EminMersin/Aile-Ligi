import { isSupabaseConfigured } from '@/lib/env';

import { demoRepository } from './demoRepository';
import { supabaseRepository } from './supabaseRepository';
import type { AppRepository } from './types';

/**
 * .env içinde Supabase bilgileri varsa bulut deposu, yoksa cihaz içi demo deposu.
 * Ekranlar bu ayrımı bilmez; ikisi de aynı arayüzü uygular.
 */
export const repository: AppRepository = isSupabaseConfigured ? supabaseRepository : demoRepository;
export const isDemoMode = repository.mode === 'demo';

export type { AppRepository, FamilyPatch, MemberInput, PlannedTaskInput, RewardInput, TaskInput } from './types';
