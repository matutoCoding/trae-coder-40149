import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/appStore';
import {
  Repeat, Plus, Calendar, Clock, Waves, Check, Star, AlertTriangle, X,
  ChevronDown, Filter, Download, RefreshCw, Edit2, Trash2
} from 'lucide-react';
import { format, startOfWeek, addWeeks, parseISO, eachDayOfInterval, getDay, addDays, startOfMonth, getDaysInMonth } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { CycleRule, FixedSchedule, PreviewAppointment, GenerationResult } from '@/types';
import Modal from '@/components/Modal';

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

type ReasonFilter = 'all' | 'new' | 'duplicate' | 'conflict';

const REASON_LABELS: Record<PreviewAppointment['reason'], string> = {
  new: '新增',
  duplicate: '重复',
  conflict: '冲突',
};

const REASON_COLORS: Record<PreviewAppointment['reason'], string> = {
  new: 'bg-green-100 text-green-700',
  duplicate: 'bg-yellow-100 text-yellow-700',
  conflict: 'bg-red-100 text-red-700',
};

export default function CycleGenerator() {
  const {
    babies,
    pools,
    cycleRules,
    currentCycleRule,
    setCurrentCycleRule,
    addCycleRule,
    updateCycleRule,
    deleteCycleRule,
    setDefaultCycleRule,
    previewCycleAppointments,
    confirmPreviewAppointments,
    clearPreview,
    previewAppointments,
    addBabyFixedSchedule,
    updateBabyFixedSchedule,
    removeBabyFixedSchedule,
  } = useAppStore();

  const [selectedBaby, setSelectedBaby] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 4), 'yyyy-MM-dd'));
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [reasonFilter, setReasonFilter] = useState<ReasonFilter>('all');
  const [confirmResult, setConfirmResult] = useState<number | null>(null);
  const [hoveredConflict, setHoveredConflict] = useState<string | null>(null);

  const [showCycleRuleModal, setShowCycleRuleModal] = useState(false);
  const [editingCycleRule, setEditingCycleRule] = useState<CycleRule | null>(null);
  const [cycleRuleForm, setCycleRuleForm] = useState({
    name: '',
    cycleType: 'weekly' as 'weekly' | 'monthly',
    startDay: 1,
  });

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingScheduleIndex, setEditingScheduleIndex] = useState<number | null>(null);
  const [scheduleForm, setScheduleForm] = useState<FixedSchedule>({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '09:45',
    poolId: pools[0]?.id || '',
  });

  const selectedBabyData = babies.find((b) => b.id === selectedBaby);

  const previewDateRange = useMemo(() => {
    if (!currentCycleRule) return [];
    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      return eachDayOfInterval({ start, end });
    } catch {
      return [];
    }
  }, [startDate, endDate, currentCycleRule]);

  const getMonthlyOffsetInfo = (date: Date, rule: CycleRule) => {
    if (rule.cycleType !== 'monthly') return null;
    const year = date.getFullYear();
    const month = date.getMonth();
    const cycleStartDay = Math.min(rule.startDay, getDaysInMonth(new Date(year, month, 1)));
    const cycleStartDate = new Date(year, month, cycleStartDay);
    const cycleStartWeekday = getDay(cycleStartDate);
    let offset = getDay(date) - cycleStartWeekday;
    if (offset < 0) offset += 7;
    return {
      monthDay: rule.startDay,
      weekday: WEEKDAYS[getDay(date)],
    };
  };

  const filteredPreviews = useMemo(() => {
    let items = reasonFilter === 'all'
      ? previewAppointments
      : previewAppointments.filter((p) => p.reason === reasonFilter);
    return [...items].sort((a, b) => {
      const dateDiff = a.date.localeCompare(b.date);
      if (dateDiff !== 0) return dateDiff;
      return a.babyName.localeCompare(b.babyName, 'zh-CN');
    });
  }, [previewAppointments, reasonFilter]);

  const groupedByDatePreviews = useMemo(() => {
    const groups: Record<string, PreviewAppointment[]> = {};
    filteredPreviews.forEach((p) => {
      if (!groups[p.date]) groups[p.date] = [];
      groups[p.date].push(p);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredPreviews]);

  const getRuleIndicatorText = (rule: CycleRule) => {
    if (rule.cycleType === 'weekly') {
      return `当前规则：周周期，每周${WEEKDAYS[rule.startDay]}开始`;
    }
    return `当前规则：月周期，每月${rule.startDay}日开始算，固定时段按当周偏移`;
  };

  const handlePreview = async () => {
    if (!currentCycleRule) return;
    setIsPreviewing(true);
    setConfirmResult(null);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const result = previewCycleAppointments(startDate, endDate, currentCycleRule.id);
    setGenerationResult(result);
    setReasonFilter('all');
    setShowPreviewModal(true);
    setIsPreviewing(false);
  };

  const handleConfirm = async () => {
    if (!currentCycleRule) return;
    setIsConfirming(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const count = confirmPreviewAppointments(currentCycleRule.id);
    setConfirmResult(count);
    setIsConfirming(false);
  };

  const handleClosePreviewModal = () => {
    setShowPreviewModal(false);
    clearPreview();
    setGenerationResult(null);
    setReasonFilter('all');
    setHoveredConflict(null);
  };

  const openAddCycleRule = () => {
    setEditingCycleRule(null);
    setCycleRuleForm({ name: '', cycleType: 'weekly', startDay: 1 });
    setShowCycleRuleModal(true);
  };

  const openEditCycleRule = (rule: CycleRule) => {
    setEditingCycleRule(rule);
    setCycleRuleForm({
      name: rule.name,
      cycleType: rule.cycleType,
      startDay: rule.startDay,
    });
    setShowCycleRuleModal(true);
  };

  const handleSaveCycleRule = () => {
    if (!cycleRuleForm.name.trim()) return;
    if (editingCycleRule) {
      updateCycleRule(editingCycleRule.id, cycleRuleForm);
    } else {
      const newRule = addCycleRule({ ...cycleRuleForm, isDefault: false });
      if (!currentCycleRule) setCurrentCycleRule(newRule);
    }
    setShowCycleRuleModal(false);
  };

  const handleDeleteCycleRule = (id: string) => {
    if (confirm('确定要删除这个周期规则吗？')) {
      deleteCycleRule(id);
    }
  };

  const openAddSchedule = () => {
    if (!selectedBaby) return;
    setEditingScheduleIndex(null);
    setScheduleForm({
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '09:45',
      poolId: pools[0]?.id || '',
    });
    setShowScheduleModal(true);
  };

  const openEditSchedule = (index: number, schedule: FixedSchedule) => {
    setEditingScheduleIndex(index);
    setScheduleForm({ ...schedule });
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = () => {
    if (!selectedBaby) return;
    if (!scheduleForm.poolId) return;
    if (editingScheduleIndex !== null) {
      updateBabyFixedSchedule(selectedBaby, editingScheduleIndex, scheduleForm);
    } else {
      addBabyFixedSchedule(selectedBaby, scheduleForm);
    }
    setShowScheduleModal(false);
  };

  const handleRemoveSchedule = (index: number) => {
    if (!selectedBaby) return;
    if (confirm('确定要删除这个固定时段吗？')) {
      removeBabyFixedSchedule(selectedBaby, index);
    }
  };

  const formatPreviewDate = (dateStr: string) => {
    try {
      const d = parseISO(dateStr);
      return format(d, 'M月d日 EEEE', { locale: zhCN });
    } catch {
      return dateStr;
    }
  };

  const isDateInGenerationRange = (date: Date, rule: CycleRule) => {
    if (!selectedBabyData?.fixedSchedule || selectedBabyData.fixedSchedule.length === 0) return false;

    if (rule.cycleType === 'weekly') {
      const cycleStartDay = rule.startDay;
      const currentDay = getDay(date);
      const diff = ((cycleStartDay - currentDay) + 7) % 7;
      const weekStart = addDays(date, -diff);

      return selectedBabyData.fixedSchedule.some((schedule) => {
        const dayDiff = schedule.dayOfWeek - getDay(weekStart);
        const target = addDays(weekStart, dayDiff);
        return format(target, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
      });
    } else {
      return selectedBabyData.fixedSchedule.some((schedule) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const cycleStartDay = Math.min(rule.startDay, getDaysInMonth(new Date(year, month, 1)));
        const cycleStartDate = new Date(year, month, cycleStartDay);
        let offset = schedule.dayOfWeek - getDay(cycleStartDate);
        if (offset < 0) offset += 7;
        const scheduleDate = addDays(cycleStartDate, offset);
        return format(scheduleDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
      });
    }
  };

  const getConflictTooltip = (item: PreviewAppointment) => {
    if (item.reason !== 'conflict') return '';
    const current = item.conflictCount || 0;
    const capacity = item.poolCapacity || 0;
    const exceed = (current + 1) - capacity;
    return `时段预占冲突：当前${current}人 + 本次新增1人 = 超出容量${exceed}人`;
  };

  const renderCycleWeekHeader = () => {
    if (!currentCycleRule) return null;

    return (
      <div className="mb-4">
        <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-primary-50 to-cyan-50 rounded-xl border border-primary-200">
          <Calendar className="w-5 h-5 text-primary-600" />
          <span className="font-medium text-primary-700">
            {getRuleIndicatorText(currentCycleRule)}
          </span>
        </div>
      </div>
    );
  };

  const renderDatePreviewTable = () => {
    if (!currentCycleRule || previewDateRange.length === 0) return null;

    const weekStartDays: number[] = [];
    for (let i = 0; i < 7; i++) {
      weekStartDays.push((currentCycleRule.startDay + i) % 7);
    }

    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];

    previewDateRange.forEach((date) => {
      if (currentCycleRule.cycleType === 'weekly') {
        if (getDay(date) === currentCycleRule.startDay && currentWeek.length > 0) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
      } else {
        if (date.getDate() === 1 && currentWeek.length > 0) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
      }
      currentWeek.push(date);
    });
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          生成范围预览表
        </h4>
        <div className="space-y-3">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="border border-gray-200 rounded-xl overflow-hidden">
              {currentCycleRule.cycleType === 'monthly' && (
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                  <span className="text-xs font-medium text-gray-600">
                    {format(week[0], 'yyyy年M月', { locale: zhCN })}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-7 gap-px bg-gray-200">
                {weekStartDays.map((dayIdx) => (
                  <div key={dayIdx} className="px-2 py-1.5 bg-gray-50 text-center text-xs font-medium text-gray-600">
                    {WEEKDAYS[dayIdx]}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px bg-gray-200">
                {weekStartDays.map((dayIdx) => {
                  const date = week.find((d) => getDay(d) === dayIdx);
                  if (!date) {
                    return <div key={dayIdx} className="px-2 py-3 bg-white" />;
                  }
                  const isInRange = isDateInGenerationRange(date, currentCycleRule);
                  const offsetInfo = getMonthlyOffsetInfo(date, currentCycleRule);
                  return (
                    <div
                      key={dayIdx}
                      className={`px-2 py-3 text-center ${
                        isInRange
                          ? 'bg-primary-50 border-l-2 border-primary-400'
                          : 'bg-white'
                      }`}
                    >
                      <div className={`text-sm font-medium ${
                        isInRange ? 'text-primary-700' : 'text-gray-600'
                      }`}>
                        {date.getDate()}
                      </div>
                      {isInRange && offsetInfo && (
                        <div className="mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-primary-100 rounded text-[10px] text-primary-700">
                          月{offsetInfo.monthDay}→周{offsetInfo.weekday.replace('周', '')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">周期生成</h1>
          <p className="text-gray-500 mt-1">按周期批量生成宝宝游泳预约</p>
        </div>
        <div className="flex gap-3">
          <button onClick={openAddCycleRule} className="btn-secondary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            周期规则
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Repeat className="w-5 h-5 text-primary-500" />
                周期规则
              </h3>
              <button
                onClick={openAddCycleRule}
                className="p-1.5 hover:bg-primary-50 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4 text-primary-600" />
              </button>
            </div>
            <div className="space-y-3">
              {cycleRules.map((rule) => (
                <div
                  key={rule.id}
                  onClick={() => setCurrentCycleRule(rule)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all group ${
                    currentCycleRule?.id === rule.id
                      ? 'border-primary-400 bg-primary-50'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-800">{rule.name}</p>
                        {rule.isDefault && (
                          <Star className="w-3.5 h-3.5 text-warning-500 fill-warning-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {rule.cycleType === 'weekly' ? '周周期' : '月周期'} · {
                          rule.cycleType === 'weekly'
                            ? `每周${WEEKDAYS[rule.startDay]}开始`
                            : `每月${rule.startDay}日开始算，固定时段按当周偏移`
                        }
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!rule.isDefault && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDefaultCycleRule(rule.id);
                          }}
                          className="p-1.5 hover:bg-warning-50 rounded-lg"
                          title="设为默认"
                        >
                          <Star className="w-3.5 h-3.5 text-warning-500" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditCycleRule(rule);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded-lg"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                      {!rule.isDefault && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCycleRule(rule.id);
                          }}
                          className="p-1.5 hover:bg-danger-50 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-danger-500" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {cycleRules.length === 0 && (
                <div className="text-center py-6 text-gray-400">
                  <Repeat className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>暂无周期规则</p>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-500" />
              生成设置
            </h3>
            {renderCycleWeekHeader()}
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">开始日期</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">结束日期</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input-field"
                />
              </div>
              {renderDatePreviewTable()}
              <button
                onClick={handlePreview}
                disabled={isPreviewing || !currentCycleRule}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPreviewing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Calendar className="w-4 h-4" />
                )}
                {isPreviewing ? '预览中...' : '批量生成'}
              </button>
              {confirmResult !== null && (
                <div className={`p-3 rounded-xl text-center text-sm ${
                  confirmResult > 0
                    ? 'bg-success-50 text-success-600'
                    : 'bg-warning-50 text-warning-600'
                }`}>
                  {confirmResult > 0
                    ? `✓ 成功写入 ${confirmResult} 条新预约`
                    : 'ℹ 未写入新预约（均为重复或冲突）'}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary-500" />
                宝宝列表
              </h3>
              <span className="text-sm text-gray-500">共 {babies.length} 位宝宝</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {babies.map((baby) => (
                <div
                  key={baby.id}
                  onClick={() => setSelectedBaby(baby.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                    selectedBaby === baby.id
                      ? 'border-primary-400 bg-primary-50'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: baby.avatarColor }}
                    >
                      {baby.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{baby.name}</p>
                      <p className="text-xs text-gray-500">
                        {baby.gender === 'male' ? '👦' : '👧'} {baby.ageMonths}个月
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-xs text-gray-500">固定时段: {baby.fixedSchedule?.length || 0} 个</p>
                    {baby.fixedSchedule && baby.fixedSchedule.length > 0 && (
                      <span className="badge bg-primary-100 text-primary-600">可生成</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedBabyData && (
            <div className="card animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  {selectedBabyData.name} 的固定时段
                </h3>
                <button
                  onClick={openAddSchedule}
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  添加时段
                </button>
              </div>

              <div className="space-y-3">
                {selectedBabyData.fixedSchedule?.map((schedule, index) => {
                  const pool = pools.find((p) => p.id === schedule.poolId);
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary-50 to-cyan-50 rounded-xl group"
                    >
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <Clock className="w-5 h-5 text-primary-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">
                          {WEEKDAYS[schedule.dayOfWeek]}
                        </p>
                        <p className="text-sm text-gray-500">
                          {schedule.startTime} - {schedule.endTime}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Waves className="w-4 h-4 text-primary-400" />
                        {pool?.name || '未设置泳池'}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditSchedule(index, schedule)}
                          className="p-1.5 bg-white hover:bg-gray-50 rounded-lg shadow-sm"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                        <button
                          onClick={() => handleRemoveSchedule(index)}
                          className="p-1.5 bg-white hover:bg-danger-50 rounded-lg shadow-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-danger-500" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {(!selectedBabyData.fixedSchedule || selectedBabyData.fixedSchedule.length === 0) && (
                  <div className="text-center py-10 text-gray-400">
                    <Clock className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="mb-2">暂无固定时段</p>
                    <button onClick={openAddSchedule} className="btn-secondary text-sm py-1.5">
                      <Plus className="w-3 h-3 inline mr-1" />
                      添加第一个时段
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-700 mb-3">宝宝信息</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">家长姓名</p>
                    <p className="text-gray-800 font-medium">{selectedBabyData.parentName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">联系电话</p>
                    <p className="text-gray-800 font-medium">{selectedBabyData.phone}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">会员卡号</p>
                    <p className="text-gray-800 font-medium">{selectedBabyData.memberCardNo}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">月龄</p>
                    <p className="text-gray-800 font-medium">{selectedBabyData.ageMonths} 个月</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showPreviewModal}
        onClose={handleClosePreviewModal}
        title="预览生成结果"
        size="xl"
        footer={
          <>
            <button onClick={handleClosePreviewModal} className="btn-secondary">
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={isConfirming || !generationResult || generationResult.added === 0}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {isConfirming ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {isConfirming ? '写入中...' : `确认写入 (${generationResult?.added || 0} 条)`}
            </button>
          </>
        }
      >
        {generationResult && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-200">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium">新增</span>
                <span className="text-lg font-bold text-green-700">{generationResult.added}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-50 border border-yellow-200">
                <RefreshCw className="w-4 h-4 text-yellow-600" />
                <span className="text-sm text-yellow-700 font-medium">跳过重复</span>
                <span className="text-lg font-bold text-yellow-700">{generationResult.skipped}</span>
              </div>
              <div
                className="relative flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 cursor-help group"
              >
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-700 font-medium">容量冲突未生成</span>
                <span className="text-lg font-bold text-red-700">{generationResult.conflicts}</span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  这些时段即使按顺序生成也会超过容量，已标记为冲突
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                </div>
              </div>
            </div>

            {confirmResult !== null && (
              <div className={`p-3 rounded-xl text-center text-sm ${
                confirmResult > 0
                  ? 'bg-success-50 text-success-600 border border-success-200'
                  : 'bg-warning-50 text-warning-600 border border-warning-200'
              }`}>
                {confirmResult > 0
                  ? `✓ 已成功写入 ${confirmResult} 条新预约`
                  : 'ℹ 未写入新预约'}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">筛选：</span>
              {(['all', 'new', 'duplicate', 'conflict'] as ReasonFilter[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setReasonFilter(filter)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    reasonFilter === filter
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter === 'all' ? '全部' : REASON_LABELS[filter]}
                </button>
              ))}
            </div>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
              {groupedByDatePreviews.map(([date, items]) => (
                <div key={date} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 sticky top-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-800">
                        {formatPreviewDate(date)}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {items.length} 条记录
                      </span>
                    </div>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="text-left px-4 py-2.5 text-gray-600 font-medium text-xs">宝宝</th>
                        <th className="text-left px-4 py-2.5 text-gray-600 font-medium text-xs">泳池</th>
                        <th className="text-left px-4 py-2.5 text-gray-600 font-medium text-xs">时段</th>
                        <th className="text-center px-4 py-2.5 text-gray-600 font-medium text-xs">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => {
                        const baby = babies.find((b) => b.id === item.babyId);
                        const pool = pools.find((p) => p.id === item.poolId);
                        const itemKey = `${item.babyId}-${item.poolId}-${item.date}-${item.startTime}-${item.endTime}-${idx}`;
                        const isConflict = item.reason === 'conflict';
                        const offsetInfo = currentCycleRule && currentCycleRule.cycleType === 'monthly'
                          ? getMonthlyOffsetInfo(parseISO(item.date), currentCycleRule)
                          : null;
                        return (
                          <tr
                            key={itemKey}
                            className={`border-t border-gray-100 transition-colors ${
                              isConflict ? 'bg-red-50/80 hover:bg-red-50' : 'hover:bg-gray-50/50'
                            }`}
                            onMouseEnter={() => isConflict && setHoveredConflict(itemKey)}
                            onMouseLeave={() => setHoveredConflict(null)}
                          >
                            <td className="px-4 py-3 font-medium text-gray-800">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                  style={{ backgroundColor: baby?.avatarColor || '#999' }}
                                >
                                  {baby?.name?.charAt(0) || '?'}
                                </div>
                                {item.babyName}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              <div className="flex items-center gap-1.5">
                                <Waves className="w-3.5 h-3.5 text-primary-400" />
                                {pool?.name || item.poolName}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              <div className="flex items-center gap-2">
                                <span>{item.startTime} - {item.endTime}</span>
                                {offsetInfo && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded text-[10px]">
                                    月{offsetInfo.monthDay}→周{offsetInfo.weekday.replace('周', '')}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center relative">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${REASON_COLORS[item.reason]}`}>
                                {item.reason === 'conflict' && <AlertTriangle className="w-3 h-3" />}
                                {item.reason === 'duplicate' && <RefreshCw className="w-3 h-3" />}
                                {item.reason === 'new' && <Check className="w-3 h-3" />}
                                {REASON_LABELS[item.reason]}
                              </span>
                              {isConflict && (
                                <>
                                  <span className="text-xs text-red-500 ml-1">
                                    ({item.conflictCount}/{item.poolCapacity})
                                  </span>
                                  {hoveredConflict === itemKey && (
                                    <div className="absolute right-0 top-full mt-1 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap z-20">
                                      {getConflictTooltip(item)}
                                      <div className="absolute bottom-full right-4 border-4 border-transparent border-b-gray-800" />
                                    </div>
                                  )}
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
              {groupedByDatePreviews.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                  <X className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>无匹配记录</p>
                </div>
              )}
            </div>

            <div className="text-xs text-gray-400 text-right">
              共 {filteredPreviews.length} 条记录
              {reasonFilter !== 'all' && ` (已筛选，总计 ${previewAppointments.length} 条)`}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showCycleRuleModal}
        onClose={() => setShowCycleRuleModal(false)}
        title={editingCycleRule ? '编辑周期规则' : '新增周期规则'}
        size="sm"
        footer={
          <>
            <button onClick={() => setShowCycleRuleModal(false)} className="btn-secondary">
              取消
            </button>
            <button onClick={handleSaveCycleRule} className="btn-primary">
              <Check className="w-4 h-4 inline mr-1" />
              保存
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">规则名称</label>
            <input
              type="text"
              value={cycleRuleForm.name}
              onChange={(e) => setCycleRuleForm({ ...cycleRuleForm, name: e.target.value })}
              placeholder="如：默认周周期"
              className="input-field"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">周期类型</label>
            <select
              value={cycleRuleForm.cycleType}
              onChange={(e) => setCycleRuleForm({
                ...cycleRuleForm,
                cycleType: e.target.value as 'weekly' | 'monthly',
                startDay: e.target.value === 'weekly' ? 1 : 1,
              })}
              className="input-field"
            >
              <option value="weekly">周周期</option>
              <option value="monthly">月周期</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              {cycleRuleForm.cycleType === 'weekly' ? '周期开始日（周几）' : '周期开始日（几号）'}
            </label>
            {cycleRuleForm.cycleType === 'weekly' ? (
              <select
                value={cycleRuleForm.startDay}
                onChange={(e) => setCycleRuleForm({ ...cycleRuleForm, startDay: parseInt(e.target.value) })}
                className="input-field"
              >
                {WEEKDAYS.map((day, idx) => (
                  <option key={idx} value={idx}>{day}</option>
                ))}
              </select>
            ) : (
              <>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={cycleRuleForm.startDay}
                  onChange={(e) => setCycleRuleForm({
                    ...cycleRuleForm,
                    startDay: Math.max(1, Math.min(28, parseInt(e.target.value) || 1)),
                  })}
                  className="input-field"
                />
                <p className="text-xs text-gray-400 mt-1">
                  每月{cycleRuleForm.startDay}日开始算，固定时段按当周偏移
                </p>
              </>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title={editingScheduleIndex !== null ? '编辑固定时段' : '新增固定时段'}
        size="sm"
        footer={
          <>
            <button onClick={() => setShowScheduleModal(false)} className="btn-secondary">
              取消
            </button>
            <button onClick={handleSaveSchedule} className="btn-primary">
              <Check className="w-4 h-4 inline mr-1" />
              保存
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">每周</label>
            <select
              value={scheduleForm.dayOfWeek}
              onChange={(e) => setScheduleForm({ ...scheduleForm, dayOfWeek: parseInt(e.target.value) })}
              className="input-field"
            >
              {WEEKDAYS.map((day, idx) => (
                <option key={idx} value={idx}>{day}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">开始时间</label>
              <input
                type="time"
                step="900"
                value={scheduleForm.startTime}
                onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">结束时间</label>
              <input
                type="time"
                step="900"
                value={scheduleForm.endTime}
                onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                className="input-field"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">指定泳池</label>
            <select
              value={scheduleForm.poolId}
              onChange={(e) => setScheduleForm({ ...scheduleForm, poolId: e.target.value })}
              className="input-field"
            >
              {pools.filter((p) => p.status === 'active').map((pool) => (
                <option key={pool.id} value={pool.id}>
                  {pool.name}（{pool.ageRange}）
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
