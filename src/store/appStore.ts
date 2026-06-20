
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { startOfWeek, startOfMonth, isAfter, parseISO } from 'date-fns';
import type {
  Pool,
  Baby,
  Appointment,
  MemberCard,
  Consumption,
  WaterRecord,
  CycleRule,
  PreviewAppointment,
  GenerationResult,
  SettlementForm,
  OverlappingAppointment,
} from '@/types';
import {
  pools as initialPools,
  babies as initialBabies,
  appointments as initialAppointments,
  memberCards as initialMemberCards,
  consumptions as initialConsumptions,
  waterRecords as initialWaterRecords,
  cycleRules as initialCycleRules,
} from '@/data/mockData';

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const isOverlapping = (
  s1: string,
  e1: string,
  s2: string,
  e2: string
): boolean => {
  const start1 = timeToMinutes(s1);
  const end1 = timeToMinutes(e1);
  const start2 = timeToMinutes(s2);
  const end2 = timeToMinutes(e2);
  return start1 < end2 && start2 < end1;
};

const normalizeAppointments = (appointments: Appointment[]): Appointment[] => {
  return appointments.map((apt) => ({
    ...apt,
    isWaitlist: apt.isWaitlist ?? false,
  }));
};

const initialAppointmentsNormalized = normalizeAppointments(initialAppointments);

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
  waitlistNotifications: { appointmentId: string; babyName: string; poolName: string; date: string }[];

  setCurrentCycleRule: (rule: CycleRule) => void;
  clearWaitlistNotifications: () => void;

  addAppointment: (appointment: Omit<Appointment, 'id' | 'isWaitlist'> & { isWaitlist?: boolean }) => Appointment;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  cancelAppointment: (id: string) => { promoted: Appointment[] | null };
  settleAppointment: (form: SettlementForm) => { success: boolean; message: string };

  addToWaitlist: (apt: Omit<Appointment, 'id' | 'isWaitlist' | 'waitlistPosition'>) => Appointment;
  removeFromWaitlist: (appointmentId: string) => void;
  promoteWaitlistToAppointment: (waitlistId: string) => Appointment | null;
  tryPromoteFirstWaitlist: (poolId: string, date: string, startTime: string, endTime: string) => Appointment | null;

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

  checkCapacityConflict: (
    poolId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: string,
    excludeWaitlist?: boolean
  ) => {
    conflict: boolean;
    currentCount: number;
    capacity: number;
    conflictingBabies: { babyId: string; babyName: string }[];
    remainSlots: number;
    overlappingAppointments: OverlappingAppointment[];
  };

  getOverlappingAppointments: (
    poolId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: string
  ) => OverlappingAppointment[];

  getWaitlistPosition: (poolId: string, date: string, startTime: string, endTime: string) => number;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      pools: initialPools,
      babies: initialBabies,
      appointments: initialAppointmentsNormalized,
      memberCards: initialMemberCards,
      consumptions: initialConsumptions,
      waterRecords: initialWaterRecords,
      cycleRules: initialCycleRules,
      currentCycleRule: initialCycleRules.find((r) => r.isDefault) || null,
      lastAutoResetDate: null,
      previewAppointments: [],
      waitlistNotifications: [],

      setCurrentCycleRule: (rule) => set({ currentCycleRule: rule }),
      clearWaitlistNotifications: () => set({ waitlistNotifications: [] }),

      getOverlappingAppointments: (poolId, date, startTime, endTime, excludeAppointmentId) => {
        const { appointments, babies } = get();
        return appointments
          .filter(
            (a) =>
              a.poolId === poolId &&
              a.date === date &&
              a.status !== 'cancelled' &&
              !a.isWaitlist &&
              a.id !== excludeAppointmentId &&
              isOverlapping(a.startTime, a.endTime, startTime, endTime)
          )
          .map((a) => {
            const baby = babies.find((b) => b.id === a.babyId);
            return {
              id: a.id,
              babyId: a.babyId,
              babyName: baby?.name || '未知',
              startTime: a.startTime,
              endTime: a.endTime,
            };
          });
      },

      getWaitlistPosition: (poolId, date, startTime, endTime) => {
        const { appointments } = get();
        const waitlistCount = appointments.filter(
          (a) =>
            a.poolId === poolId &&
            a.date === date &&
            a.status !== 'cancelled' &&
            a.isWaitlist &&
            isOverlapping(a.startTime, a.endTime, startTime, endTime)
        ).length;
        return waitlistCount + 1;
      },

      checkCapacityConflict: (poolId, date, startTime, endTime, excludeAppointmentId, excludeWaitlist = false) => {
        const { pools } = get();
        const pool = pools.find((p) => p.id === poolId);
        const capacity = pool?.capacity || 0;

        const overlapping = get().getOverlappingAppointments(poolId, date, startTime, endTime, excludeAppointmentId);

        const conflictingBabies = overlapping.map((o) => ({
          babyId: o.babyId,
          babyName: o.babyName,
        }));

        return {
          conflict: overlapping.length >= capacity,
          currentCount: overlapping.length,
          capacity,
          conflictingBabies,
          remainSlots: Math.max(0, capacity - overlapping.length),
          overlappingAppointments: overlapping,
        };
      },

      addAppointment: (appointment) => {
        const newAppointment: Appointment = {
          ...appointment,
          id: `apt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          isWaitlist: appointment.isWaitlist ?? false,
        };
        set((state) => ({ appointments: [...state.appointments, newAppointment] }));
        return newAppointment;
      },

      updateAppointment: (id, updates) =>
        set((state) => ({
          appointments: state.appointments.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),

      deleteAppointment: (id) =>
        set((state) => ({
          appointments: state.appointments.filter((a) => a.id !== id),
        })),

      addToWaitlist: (apt) => {
        const position = get().getWaitlistPosition(apt.poolId, apt.date, apt.startTime, apt.endTime);
        const newApt: Appointment = {
          ...apt,
          id: `wait-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          isWaitlist: true,
          waitlistPosition: position,
          status: 'scheduled',
        };
        set((state) => ({ appointments: [...state.appointments, newApt] }));
        return newApt;
      },

      removeFromWaitlist: (appointmentId) =>
        set((state) => ({
          appointments: state.appointments.filter((a) => a.id !== appointmentId),
        })),

      promoteWaitlistToAppointment: (waitlistId) => {
        const state = get();
        const waitlist = state.appointments.find((a) => a.id === waitlistId && a.isWaitlist);
        if (!waitlist) return null;

        const check = state.checkCapacityConflict(
          waitlist.poolId,
          waitlist.date,
          waitlist.startTime,
          waitlist.endTime,
          waitlistId
        );
        if (check.conflict) return null;

        const promoted: Appointment = {
          ...waitlist,
          isWaitlist: false,
          waitlistPosition: undefined,
        };

        set((s) => ({
          appointments: s.appointments.map((a) => (a.id === waitlistId ? promoted : a)),
        }));

        return promoted;
      },

      tryPromoteFirstWaitlist: (poolId, date, startTime, endTime) => {
        const state = get();
        const overlappingWaitlists = state.appointments
          .filter(
            (a) =>
              a.poolId === poolId &&
              a.date === date &&
              a.status !== 'cancelled' &&
              a.isWaitlist &&
              isOverlapping(a.startTime, a.endTime, startTime, endTime)
          )
          .sort((a, b) => (a.waitlistPosition || 999) - (b.waitlistPosition || 999));

        if (overlappingWaitlists.length === 0) return null;

        const first = overlappingWaitlists[0];
        const promoted = get().promoteWaitlistToAppointment(first.id);

        if (promoted) {
          const baby = state.babies.find((b) => b.id === promoted.babyId);
          const pool = state.pools.find((p) => p.id === promoted.poolId);
          set((s) => ({
            waitlistNotifications: [
              ...s.waitlistNotifications,
              {
                appointmentId: promoted.id,
                babyName: baby?.name || '未知',
                poolName: pool?.name || '未知泳池',
                date: promoted.date,
              },
            ],
          }));
        }

        return promoted;
      },

      cancelAppointment: (id) => {
        const state = get();
        const apt = state.appointments.find((a) => a.id === id);
        if (!apt) return { promoted: null };

        set((s) => ({
          appointments: s.appointments.map((a) =>
            a.id === id ? { ...a, status: 'cancelled' as const } : a
          ),
        }));

        if (apt.isWaitlist) {
          return { promoted: null };
        }

        const promoted = get().tryPromoteFirstWaitlist(
          apt.poolId,
          apt.date,
          apt.startTime,
          apt.endTime
        );

        return { promoted: promoted ? [promoted] : null };
      },

      settleAppointment: (form) => {
        const state = get();
        const appointment = state.appointments.find((a) => a.id === form.appointmentId);
        if (!appointment || appointment.status !== 'scheduled') {
          return { success: false, message: '预约状态无效' };
        }

        let card: MemberCard | undefined;
        if (form.paymentType === 'quota' && form.cardId) {
          card = state.memberCards.find((c) => c.id === form.cardId && c.babyId === appointment.babyId);
          if (!card) {
            return { success: false, message: '所选次卡无效' };
          }
          if (card.remainingQuota <= 0) {
            return { success: false, message: '该次卡剩余额度不足' };
          }
        }

        const baby = state.babies.find((b) => b.id === appointment.babyId);
        const pool = state.pools.find((p) => p.id === appointment.poolId);

        let consumptionType: 'quota' | 'self-pay' = form.paymentType;
        let amount = form.selfPayAmount;
        let cardId: string | undefined;
        let remark = '';

        if (consumptionType === 'quota' && card) {
          cardId = card.id;
          amount = 0;
          remark = `次卡扣费 - ${card.cardType}（${baby?.name}）`;
        } else {
          cardId = form.cardId || undefined;
          remark = `自费消费 - ${pool?.name} ${appointment.date} ${appointment.startTime}~${appointment.endTime}`;
        }

        const newConsumption: Consumption = {
          id: `cons-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          babyId: appointment.babyId,
          appointmentId: form.appointmentId,
          cardId,
          type: consumptionType,
          amount,
          time: new Date().toISOString().replace('T', ' ').slice(0, 16),
          operator: form.operator,
          remark,
          isFromWaitlist: appointment.isWaitlist,
        };

        set((s) => {
          const newAppointments = s.appointments.map((a) =>
            a.id === form.appointmentId
              ? { ...a, status: 'completed' as const, consumptionId: newConsumption.id, memberCardId: cardId }
              : a
          );

          let newCards = s.memberCards;
          if (consumptionType === 'quota' && card) {
            newCards = s.memberCards.map((c) =>
              c.id === card.id
                ? { ...c, remainingQuota: Math.max(0, c.remainingQuota - 1) }
                : c
            );
          }

          return {
            appointments: newAppointments,
            consumptions: [newConsumption, ...s.consumptions],
            memberCards: newCards,
          };
        });

        return {
          success: true,
          message:
            consumptionType === 'quota'
              ? `结算成功：${baby?.name} 次卡扣费 -1`
              : `结算成功：${baby?.name} 自费 ¥${amount}`,
        };
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
          memberCards: state.memberCards.map((c) => (c.id === id ? { ...c, ...updates } : c)),
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
          cycleRules: state.cycleRules.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        })),

      deleteCycleRule: (id) =>
        set((state) => ({
          cycleRules: state.cycleRules.filter((r) => r.id !== id),
          currentCycleRule: state.currentCycleRule?.id === id ? null : state.currentCycleRule,
        })),

      setDefaultCycleRule: (id) =>
        set((state) => ({
          cycleRules: state.cycleRules.map((r) => ({
            ...r,
            isDefault: r.id === id,
          })),
          currentCycleRule: state.cycleRules.find((r) => r.id === id) || state.currentCycleRule,
        })),

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

        const pendingNewBySlot = new Map<string, number>();

        const generateDatesForSchedule = (schedule: Baby['fixedSchedule'][number]): Date[] => {
          const dates: Date[] = [];

          if (cycleRule.cycleType === 'weekly') {
            const cycleStartDay = cycleRule.startDay;
            const current = new Date(start);
            const currentDay = current.getDay();
            const diff = ((cycleStartDay - currentDay) + 7) % 7;
            current.setDate(current.getDate() + diff);

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

        const flatPreviews: {
          babyId: string;
          poolId: string;
          date: string;
          startTime: string;
          endTime: string;
          babyName: string;
          poolName: string;
          reason: 'new' | 'duplicate' | 'conflict';
          conflictCount?: number;
          poolCapacity?: number;
        }[] = [];

        babies.forEach((baby) => {
          baby.fixedSchedule?.forEach((schedule) => {
            const dates = generateDatesForSchedule(schedule);
            const pool = pools.find((p) => p.id === schedule.poolId);

            dates.forEach((date) => {
              const dateStr = date.toISOString().split('T')[0];
              const uniqueKey = `${baby.id}-${dateStr}-${schedule.startTime}-${schedule.endTime}`;

              if (existingIds.has(uniqueKey)) {
                skipped++;
                flatPreviews.push({
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

              const poolCapacity = pool?.capacity || 0;

              const currentOverlapping = appointments.filter(
                (a) =>
                  a.poolId === schedule.poolId &&
                  a.date === dateStr &&
                  a.status !== 'cancelled' &&
                  !a.isWaitlist &&
                  isOverlapping(a.startTime, a.endTime, schedule.startTime, schedule.endTime)
              ).length;

              const slotKey = `${schedule.poolId}-${dateStr}-${schedule.startTime}-${schedule.endTime}`;
              const pendingCount = pendingNewBySlot.get(slotKey) || 0;
              const totalIfAdded = currentOverlapping + pendingCount + 1;

              if (poolCapacity > 0 && totalIfAdded > poolCapacity) {
                conflictCount++;
                flatPreviews.push({
                  babyId: baby.id,
                  poolId: schedule.poolId,
                  date: dateStr,
                  startTime: schedule.startTime,
                  endTime: schedule.endTime,
                  babyName: baby.name,
                  poolName: pool?.name || '未知泳池',
                  reason: 'conflict',
                  conflictCount: currentOverlapping + pendingCount,
                  poolCapacity,
                });
                return;
              }

              added++;
              flatPreviews.push({
                babyId: baby.id,
                poolId: schedule.poolId,
                date: dateStr,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                babyName: baby.name,
                poolName: pool?.name || '未知泳池',
                reason: 'new',
              });
              pendingNewBySlot.set(slotKey, pendingCount + 1);
            });
          });
        });

        flatPreviews.sort((a, b) => {
          if (a.date !== b.date) return a.date < b.date ? -1 : 1;
          return a.babyName.localeCompare(b.babyName, 'zh');
        });

        previews.push(...flatPreviews);

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

        const sortedBySlot = new Map<string, typeof state.previewAppointments>();
        state.previewAppointments
          .filter((p) => p.reason === 'new')
          .forEach((p) => {
            const key = `${p.poolId}-${p.date}-${p.startTime}-${p.endTime}`;
            if (!sortedBySlot.has(key)) sortedBySlot.set(key, []);
            sortedBySlot.get(key)!.push(p);
          });

        sortedBySlot.forEach((slotPreviews) => {
          slotPreviews.forEach((preview) => {
            const uniqueKey = `${preview.babyId}-${preview.date}-${preview.startTime}-${preview.endTime}`;
            if (existingIds.has(uniqueKey)) return;

            const { poolId, date, startTime, endTime } = preview;
            const check = state.checkCapacityConflict(poolId, date, startTime, endTime);

            if (check.conflict) {
              const waitlistPosition = state.getWaitlistPosition(poolId, date, startTime, endTime);
              const waitlistApt: Appointment = {
                id: `wait-cycle-${Date.now()}-${preview.babyId}-${Math.random().toString(36).slice(2, 5)}`,
                babyId: preview.babyId,
                poolId: preview.poolId,
                date: preview.date,
                startTime: preview.startTime,
                endTime: preview.endTime,
                status: 'scheduled',
                cycleRuleId,
                isFromCycle: true,
                isWaitlist: true,
                waitlistPosition,
              };
              newAppointments.push(waitlistApt);
              existingIds.add(uniqueKey);
              return;
            }

            const newApt: Appointment = {
              id: `apt-cycle-${Date.now()}-${preview.babyId}-${Math.random().toString(36).slice(2, 5)}`,
              babyId: preview.babyId,
              poolId: preview.poolId,
              date: preview.date,
              startTime: preview.startTime,
              endTime: preview.endTime,
              status: 'scheduled',
              cycleRuleId,
              isFromCycle: true,
              isWaitlist: false,
            };
            newAppointments.push(newApt);
            existingIds.add(uniqueKey);
          });
        });

        set((state) => ({
          appointments: [...state.appointments, ...newAppointments],
          previewAppointments: [],
        }));

        return newAppointments.filter((a) => !a.isWaitlist).length;
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
