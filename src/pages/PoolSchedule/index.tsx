
import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { ChevronLeft, ChevronRight, Plus, Settings, Clock, Users } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, addWeeks } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const TIME_SLOTS = ['09:00', '09:45', '10:30', '11:15', '14:00', '14:45', '15:30', '16:15'];

export default function PoolSchedule() {
  const { pools, babies, appointments, updateAppointment, deleteAppointment } = useAppStore();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedPool, setSelectedPool] = useState(pools[0]?.id || '');
  const [showPoolSettings, setShowPoolSettings] = useState(false);
  
  const weekStart = startOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  const filteredAppointments = appointments.filter(
    (a) => a.poolId === selectedPool && a.status !== 'cancelled'
  );
  
  const getAppointmentsForSlot = (date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return filteredAppointments.filter(
      (a) => a.date === dateStr && a.startTime <= time && a.endTime > time
    );
  };
  
  const handlePrevWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, -1));
  const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const handleToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  const currentPool = pools.find((p) => p.id === selectedPool);
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">泳池排期</h1>
          <p className="text-gray-500 mt-1">查看和管理泳池预约安排</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary flex items-center gap-2">
            <Settings className="w-4 h-4" />
            泳池管理
          </button>
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            新建预约
          </button>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
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
              className="px-3 py-1.5 text-sm bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors"
            >
              本周
            </button>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-primary-400"></span>
              预约中
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
                  <div className="text-center text-sm text-gray-400 py-3">
                    {time}
                  </div>
                  {weekDays.map((day) => {
                    const slotAppointments = getAppointmentsForSlot(day, time);
                    const isToday = isSameDay(day, new Date());
                    
                    return (
                      <div
                        key={`${day.toISOString()}-${time}`}
                        className={`min-h-[60px] p-1.5 rounded-xl transition-colors ${
                          isToday ? 'bg-primary-50/50' : 'bg-gray-50/50'
                        } hover:bg-gray-100/50`}
                      >
                        {slotAppointments.length > 0 && (
                          <div className="space-y-1">
                            {slotAppointments.map((apt) => {
                              const baby = babies.find((b) => b.id === apt.babyId);
                              return (
                                <div
                                  key={apt.id}
                                  className={`px-2 py-1.5 rounded-lg text-xs text-white cursor-pointer hover:opacity-90 transition-opacity truncate ${
                                    apt.status === 'scheduled' ? 'bg-gradient-to-r from-primary-400 to-primary-500' :
                                    apt.status === 'completed' ? 'bg-gradient-to-r from-success-400 to-success-500' :
                                    'bg-gradient-to-r from-danger-400 to-danger-500'
                                  }`}
                                  title={`${baby?.name} - ${apt.startTime}~${apt.endTime}`}
                                >
                                  {baby?.name}
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
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-500" />
            泳池信息
          </h3>
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
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">今日预约详情</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {appointments
              .filter((a) => a.date === new Date().toISOString().split('T')[0] && a.poolId === selectedPool && a.status !== 'cancelled')
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((apt) => {
                const baby = babies.find((b) => b.id === apt.babyId);
                return (
                  <div
                    key={apt.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm"
                      style={{ backgroundColor: baby?.avatarColor || '#ccc' }}
                    >
                      {baby?.name?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{baby?.name}</p>
                      <p className="text-xs text-gray-500">
                        {apt.startTime} - {apt.endTime} · {baby?.parentName}
                      </p>
                    </div>
                    <span className={`badge ${
                      apt.status === 'scheduled' ? 'bg-primary-100 text-primary-600' :
                      apt.status === 'completed' ? 'bg-success-100 text-success-600' :
                      apt.status === 'cancelled' ? 'bg-gray-100 text-gray-500' :
                      'bg-danger-100 text-danger-600'
                    }`}>
                      {apt.status === 'scheduled' ? '待游泳' :
                       apt.status === 'completed' ? '已完成' :
                       apt.status === 'cancelled' ? '已取消' : '未到店'}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
