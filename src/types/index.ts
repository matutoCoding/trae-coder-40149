
export interface Pool {
  id: string;
  name: string;
  capacity: number;
  ageRange: string;
  status: 'active' | 'inactive' | 'maintenance';
}

export interface FixedSchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  poolId: string;
}

export interface Baby {
  id: string;
  name: string;
  gender: 'male' | 'female';
  ageMonths: number;
  parentName: string;
  phone: string;
  memberCardNo: string;
  fixedSchedule?: FixedSchedule[];
  avatarColor: string;
}

export interface Appointment {
  id: string;
  babyId: string;
  poolId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  cycleRuleId?: string;
  isFromCycle: boolean;
  consumptionId?: string;
  isWaitlist: boolean;
  waitlistPosition?: number;
  memberCardId?: string;
}

export interface MemberCard {
  id: string;
  babyId: string;
  cardType: string;
  totalQuota: number;
  remainingQuota: number;
  cycleType: 'weekly' | 'monthly';
  effectiveDate: string;
  expireDate: string;
  selfPayPrice: number;
  lastResetDate?: string;
}

export interface Consumption {
  id: string;
  babyId: string;
  appointmentId?: string;
  cardId?: string;
  type: 'quota' | 'self-pay' | 'other';
  amount: number;
  time: string;
  operator: string;
  remark?: string;
  isFromWaitlist?: boolean;
}

export interface WaterRecord {
  id: string;
  poolId: string;
  date: string;
  temperature: number;
  disinfection: string;
  recorder: string;
  recordTime: string;
}

export interface CycleRule {
  id: string;
  name: string;
  cycleType: 'weekly' | 'monthly';
  startDay: number;
  isDefault: boolean;
}

export interface PreviewAppointment {
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
}

export interface GenerationResult {
  total: number;
  added: number;
  skipped: number;
  conflicts: number;
  previews: PreviewAppointment[];
}

export interface SettlementForm {
  appointmentId: string;
  cardId: string | null;
  paymentType: 'quota' | 'self-pay';
  selfPayAmount: number;
  operator: string;
}

export interface OverlappingAppointment {
  id: string;
  babyId: string;
  babyName: string;
  startTime: string;
  endTime: string;
}
