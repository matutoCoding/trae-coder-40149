
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
  type: 'quota' | 'self-pay' | 'other';
  amount: number;
  time: string;
  operator: string;
  remark?: string;
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
