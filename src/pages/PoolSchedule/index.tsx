import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/appStore';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Waves,
  Bell,
  RefreshCw,
  Edit,
  Trash2,
} from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, addWeeks, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Pool, Appointment } from '@/types';
import Modal from '@/components/Modal';

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const TIME_SLOTS = ['09:00', '09:45', '10:30', '11:15', '14:00', '14:45', '15:30', '16:15'];

export default function PoolSchedule() {
  const {
    pools,
    babies,
    appointments,
    memberCards,
    addPool,
    updatePool,
    deletePool,
    addAppointment,
    updateAppointment,
    cancelAppointment,
    settleAppointment,
    checkCapacityConflict,
    getOverlappingAppointments,
    getWaitlistPosition,
    addToWaitlist,
    waitlistNotifications,
    clearWaitlistNotifications,
  } = useAppStore();

  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedPool, setSelectedPool] = useState<string>(pools[0]?.id || '');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const [showPoolModal, setShowPoolModal] = useState(false);
  const [editingPool, setEditingPool] = useState<Pool | null>(null);
  const [poolForm, setPoolForm] = useState({ name: '', capacity: 4, ageRange: '', status: 'active' as Pool['status'] });

  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [isEditAppointment, setIsEditAppointment] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [appointmentForm, setAppointmentForm] = useState({
    babyId: '',
    poolId: selectedPool,
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '09:45',
  });
  const [capacityWarning, setCapacityWarning] = useState<{
    conflict: boolean;
    conflictingBabies: { babyId: string; babyName: string; startTime: string; endTime: string }[];
    remainSlots: number;
  } | null>(null);

  const weekStart = startOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const filteredAppointments = useMemo(
    () => appointments.filter((a) => a.poolId === selectedPool && a.status !== 'cancelled'),
    [appointments, selectedPool]
  );

  const showToast = (message: string, type: 'success' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getAppointmentsForSlot = (date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return filteredAppointments.filter(
      (a) => a.date === dateStr && a.startTime <= time && a.endTime > time
    );
  };

  const getSlotCapacityInfo = (date: Date, startTime: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const pool = pools.find((p) => p.id === selectedPool);
    const capacity = pool?.capacity || 0;
    const endTime = TIME_SLOTS[TIME_SLOTS.indexOf(startTime) + 1] || startTime;
    const overlapping = getOverlappingAppointments(selectedPool, dateStr, startTime, endTime);
    return { count: overlapping.length, capacity };
  };

  const handlePrevWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, -1));
  const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const handleToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const openAddPool = () => {
    setEditingPool(null);
    setPoolForm({ name: '', capacity: 4, ageRange: '', status: 'active' });
    setShowPoolModal(true);
  };

  const openEditPool = (pool: Pool) => {
    setEditingPool(pool);
    setPoolForm({ name: pool.name, capacity: pool.capacity, ageRange: pool.ageRange, status: pool.status });
    setShowPoolModal(true);
  };

  const handleSavePool = () => {
    if (!poolForm.name.trim()) return;
    if (editingPool) {
      updatePool(editingPool.id, poolForm);
    } else {
      addPool(poolForm);
    }
    setShowPoolModal(false);
  };

  const handleDeletePool = (id: string) => {
    if (confirm('确定要删除这个泳池吗？')) {
      deletePool(id);
      if (selectedPool === id && pools.length > 1) {
        const remaining = pools.filter((p) => p.id !== id);
        setSelectedPool(remaining[0]?.id || '');
      }
    }
  };

  const openAddAppointment = () => {
    setIsEditAppointment(false);
    setEditingAppointmentId(null);
    setCapacityWarning(null);
    setAppointmentForm({
      babyId: babies[0]?.id || '',
      poolId: selectedPool,
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '09:45',
    });
    setShowAppointmentModal(true);
  };

  const openEditAppointment = (apt: Appointment) => {
    setIsEditAppointment(true);
    setEditingAppointmentId(apt.id);
    setCapacityWarning(null);
    setAppointmentForm({
      babyId: apt.babyId,
      poolId: apt.poolId,
      date: apt.date,
      startTime: apt.startTime,
      endTime: apt.endTime,
    });
    setShowAppointmentModal(true);
  };

  const handleSaveAppointment = () => {
    if (!appointmentForm.babyId || !appointmentForm.poolId) return;

    const result = checkCapacityConflict(
      appointmentForm.poolId,
      appointmentForm.date,
      appointmentForm.startTime,
      appointmentForm.endTime,
      isEditAppointment && editingAppointmentId ? editingAppointmentId : undefined
    );

    if (result.conflict) {
      const overlappingWithTimes = result.overlappingAppointments.map((o) => ({
        babyId: o.babyId,
        babyName: o.babyName,
        startTime: o.startTime,
        endTime: o.endTime,
      }));
      setCapacityWarning({
        conflict: result.conflict,
        conflictingBabies: overlappingWithTimes,
        remainSlots: result.remainSlots,
      });
      return;
    }

    if (isEditAppointment && editingAppointmentId) {
      updateAppointment(editingAppointmentId, {
        babyId: appointmentForm.babyId,
        poolId: appointmentForm.poolId,
        date: appointmentForm.date,
        startTime: appointmentForm.startTime,
        endTime: appointmentForm.endTime,
      });
    } else {
      addAppointment({
        ...appointmentForm,
        status: 'scheduled',
        isFromCycle: false,
      });
    }
    setCapacityWarning(null);
    setShowAppointmentModal(false);
  };

  const handleAddToWaitlist = () => {
    if (!appointmentForm.babyId || !appointmentForm.poolId) return;

    addToWaitlist({
      babyId: appointmentForm.babyId,
      poolId: appointmentForm.poolId,
      date: appointmentForm.date,
      startTime: appointmentForm.startTime,
      endTime: appointmentForm.endTime,
      status: 'scheduled',
      isFromCycle: false,
    });

    setCapacityWarning(null);
    setShowAppointmentModal(false);
    showToast('已加入候补队列', 'success');
  };

  const handleCancelAppointment = (id: string) => {
    if (confirm('确定要取消这个预约吗？')) {
      const result = cancelAppointment(id);
      if (result.promoted && result.promoted.length > 0) {
        const promotedBaby = babies.find((b) => b.id === result.promoted![0].babyId);
        showToast(`候补宝宝 ${promotedBaby?.name || '未知'} 已自动转正`, 'info');
      }
      setShowAppointmentModal(false);
    }
  };

  const handleCompleteAppointment = () => {
    if (!editingAppointmentId) return;
    const apt = appointments.find((a) => a.id === editingAppointmentId);
    if (!apt) return;

    const babyCards = memberCards.filter((c) => c.babyId === apt.babyId && c.remainingQuota > 0);
    const cardToUse = babyCards[0];

    const result = settleAppointment({
      appointmentId: editingAppointmentId,
      cardId: cardToUse?.id || null,
      paymentType: cardToUse ? 'quota' : 'self-pay',
      selfPayAmount: cardToUse?.selfPayPrice || 88,
      operator: '前台',
    });

    showToast(result.message, result.success ? 'success' : 'info');
    setShowAppointmentModal(false);
  };

  const currentPool = pools.find((p) => p.id === selectedPool);

  const editingAppointment = editingAppointmentId
    ? appointments.find((a) => a.id === editingAppointmentId)
    : null;

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MM月dd日', { locale: zhCN });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {waitlistNotifications.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-amber-800 font-medium">
                  🎉 候补转正提醒：
                  {waitlistNotifications.map((n, i) => (
                    <span key={i}>
                      {i > 0 && '、'}
                      <span className="font-semibold">{n.babyName}</span> 在 {n.poolName} {formatDate(n.date)} 已自动转正
                    </span>
                  ))}
                </p>
              </div>
            </div>
            <button
              onClick={clearWaitlistNotifications}
              className="p-2 hover:bg-amber-100 rounded-xl transition-colors"
            >
              <X className="w-4 h-4 text-amber-600" />
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg animate-slide-up flex items-center gap-2 ${
            toast.type === 'success' ? 'bg-success-500 text-white' : 'bg-primary-500 text-white'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">泳池排期</h1>
          <p className="text-gray-500 mt-1">查看和管理泳池预约安排</p>
        </div>
        <div className="flex gap-3">
          <button onClick={openAddPool} className="btn-secondary flex items-center gap-2">
            <Settings className="w-4 h-4" />
            泳池管理
          </button>
          <button onClick={openAddAppointment} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            新建预约
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {pools.map((pool) => (
            <button
              key={pool.id}
              onClick={() => setSelectedPool(pool.id)}
              className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                selectedPool === pool.id
                  ? 'bg-primary-500 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-50 shadow-soft'
              }`}
            >
              <Waves className="w-4 h-4 inline mr-1" />
              {pool.name}
              {pool.status === 'maintenance' && (
                <span className="ml-2 text-xs bg-warning-100 text-warning-600 px-2 py-0.5 rounded-full">
                  维护中
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePrevWeek}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-800">
                {format(weekStart, 'yyyy年MM月dd日', { locale: zhCN })} - {format(weekEnd, 'MM月dd日', { locale: zhCN })}
              </h2>
              <p className="text-sm text-gray-500">{currentPool?.name} · 容量 {currentPool?.capacity}人</p>
            </div>
            <button
              onClick={handleNextWeek}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-sm bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              本周
            </button>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gradient-to-r from-primary-400 to-primary-500"></span>
              预约中
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-400"></span>
              候补中
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-success-400"></span>
              已完成
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-danger-400"></span>
              未到店
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-8 gap-2 mb-3">
              <div className="text-center text-sm text-gray-400 py-2">
                <Clock className="w-4 h-4 mx-auto" />
              </div>
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={`text-center py-2 rounded-xl ${
                    isSameDay(day, new Date())
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600'
                  }`}
                >
                  <p className="text-xs">{WEEKDAYS[day.getDay()]}</p>
                  <p className="text-lg font-bold">{format(day, 'd')}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {TIME_SLOTS.map((time) => (
                <div key={time} className="grid grid-cols-8 gap-2">
                  <div className="text-center text-sm text-gray-400 py-3">{time}</div>
                  {weekDays.map((day) => {
                    const slotAppointments = getAppointmentsForSlot(day, time);
                    const isToday = isSameDay(day, new Date());
                    const { count, capacity } = getSlotCapacityInfo(day, time);
                    const isFull = capacity > 0 && count >= capacity;

                    return (
                      <div
                        key={`${day.toISOString()}-${time}`}
                        className={`min-h-[60px] p-1.5 rounded-xl transition-colors relative ${
                          isToday ? 'bg-primary-50/50' : 'bg-gray-50/50'
                        } hover:bg-gray-100/50`}
                      >
                        <div className={`absolute top-1 right-1 text-[10px] font-medium px-1 rounded ${
                          isFull
                            ? 'text-danger-600 font-bold'
                            : count > 0
                              ? 'text-primary-600'
                              : 'text-gray-400'
                        }`}>
                          {count}/{capacity}
                        </div>
                        {slotAppointments.length > 0 && (
                          <div className="space-y-1 mt-4">
                            {slotAppointments.map((apt) => {
                              const baby = babies.find((b) => b.id === apt.babyId);
                              if (apt.startTime !== time) return null;
                              return (
                                <div
                                  key={apt.id}
                                  onClick={() => openEditAppointment(apt)}
                                  className={`px-2 py-1.5 rounded-lg text-xs text-white cursor-pointer hover:opacity-90 transition-opacity relative ${
                                    apt.isWaitlist
                                      ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                                      : apt.status === 'scheduled'
                                        ? 'bg-gradient-to-r from-primary-400 to-primary-500'
                                        : apt.status === 'completed'
                                          ? 'bg-gradient-to-r from-success-400 to-success-500'
                                          : 'bg-gradient-to-r from-danger-400 to-danger-500'
                                  }`}
                                  title={`点击编辑: ${baby?.name} - ${apt.startTime}~${apt.endTime}`}
                                >
                                  {apt.isWaitlist && apt.waitlistPosition && (
                                    <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[9px] px-1 rounded-full font-bold">
                                      候补#{apt.waitlistPosition}
                                    </span>
                                  )}
                                  <span className="truncate block pr-4">{baby?.name}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Waves className="w-5 h-5 text-primary-500" />
              泳池信息
            </h3>
            <button onClick={openAddPool} className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              <Plus className="w-4 h-4" /> 新增
            </button>
          </div>
          <div className="space-y-3">
            {pools.map((pool) => (
              <div
                key={pool.id}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedPool === pool.id
                    ? 'border-primary-300 bg-primary-50/50'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{pool.name}</p>
                    <p className="text-sm text-gray-500">适用: {pool.ageRange}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary-600">{pool.capacity}人</p>
                      <span className={`badge ${
                        pool.status === 'active' ? 'bg-success-100 text-success-600' :
                        pool.status === 'maintenance' ? 'bg-warning-100 text-warning-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {pool.status === 'active' ? '使用中' :
                         pool.status === 'maintenance' ? '维护中' : '停用'}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditPool(pool)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => handleDeletePool(pool.id)}
                        className="p-2 hover:bg-danger-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-danger-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-500" />
            今日预约详情
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {appointments
              .filter((a) => a.date === new Date().toISOString().split('T')[0] && a.poolId === selectedPool && a.status !== 'cancelled')
              .sort((a, b) => {
                if (a.isWaitlist !== b.isWaitlist) return a.isWaitlist ? 1 : -1;
                return a.startTime.localeCompare(b.startTime);
              })
              .map((apt) => {
                const baby = babies.find((b) => b.id === apt.babyId);
                return (
                  <div
                    key={apt.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors group"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm ${
                        apt.isWaitlist ? 'bg-gradient-to-br from-amber-400 to-orange-400' : ''
                      }`}
                      style={!apt.isWaitlist ? { backgroundColor: baby?.avatarColor || '#ccc' } : {}}
                    >
                      {baby?.name?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 flex items-center gap-2">
                        {baby?.name}
                        {apt.isWaitlist && apt.waitlistPosition && (
                          <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                            候补#{apt.waitlistPosition}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {apt.startTime} - {apt.endTime} · {baby?.parentName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${
                        apt.isWaitlist ? 'bg-amber-100 text-amber-600' :
                        apt.status === 'scheduled' ? 'bg-primary-100 text-primary-600' :
                        apt.status === 'completed' ? 'bg-success-100 text-success-600' :
                        apt.status === 'cancelled' ? 'bg-gray-100 text-gray-500' :
                        'bg-danger-100 text-danger-600'
                      }`}>
                        {apt.isWaitlist ? '候补中' :
                         apt.status === 'scheduled' ? '待游泳' :
                         apt.status === 'completed' ? '已完成' :
                         apt.status === 'cancelled' ? '已取消' : '未到店'}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditAppointment(apt)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg"
                        >
                          <Edit className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                        <button
                          onClick={() => handleCancelAppointment(apt.id)}
                          className="p-1.5 hover:bg-danger-50 rounded-lg"
                        >
                          <X className="w-3.5 h-3.5 text-danger-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            {appointments.filter((a) => a.date === new Date().toISOString().split('T')[0] && a.poolId === selectedPool && a.status !== 'cancelled').length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>今日暂无预约</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showPoolModal}
        onClose={() => setShowPoolModal(false)}
        title={editingPool ? '编辑泳池' : '新增泳池'}
        size="sm"
        footer={
          <>
            <button onClick={() => setShowPoolModal(false)} className="btn-secondary">
              取消
            </button>
            <button onClick={handleSavePool} className="btn-primary">
              <CheckCircle className="w-4 h-4 inline mr-1" />
              保存
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">泳池名称</label>
            <input
              type="text"
              value={poolForm.name}
              onChange={(e) => setPoolForm({ ...poolForm, name: e.target.value })}
              placeholder="如：小海豚泳池"
              className="input-field"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">容量（人）</label>
            <input
              type="number"
              min={1}
              value={poolForm.capacity}
              onChange={(e) => setPoolForm({ ...poolForm, capacity: parseInt(e.target.value) || 1 })}
              className="input-field"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">适用月龄范围</label>
            <input
              type="text"
              value={poolForm.ageRange}
              onChange={(e) => setPoolForm({ ...poolForm, ageRange: e.target.value })}
              placeholder="如：0-6个月"
              className="input-field"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">状态</label>
            <select
              value={poolForm.status}
              onChange={(e) => setPoolForm({ ...poolForm, status: e.target.value as Pool['status'] })}
              className="input-field"
            >
              <option value="active">使用中</option>
              <option value="maintenance">维护中</option>
              <option value="inactive">停用</option>
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showAppointmentModal}
        onClose={() => {
          setShowAppointmentModal(false);
          setCapacityWarning(null);
        }}
        title={isEditAppointment ? '编辑预约' : '新建预约'}
        size="sm"
        footer={
          <>
            <button onClick={() => { setShowAppointmentModal(false); setCapacityWarning(null); }} className="btn-secondary">
              取消
            </button>
            {capacityWarning && capacityWarning.conflict && !isEditAppointment && (
              <button
                onClick={handleAddToWaitlist}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-1"
              >
                <Clock className="w-4 h-4" />
                加入候补
              </button>
            )}
            {isEditAppointment && editingAppointment?.status === 'scheduled' && (
              <button
                onClick={handleCompleteAppointment}
                className="bg-success-500 hover:bg-success-600 text-white px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-1"
              >
                <CheckCircle className="w-4 h-4" />
                完成游泳
              </button>
            )}
            {isEditAppointment && (
              <button
                onClick={() => {
                  if (editingAppointmentId) handleCancelAppointment(editingAppointmentId);
                }}
                className="btn-danger"
              >
                取消预约
              </button>
            )}
            <button onClick={handleSaveAppointment} className="btn-primary">
              <CheckCircle className="w-4 h-4 inline mr-1" />
              {isEditAppointment ? '保存修改' : '确认预约'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {capacityWarning && capacityWarning.conflict && (
            <div className="bg-danger-50 border border-danger-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-danger-700 font-medium mb-2">
                <AlertTriangle className="w-5 h-5" />
                该时段已满，剩余名额: 0
              </div>
              <div className="text-sm text-danger-600">
                <p className="mb-2">已预约宝宝：</p>
                <div className="space-y-1">
                  {capacityWarning.conflictingBabies.map((b) => (
                    <div key={b.babyId} className="flex items-center gap-2 bg-danger-100 text-danger-700 px-2 py-1 rounded-lg text-xs">
                      <User className="w-3 h-3" />
                      <span className="font-medium">{b.babyName}</span>
                      <span className="text-danger-500">{b.startTime}~{b.endTime}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-danger-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  可点击"加入候补"按钮进入候补队列
                </p>
              </div>
            </div>
          )}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">选择宝宝</label>
            <select
              value={appointmentForm.babyId}
              onChange={(e) => { setAppointmentForm({ ...appointmentForm, babyId: e.target.value }); setCapacityWarning(null); }}
              className="input-field"
            >
              {babies.map((baby) => (
                <option key={baby.id} value={baby.id}>
                  {baby.name}（{baby.ageMonths}个月）
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">选择泳池</label>
            <select
              value={appointmentForm.poolId}
              onChange={(e) => { setAppointmentForm({ ...appointmentForm, poolId: e.target.value }); setCapacityWarning(null); }}
              className="input-field"
            >
              {pools.filter((p) => p.status === 'active').map((pool) => (
                <option key={pool.id} value={pool.id}>
                  {pool.name}（{pool.ageRange}）
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">预约日期</label>
            <input
              type="date"
              value={appointmentForm.date}
              onChange={(e) => { setAppointmentForm({ ...appointmentForm, date: e.target.value }); setCapacityWarning(null); }}
              className="input-field"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">开始时间</label>
              <input
                type="time"
                step="900"
                value={appointmentForm.startTime}
                onChange={(e) => { setAppointmentForm({ ...appointmentForm, startTime: e.target.value }); setCapacityWarning(null); }}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">结束时间</label>
              <input
                type="time"
                step="900"
                value={appointmentForm.endTime}
                onChange={(e) => { setAppointmentForm({ ...appointmentForm, endTime: e.target.value }); setCapacityWarning(null); }}
                className="input-field"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
