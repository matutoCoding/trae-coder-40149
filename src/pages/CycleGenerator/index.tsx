
import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { Repeat, Plus, Settings, Clock, Waves, Baby, Calendar, RefreshCw } from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export default function CycleGenerator() {
  const {
    babies,
    pools,
    cycleRules,
    currentCycleRule,
    setCurrentCycleRule,
    generateCycleAppointments,
    appointments,
  } = useAppStore();
  
  const [selectedBaby, setSelectedBaby] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 4), 'yyyy-MM-dd'));
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
  
  const handleGenerate = () => {
    if (!currentCycleRule) return;
    setIsGenerating(true);
    
    const beforeCount = appointments.length;
    generateCycleAppointments(startDate, endDate, currentCycleRule.id);
    
    setTimeout(() => {
      setGeneratedCount(appointments.length - beforeCount);
      setIsGenerating(false);
    }, 800);
  };
  
  const selectedBabyData = babies.find((b) => b.id === selectedBaby);
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">周期生成</h1>
          <p className="text-gray-500 mt-1">按周期批量生成宝宝游泳预约</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary flex items-center gap-2">
            <Settings className="w-4 h-4" />
            周期规则
          </button>
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            添加宝宝
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Repeat className="w-5 h-5 text-primary-500" />
              周期规则
            </h3>
            <div className="space-y-3">
              {cycleRules.map((rule) => (
                <div
                  key={rule.id}
                  onClick={() => setCurrentCycleRule(rule)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    currentCycleRule?.id === rule.id
                      ? 'border-primary-400 bg-primary-50'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{rule.name}</p>
                      <p className="text-sm text-gray-500">
                        {rule.cycleType === 'weekly' ? '周周期' : '月周期'} · 
                        {rule.cycleType === 'weekly' 
                          ? `每周${WEEKDAYS[rule.startDay]}开始`
                          : `每月${rule.startDay}日开始`
                        }
                      </p>
                    </div>
                    {rule.isDefault && (
                      <span className="badge bg-primary-100 text-primary-600">默认</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-500" />
              生成设置
            </h3>
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
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Repeat className="w-4 h-4" />
                )}
                {isGenerating ? '生成中...' : '批量生成预约'}
              </button>
              {generatedCount > 0 && (
                <p className="text-sm text-center text-success-600">
                  ✓ 成功生成 {generatedCount} 条预约
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Baby className="w-5 h-5 text-primary-500" />
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
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">固定时段: {baby.fixedSchedule?.length || 0} 个</p>
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
                <button className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
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
                      className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary-50 to-cyan-50 rounded-xl"
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
                        {pool?.name}
                      </div>
                    </div>
                  );
                })}
                
                {(!selectedBabyData.fixedSchedule || selectedBabyData.fixedSchedule.length === 0) && (
                  <div className="text-center py-8 text-gray-400">
                    <Clock className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>暂无固定时段</p>
                  </div>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100">
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
    </div>
  );
}
