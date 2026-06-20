
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { startOfWeek, startOfMonth, isAfter, parseISO } from 'date-fns';
import type { Pool, Baby, Appointment, MemberCard, Consumption, WaterRecord, CycleRule, PreviewAppointment, GenerationResult } from '@/types';
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
  previewAppointments: PreviewAppointment[];

  setCurrentCycleRule: (rule: CycleRule) => void;

  addAppointment: (appointment: Omit<Appointment, 'id'>) => Appointment;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  cancelAppointment: (id: string) => void;
  completeAppointment: (appointmentId: string, operator: string) => void;

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

  addWaterRecord: (record: Omit<WaterRecord, 'id'>) => WaterRecord;

  addCycleRule: (rule: Omit<CycleRule, 'id'>) => CycleRule;
  updateCycleRule: (id: string, updates: Partial<CycleRule>) => void;
  deleteCycleRule: (id: string) => void;
  setDefaultCycleRule: (id: string) => void;

  previewCycleAppointments: (startDate: string, endDate: string, cycleRuleId: string) => GenerationResult;
  confirmPreviewAppointments: (cycleRuleId: string) => number;
  clearPreview: () => void;

  checkCapacityConflict: (poolId: string, date: string, startTime: string, endTime: string, excludeAppointmentId?: string) => {
    conflict: boolean;
    currentCount: number;
    capacity: number;
    conflictingBabies: { babyId: string; babyName: string }[];
    remainSlots: number;
  };
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
      previewAppointments: [],

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

      completeAppointment: (appointmentId, operator = '前台') => {
        const state = get();
        const appointment = state.appointments.find((a) => a.id === appointmentId);
        if (!appointment || appointment.status !== 'scheduled') return;

        const card = state.memberCards.find((c) => c.babyId === appointment.babyId);
        let consumptionType: 'quota' | 'self-pay' = 'quota';
        let amount = 0;
        let remark = '';
        let cardId: string | undefined;

        if (card && card.remainingQuota > 0) {
          consumptionType = 'quota';
          amount = 0;
          cardId = card.id;
          remark = `次卡扣费 - ${card.cardType}`;
        } else if (card) {
          consumptionType = 'self-pay';
          amount = card.selfPayPrice;
          cardId = card.id;
          remark = `自费消费 - ${appointment.date} ${appointment.startTime}~${appointment.endTime}`;
        } else {
          consumptionType = 'self-pay';
          amount = 88;
          remark = `自费消费 - 无次卡`;
        }

        const newConsumption: Consumption = {
          id: `cons-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          babyId: appointment.babyId,
          appointmentId,
          cardId,
          type: consumptionType,
          amount,
          time: new Date().toISOString().replace('T', ' ').slice(0, 16),
          operator,
          remark,
        };

        set((state) => {
          const newAppointments = state.appointments.map((a) =>
            a.id === appointmentId
              ? { ...a, status: 'completed' as const, consumptionId: newConsumption.id }
              : a
          );

          let newCards = state.memberCards;
          if (consumptionType === 'quota' && card) {
            newCards = state.memberCards.map((c) =>
              c.id === card.id
                ? { ...c, remainingQuota: Math.max(0, c.remainingQuota - 1) }
                : c
            );
          }

          return {
            appointments: newAppointments,
            consumptions: [newConsumption, ...state.consumptions],
            memberCards: newCards,
          };
        });
      },

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

      checkCapacityConflict: (poolId, date, startTime, endTime, excludeAppointmentId) => {
        const state = get();
        const pool = state.pools.find((p) => p.id === poolId);
        const capacity = pool?.capacity || 0;

        const existing = state.appointments.filter(
          (a) =>
            a.poolId === poolId &&
            a.date === date &&
            a.startTime === startTime &&
            a.endTime === endTime &&
            a.status !== 'cancelled' &&
            a.id !== excludeAppointmentId
        );

        const conflictingBabies = existing.map((a) => {
          const baby = state.babies.find((b) => b.id === a.babyId);
          return { babyId: a.babyId, babyName: baby?.name || '未知' };
        });

        return {
          conflict: existing.length >= capacity,
          currentCount: existing.length,
          capacity,
          conflictingBabies,
          remainSlots: Math.max(0, capacity - existing.length),
        };
      },

      previewCycleAppointments: (startDate, endDate, cycleRuleId) => {
        const { babies, appointments, pools, cycleRules } = get();
        const cycleRule = cycleRules.find((r) => r.id === cycleRuleId);
        if (!cycleRule) return { total: 0, added: 0, skipped: 0, conflicts: 0, previews: [] };

        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T23:59:59');
        const existingIds = new Set(
          appointments
            .filter((a) => a.status !== 'cancelled')
            .map((a) => `${a.babyId}-${a.date}-${a.startTime}-${a.endTime}`)
        );

        const previews: PreviewAppointment[] = [];
        let added = 0;
        let skipped = 0;
        let conflictCount = 0;

        const generateDatesForSchedule = (schedule: Baby['fixedSchedule'][number]): Date[] => {
          const dates: Date[] = [];

          if (cycleRule.cycleType === 'weekly') {
            const current = new Date(start);
            while (current <= end) {
              const dayDiff = schedule.dayOfWeek - current.getDay();
              const target = new Date(current);
              target.setDate(target.getDate() + dayDiff);
              if (target >= start && target <= end) {
                dates.push(new Date(target));
              }
              current.setDate(current.getDate() + 7);
            }
          } else {
            let currentMonth = start.getMonth();
            let currentYear = start.getFullYear();
            while (new Date(currentYear, currentMonth, 1) <= end) {
              const dayOfMonth = cycleRule.startDay;
              const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
              const actualDay = Math.min(dayOfMonth, daysInMonth);
              const target = new Date(currentYear, currentMonth, actualDay);

              const scheduleDay = schedule.dayOfWeek;
              let offset = scheduleDay - target.getDay();
              if (offset < 0) offset += 7;
              const scheduleDate = new Date(target);
              scheduleDate.setDate(scheduleDate.getDate() + offset);

              if (scheduleDate >= start && scheduleDate <= end) {
                dates.push(new Date(scheduleDate));
              }

              currentMonth++;
              if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
              }
            }
          }

          return dates;
        };

        babies.forEach((baby) => {
          baby.fixedSchedule?.forEach((schedule) => {
            const dates = generateDatesForSchedule(schedule);
            const pool = pools.find((p) => p.id === schedule.poolId);

            dates.forEach((date) => {
              const dateStr = date.toISOString().split('T')[0];
              const uniqueKey = `${baby.id}-${dateStr}-${schedule.startTime}-${schedule.endTime}`;

              if (existingIds.has(uniqueKey)) {
                skipped++;
                previews.push({
                  babyId: baby.id,
                  poolId: schedule.poolId,
                  date: dateStr,
                  startTime: schedule.startTime,
                  endTime: schedule.endTime,
                  babyName: baby.name,
                  poolName: pool?.name || '未知泳池',
                  reason: 'duplicate',
                });
                return;
              }

              const existingSameSlot = appointments.filter(
                (a) =>
                  a.poolId === schedule.poolId &&
                  a.date === dateStr &&
                  a.startTime === schedule.startTime &&
                  a.endTime === schedule.endTime &&
                  a.status !== 'cancelled'
              );

              const poolCapacity = pool?.capacity || 0;
              if (poolCapacity > 0 && existingSameSlot.length >= poolCapacity) {
                conflictCount++;
                previews.push({
                  babyId: baby.id,
                  poolId: schedule.poolId,
                  date: dateStr,
                  startTime: schedule.startTime,
                  endTime: schedule.endTime,
                  babyName: baby.name,
                  poolName: pool?.name || '未知泳池',
                  reason: 'conflict',
                  conflictCount: existingSameSlot.length,
                  poolCapacity,
                });
                return;
              }

              added++;
              previews.push({
                babyId: baby.id,
                poolId: schedule.poolId,
                date: dateStr,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                babyName: baby.name,
                poolName: pool?.name || '未知泳池',
                reason: 'new',
              });
            });
          });
        });

        const result: GenerationResult = {
          total: previews.length,
          added,
          skipped,
          conflicts: conflictCount,
          previews,
        };

        set({ previewAppointments: previews });
        return result;
      },

      confirmPreviewAppointments: (cycleRuleId) => {
        const state = get();
        const newAppointments: Appointment[] = [];
        const existingIds = new Set(
          state.appointments
            .filter((a) => a.status !== 'cancelled')
            .map((a) => `${a.babyId}-${a.date}-${a.startTime}-${a.endTime}`)
        );

        state.previewAppointments
          .filter((p) => p.reason === 'new')
          .forEach((preview) => {
            const uniqueKey = `${preview.babyId}-${preview.date}-${preview.startTime}-${preview.endTime}`;
            if (existingIds.has(uniqueKey)) return;

            const newApt: Appointment = {
              id: `apt-cycle-${Date.now()}-${preview.babyId}-${preview.date}-${Math.random().toString(36).slice(2, 5)}`,
              babyId: preview.babyId,
              poolId: preview.poolId,
              date: preview.date,
              startTime: preview.startTime,
              endTime: preview.endTime,
              status: 'scheduled',
              cycleRuleId,
              isFromCycle: true,
            };
            newAppointments.push(newApt);
            existingIds.add(uniqueKey);
          });

        set((state) => ({
          appointments: [...state.appointments, ...newAppointments],
          previewAppointments: [],
        }));

        return newAppointments.length;
      },

      clearPreview: () => set({ previewAppointments: [] }),
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
