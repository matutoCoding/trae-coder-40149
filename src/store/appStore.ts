
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { startOfWeek, startOfMonth, isAfter, parseISO } from 'date-fns';
import type { Pool, Baby, Appointment, MemberCard, Consumption, WaterRecord, CycleRule } from '@/types';
import {
  pools as initialPools,
  babies as initialBabies,
  appointments as initialAppointments,
  memberCards as initialMemberCards,
  consumptions as initialConsumptions,
  waterRecords as initialWaterRecords,
  cycleRules as initialCycleRules,
} from '@/data/mockData';

interface AppState {
  pools: Pool[];
  babies: Baby[];
  appointments: Appointment[];
  memberCards: MemberCard[];
  consumptions: Consumption[];
  waterRecords: WaterRecord[];
  cycleRules: CycleRule[];
  currentCycleRule: CycleRule | null;
  lastAutoResetDate: string | null;

  setCurrentCycleRule: (rule: CycleRule) => void;

  addAppointment: (appointment: Omit<Appointment, 'id'>) => Appointment;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  cancelAppointment: (id: string) => void;

  addBaby: (baby: Omit<Baby, 'id'>) => Baby;
  updateBaby: (id: string, updates: Partial<Baby>) => void;
  deleteBaby: (id: string) => void;
  addBabyFixedSchedule: (babyId: string, schedule: Baby['fixedSchedule'][number]) => void;
  updateBabyFixedSchedule: (babyId: string, index: number, schedule: Baby['fixedSchedule'][number]) => void;
  removeBabyFixedSchedule: (babyId: string, index: number) => void;

  addPool: (pool: Omit<Pool, 'id'>) => Pool;
  updatePool: (id: string, updates: Partial<Pool>) => void;
  deletePool: (id: string) => void;

  addMemberCard: (card: Omit<MemberCard, 'id'>) => MemberCard;
  updateMemberCard: (id: string, updates: Partial<MemberCard>) => void;
  resetQuota: (babyId: string) => void;
  resetAllQuotas: () => void;
  checkAndResetCycleQuotas: () => { weeklyReset: number; monthlyReset: number };
  consumeQuota: (babyId: string, type: 'quota' | 'self-pay', amount: number, operator?: string) => void;

  addWaterRecord: (record: Omit<WaterRecord, 'id'>) => WaterRecord;

  addCycleRule: (rule: Omit<CycleRule, 'id'>) => CycleRule;
  updateCycleRule: (id: string, updates: Partial<CycleRule>) => void;
  deleteCycleRule: (id: string) => void;
  setDefaultCycleRule: (id: string) => void;

  generateCycleAppointments: (startDate: string, endDate: string, cycleRuleId: string) => number;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      pools: initialPools,
      babies: initialBabies,
      appointments: initialAppointments,
      memberCards: initialMemberCards,
      consumptions: initialConsumptions,
      waterRecords: initialWaterRecords,
      cycleRules: initialCycleRules,
      currentCycleRule: initialCycleRules.find((r) => r.isDefault) || null,
      lastAutoResetDate: null,

      setCurrentCycleRule: (rule) => set({ currentCycleRule: rule }),

      addAppointment: (appointment) => {
        const newAppointment: Appointment = {
          ...appointment,
          id: `apt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        };
        set((state) => ({ appointments: [...state.appointments, newAppointment] }));
        return newAppointment;
      },

      updateAppointment: (id, updates) =>
        set((state) => ({
          appointments: state.appointments.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        })),

      deleteAppointment: (id) =>
        set((state) => ({
          appointments: state.appointments.filter((a) => a.id !== id),
        })),

      cancelAppointment: (id) =>
        set((state) => ({
          appointments: state.appointments.map((a) =>
            a.id === id ? { ...a, status: 'cancelled' as const } : a
          ),
        })),

      addBaby: (baby) => {
        const newBaby: Baby = {
          ...baby,
          id: `baby-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        };
        set((state) => ({ babies: [...state.babies, newBaby] }));
        return newBaby;
      },

      updateBaby: (id, updates) =>
        set((state) => ({
          babies: state.babies.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        })),

      deleteBaby: (id) =>
        set((state) => ({
          babies: state.babies.filter((b) => b.id !== id),
          appointments: state.appointments.filter((a) => a.babyId !== id),
          memberCards: state.memberCards.filter((c) => c.babyId !== id),
        })),

      addBabyFixedSchedule: (babyId, schedule) =>
        set((state) => ({
          babies: state.babies.map((b) =>
            b.id === babyId
              ? { ...b, fixedSchedule: [...(b.fixedSchedule || []), schedule] }
              : b
          ),
        })),

      updateBabyFixedSchedule: (babyId, index, schedule) =>
        set((state) => ({
          babies: state.babies.map((b) => {
            if (b.id !== babyId || !b.fixedSchedule) return b;
            const newSchedules = [...b.fixedSchedule];
            newSchedules[index] = schedule;
            return { ...b, fixedSchedule: newSchedules };
          }),
        })),

      removeBabyFixedSchedule: (babyId, index) =>
        set((state) => ({
          babies: state.babies.map((b) => {
            if (b.id !== babyId || !b.fixedSchedule) return b;
            const newSchedules = b.fixedSchedule.filter((_, i) => i !== index);
            return { ...b, fixedSchedule: newSchedules };
          }),
        })),

      addPool: (pool) => {
        const newPool: Pool = {
          ...pool,
          id: `pool-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        };
        set((state) => ({ pools: [...state.pools, newPool] }));
        return newPool;
      },

      updatePool: (id, updates) =>
        set((state) => ({
          pools: state.pools.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),

      deletePool: (id) =>
        set((state) => ({
          pools: state.pools.filter((p) => p.id !== id),
        })),

      addMemberCard: (card) => {
        const newCard: MemberCard = {
          ...card,
          id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        };
        set((state) => ({ memberCards: [...state.memberCards, newCard] }));
        return newCard;
      },

      updateMemberCard: (id, updates) =>
        set((state) => ({
          memberCards: state.memberCards.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      resetQuota: (babyId) =>
        set((state) => ({
          memberCards: state.memberCards.map((c) =>
            c.babyId === babyId
              ? { ...c, remainingQuota: c.totalQuota, lastResetDate: new Date().toISOString().split('T')[0] }
              : c
          ),
        })),

      resetAllQuotas: () =>
        set((state) => ({
          memberCards: state.memberCards.map((c) => ({
            ...c,
            remainingQuota: c.totalQuota,
            lastResetDate: new Date().toISOString().split('T')[0],
          })),
          lastAutoResetDate: new Date().toISOString().split('T')[0],
        })),

      checkAndResetCycleQuotas: () => {
        const state = get();
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        let weeklyReset = 0;
        let monthlyReset = 0;

        const updatedCards = state.memberCards.map((card) => {
          if (!card.lastResetDate) {
            if (card.cycleType === 'weekly') weeklyReset++;
            else monthlyReset++;
            return { ...card, remainingQuota: card.totalQuota, lastResetDate: todayStr };
          }

          const lastReset = parseISO(card.lastResetDate);

          if (card.cycleType === 'weekly') {
            const weekStart = startOfWeek(today, { weekStartsOn: 1 });
            if (isAfter(weekStart, lastReset)) {
              weeklyReset++;
              return { ...card, remainingQuota: card.totalQuota, lastResetDate: todayStr };
            }
          } else {
            const monthStart = startOfMonth(today);
            if (isAfter(monthStart, lastReset)) {
              monthlyReset++;
              return { ...card, remainingQuota: card.totalQuota, lastResetDate: todayStr };
            }
          }

          return card;
        });

        if (weeklyReset > 0 || monthlyReset > 0) {
          set({ memberCards: updatedCards, lastAutoResetDate: todayStr });
        }

        return { weeklyReset, monthlyReset };
      },

      consumeQuota: (babyId, type, amount, operator = '系统') => {
        const state = get();
        const card = state.memberCards.find((c) => c.babyId === babyId);

        if (type === 'quota' && card && card.remainingQuota > 0) {
          set((state) => ({
            memberCards: state.memberCards.map((c) =>
              c.babyId === babyId
                ? { ...c, remainingQuota: Math.max(0, c.remainingQuota - 1) }
                : c
            ),
          }));
        } else if (type === 'quota' && card && card.remainingQuota === 0) {
          type = 'self-pay';
          amount = card.selfPayPrice;
        }

        const newConsumption: Consumption = {
          id: `cons-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          babyId,
          type,
          amount,
          time: new Date().toISOString().replace('T', ' ').slice(0, 16),
          operator,
          remark: type === 'quota' ? '次卡扣费' : '自费消费',
        };

        set((state) => ({
          consumptions: [newConsumption, ...state.consumptions],
        }));
      },

      addWaterRecord: (record) => {
        const newRecord: WaterRecord = {
          ...record,
          id: `water-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        };
        set((state) => ({ waterRecords: [newRecord, ...state.waterRecords] }));
        return newRecord;
      },

      addCycleRule: (rule) => {
        const newRule: CycleRule = {
          ...rule,
          id: `cycle-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        };
        set((state) => ({ cycleRules: [...state.cycleRules, newRule] }));
        return newRule;
      },

      updateCycleRule: (id, updates) =>
        set((state) => ({
          cycleRules: state.cycleRules.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        })),

      deleteCycleRule: (id) =>
        set((state) => ({
          cycleRules: state.cycleRules.filter((r) => r.id !== id),
          currentCycleRule:
            state.currentCycleRule?.id === id ? null : state.currentCycleRule,
        })),

      setDefaultCycleRule: (id) =>
        set((state) => ({
          cycleRules: state.cycleRules.map((r) => ({
            ...r,
            isDefault: r.id === id,
          })),
          currentCycleRule:
            state.cycleRules.find((r) => r.id === id) || state.currentCycleRule,
        })),

      generateCycleAppointments: (startDate, endDate, cycleRuleId) => {
        const { babies, appointments } = get();
        const newAppointments: Appointment[] = [];
        const cycleRule = get().cycleRules.find((r) => r.id === cycleRuleId);

        if (!cycleRule) return 0;

        const start = new Date(startDate);
        const end = new Date(endDate);
        const existingIds = new Set(
          appointments.map((a) => `${a.babyId}-${a.date}-${a.startTime}`)
        );

        babies.forEach((baby) => {
          baby.fixedSchedule?.forEach((schedule) => {
            const current = new Date(start);

            while (current <= end) {
              const dayDiff = schedule.dayOfWeek - current.getDay();
              const targetDate = new Date(current);
              targetDate.setDate(targetDate.getDate() + dayDiff);

              if (targetDate >= start && targetDate <= end) {
                const dateStr = targetDate.toISOString().split('T')[0];
                const uniqueKey = `${baby.id}-${dateStr}-${schedule.startTime}`;

                if (!existingIds.has(uniqueKey)) {
                  existingIds.add(uniqueKey);
                  newAppointments.push({
                    id: `apt-cycle-${Date.now()}-${baby.id}-${dateStr}-${Math.random().toString(36).slice(2, 5)}`,
                    babyId: baby.id,
                    poolId: schedule.poolId,
                    date: dateStr,
                    startTime: schedule.startTime,
                    endTime: schedule.endTime,
                    status: 'scheduled',
                    cycleRuleId,
                    isFromCycle: true,
                  });
                }
              }

              if (cycleRule.cycleType === 'weekly') {
                current.setDate(current.getDate() + 7);
              } else {
                current.setMonth(current.getMonth() + 1);
              }
            }
          });
        });

        set((state) => ({
          appointments: [...state.appointments, ...newAppointments],
        }));

        return newAppointments.length;
      },
    }),
    {
      name: 'baby-swim-store',
      onRehydrateStorage: () => (state) => {
        if (state) {
          setTimeout(() => {
            state.checkAndResetCycleQuotas();
          }, 500);
        }
      },
    }
  )
);
