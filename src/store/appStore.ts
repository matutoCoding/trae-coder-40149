
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
  
  setCurrentCycleRule: (rule: CycleRule) => void;
  
  addAppointment: (appointment: Appointment) => void;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  
  addBaby: (baby: Baby) => void;
  updateBaby: (id: string, updates: Partial<Baby>) => void;
  deleteBaby: (id: string) => void;
  
  addPool: (pool: Pool) => void;
  updatePool: (id: string, updates: Partial<Pool>) => void;
  
  resetQuota: (babyId: string) => void;
  resetAllQuotas: () => void;
  consumeQuota: (babyId: string, type: 'quota' | 'self-pay', amount: number) => void;
  
  addWaterRecord: (record: WaterRecord) => void;
  
  generateCycleAppointments: (startDate: string, endDate: string, cycleRuleId: string) => void;
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
      
      setCurrentCycleRule: (rule) => set({ currentCycleRule: rule }),
      
      addAppointment: (appointment) =>
        set((state) => ({ appointments: [...state.appointments, appointment] })),
      
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
      
      addBaby: (baby) => set((state) => ({ babies: [...state.babies, baby] })),
      
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
      
      addPool: (pool) => set((state) => ({ pools: [...state.pools, pool] })),
      
      updatePool: (id, updates) =>
        set((state) => ({
          pools: state.pools.map((p) => (p.id === id ? { ...p, ...updates } : p)),
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
        })),
      
      consumeQuota: (babyId, type, amount) => {
        const state = get();
        const baby = state.babies.find((b) => b.id === babyId);
        
        if (type === 'quota') {
          set((state) => ({
            memberCards: state.memberCards.map((c) =>
              c.babyId === babyId
                ? { ...c, remainingQuota: Math.max(0, c.remainingQuota - 1) }
                : c
            ),
          }));
        }
        
        const newConsumption: Consumption = {
          id: `cons-${Date.now()}`,
          babyId,
          type,
          amount,
          time: new Date().toISOString().replace('T', ' ').slice(0, 16),
          operator: '系统',
          remark: type === 'quota' ? '次卡扣费' : '自费消费',
        };
        
        set((state) => ({
          consumptions: [newConsumption, ...state.consumptions],
        }));
      },
      
      addWaterRecord: (record) =>
        set((state) => ({ waterRecords: [record, ...state.waterRecords] })),
      
      generateCycleAppointments: (startDate, endDate, cycleRuleId) => {
        const { babies, appointments } = get();
        const newAppointments: Appointment[] = [];
        const cycleRule = get().cycleRules.find((r) => r.id === cycleRuleId);
        
        if (!cycleRule) return;
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        babies.forEach((baby) => {
          baby.fixedSchedule?.forEach((schedule) => {
            const current = new Date(start);
            
            while (current <= end) {
              const dayDiff = schedule.dayOfWeek - current.getDay();
              const targetDate = new Date(current);
              targetDate.setDate(targetDate.getDate() + dayDiff);
              
              if (targetDate >= start && targetDate <= end) {
                const dateStr = targetDate.toISOString().split('T')[0];
                const exists = appointments.some(
                  (a) =>
                    a.babyId === baby.id &&
                    a.date === dateStr &&
                    a.startTime === schedule.startTime &&
                    a.isFromCycle
                );
                
                if (!exists) {
                  newAppointments.push({
                    id: `apt-cycle-${Date.now()}-${baby.id}-${dateStr}`,
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
      },
    }),
    {
      name: 'baby-swim-store',
    }
  )
);
