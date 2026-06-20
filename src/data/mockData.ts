
import type { Pool, Baby, Appointment, MemberCard, Consumption, WaterRecord, CycleRule } from '@/types';

export const pools: Pool[] = [
  { id: 'pool-1', name: '小海豚泳池', capacity: 4, ageRange: '0-6个月', status: 'active' },
  { id: 'pool-2', name: '小海龟泳池', capacity: 6, ageRange: '6-12个月', status: 'active' },
  { id: 'pool-3', name: '小鲸鱼泳池', capacity: 8, ageRange: '12-24个月', status: 'active' },
  { id: 'pool-4', name: '训练池', capacity: 10, ageRange: '24-36个月', status: 'maintenance' },
];

export const babies: Baby[] = [
  {
    id: 'baby-1',
    name: '小明',
    gender: 'male',
    ageMonths: 8,
    parentName: '王女士',
    phone: '138****1234',
    memberCardNo: 'VIP2024001',
    avatarColor: '#4FC3F7',
    fixedSchedule: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '09:45', poolId: 'pool-2' },
      { dayOfWeek: 3, startTime: '10:00', endTime: '10:45', poolId: 'pool-2' },
      { dayOfWeek: 5, startTime: '09:00', endTime: '09:45', poolId: 'pool-2' },
    ],
  },
  {
    id: 'baby-2',
    name: '小红',
    gender: 'female',
    ageMonths: 5,
    parentName: '李女士',
    phone: '139****5678',
    memberCardNo: 'VIP2024002',
    avatarColor: '#F48FB1',
    fixedSchedule: [
      { dayOfWeek: 2, startTime: '09:30', endTime: '10:15', poolId: 'pool-1' },
      { dayOfWeek: 4, startTime: '09:30', endTime: '10:15', poolId: 'pool-1' },
    ],
  },
  {
    id: 'baby-3',
    name: '豆豆',
    gender: 'male',
    ageMonths: 15,
    parentName: '张先生',
    phone: '137****9012',
    memberCardNo: 'VIP2024003',
    avatarColor: '#81C784',
    fixedSchedule: [
      { dayOfWeek: 1, startTime: '14:00', endTime: '14:45', poolId: 'pool-3' },
      { dayOfWeek: 3, startTime: '14:00', endTime: '14:45', poolId: 'pool-3' },
      { dayOfWeek: 5, startTime: '15:00', endTime: '15:45', poolId: 'pool-3' },
    ],
  },
  {
    id: 'baby-4',
    name: '丫丫',
    gender: 'female',
    ageMonths: 20,
    parentName: '陈女士',
    phone: '136****3456',
    memberCardNo: 'VIP2024004',
    avatarColor: '#FFB74D',
    fixedSchedule: [
      { dayOfWeek: 2, startTime: '10:00', endTime: '10:45', poolId: 'pool-3' },
      { dayOfWeek: 4, startTime: '10:00', endTime: '10:45', poolId: 'pool-3' },
      { dayOfWeek: 6, startTime: '09:00', endTime: '09:45', poolId: 'pool-3' },
    ],
  },
  {
    id: 'baby-5',
    name: '壮壮',
    gender: 'male',
    ageMonths: 3,
    parentName: '刘女士',
    phone: '135****7890',
    memberCardNo: 'VIP2024005',
    avatarColor: '#BA68C8',
    fixedSchedule: [
      { dayOfWeek: 1, startTime: '11:00', endTime: '11:45', poolId: 'pool-1' },
      { dayOfWeek: 4, startTime: '11:00', endTime: '11:45', poolId: 'pool-1' },
    ],
  },
  {
    id: 'baby-6',
    name: '糖糖',
    gender: 'female',
    ageMonths: 10,
    parentName: '赵先生',
    phone: '134****2345',
    memberCardNo: 'VIP2024006',
    avatarColor: '#4DD0E1',
    fixedSchedule: [
      { dayOfWeek: 2, startTime: '15:00', endTime: '15:45', poolId: 'pool-2' },
      { dayOfWeek: 5, startTime: '15:00', endTime: '15:45', poolId: 'pool-2' },
    ],
  },
];

function generateAppointments(): Appointment[] {
  const appointments: Appointment[] = [];
  const today = new Date();
  
  for (let weekOffset = -1; weekOffset <= 3; weekOffset++) {
    babies.forEach((baby) => {
      baby.fixedSchedule?.forEach((schedule) => {
        const date = new Date(today);
        date.setDate(date.getDate() + weekOffset * 7);
        const dayDiff = schedule.dayOfWeek - date.getDay();
        date.setDate(date.getDate() + dayDiff);
        
        const dateStr = date.toISOString().split('T')[0];
        const daysDiff = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        let status: Appointment['status'] = 'scheduled';
        if (daysDiff < 0) {
          status = Math.random() > 0.1 ? 'completed' : 'no-show';
        } else if (daysDiff === 0) {
          status = 'scheduled';
        }
        
        appointments.push({
          id: `apt-${baby.id}-${weekOffset}-${schedule.dayOfWeek}`,
          babyId: baby.id,
          poolId: schedule.poolId,
          date: dateStr,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          status,
          cycleRuleId: 'cycle-1',
          isFromCycle: true,
          isWaitlist: false,
        });
      });
    });
  }
  
  return appointments;
}

export const appointments: Appointment[] = generateAppointments();

export const memberCards: MemberCard[] = [
  {
    id: 'card-1',
    babyId: 'baby-1',
    cardType: '周卡-每周3次',
    totalQuota: 3,
    remainingQuota: 2,
    cycleType: 'weekly',
    effectiveDate: '2024-01-01',
    expireDate: '2026-12-31',
    selfPayPrice: 88,
    lastResetDate: new Date().toISOString().split('T')[0],
  },
  {
    id: 'card-2',
    babyId: 'baby-2',
    cardType: '周卡-每周2次',
    totalQuota: 2,
    remainingQuota: 0,
    cycleType: 'weekly',
    effectiveDate: '2024-03-15',
    expireDate: '2025-03-15',
    selfPayPrice: 98,
    lastResetDate: new Date().toISOString().split('T')[0],
  },
  {
    id: 'card-3',
    babyId: 'baby-3',
    cardType: '月卡-每月12次',
    totalQuota: 12,
    remainingQuota: 8,
    cycleType: 'monthly',
    effectiveDate: '2024-02-01',
    expireDate: '2026-02-01',
    selfPayPrice: 78,
    lastResetDate: new Date().toISOString().split('T')[0],
  },
  {
    id: 'card-4',
    babyId: 'baby-4',
    cardType: '月卡-每月12次',
    totalQuota: 12,
    remainingQuota: 12,
    cycleType: 'monthly',
    effectiveDate: '2024-04-01',
    expireDate: '2026-04-01',
    selfPayPrice: 78,
    lastResetDate: new Date().toISOString().split('T')[0],
  },
  {
    id: 'card-5',
    babyId: 'baby-5',
    cardType: '周卡-每周2次',
    totalQuota: 2,
    remainingQuota: 1,
    cycleType: 'weekly',
    effectiveDate: '2024-05-01',
    expireDate: '2025-05-01',
    selfPayPrice: 98,
    lastResetDate: new Date().toISOString().split('T')[0],
  },
  {
    id: 'card-6',
    babyId: 'baby-6',
    cardType: '周卡-每周2次',
    totalQuota: 2,
    remainingQuota: 2,
    cycleType: 'weekly',
    effectiveDate: '2024-06-01',
    expireDate: '2026-06-01',
    selfPayPrice: 88,
    lastResetDate: new Date().toISOString().split('T')[0],
  },
];

function generateConsumptions(): Consumption[] {
  const consumptions: Consumption[] = [];
  const today = new Date();
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const count = Math.floor(Math.random() * 4) + 2;
    for (let j = 0; j < count; j++) {
      const baby = babies[Math.floor(Math.random() * babies.length)];
      const card = memberCards.find((c) => c.babyId === baby.id);
      const isQuota = Math.random() > 0.2;
      
      consumptions.push({
        id: `cons-${i}-${j}`,
        babyId: baby.id,
        type: isQuota ? 'quota' : 'self-pay',
        amount: isQuota ? 0 : (card?.selfPayPrice || 88),
        time: `${dateStr} ${String(9 + Math.floor(Math.random() * 8)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
        operator: '张前台',
        remark: isQuota ? '次卡扣费' : '自费消费',
        adjustType: 'original',
      });
    }
  }
  
  return consumptions.sort((a, b) => b.time.localeCompare(a.time));
}

export const consumptions: Consumption[] = generateConsumptions();

function generateWaterRecords(): WaterRecord[] {
  const records: WaterRecord[] = [];
  const today = new Date();
  
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    pools.forEach((pool, idx) => {
      if (pool.status === 'maintenance') return;
      records.push({
        id: `water-${i}-${idx}`,
        poolId: pool.id,
        date: dateStr,
        temperature: Number((36 + Math.random() * 2).toFixed(1)),
        disinfection: '氯消毒 0.3mg/L',
        recorder: '李救生员',
        recordTime: `${dateStr} 08:30`,
      });
    });
  }
  
  return records.sort((a, b) => b.date.localeCompare(a.date));
}

export const waterRecords: WaterRecord[] = generateWaterRecords();

export const cycleRules: CycleRule[] = [
  { id: 'cycle-1', name: '默认周周期', cycleType: 'weekly', startDay: 1, isDefault: true },
  { id: 'cycle-2', name: '自然月周期', cycleType: 'monthly', startDay: 1, isDefault: false },
];
