import { useAppStore } from '@/store/appStore';
import { Users, Calendar, CreditCard, TrendingUp, Waves, Thermometer, Users2, Clock, DollarSign, Ticket, ArrowRight, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { format, addDays, isToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

function isOverlapping(s1: string, e1: string, s2: string, e2: string): boolean {
  const start1 = timeToMinutes(s1);
  const end1 = timeToMinutes(e1);
  const start2 = timeToMinutes(s2);
  const end2 = timeToMinutes(e2);
  return start1 < end2 && start2 < end1;
}

export default function Dashboard() {
  const { babies, appointments, memberCards, consumptions, pools, waterRecords } = useAppStore();
  const navigate = useNavigate();

  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter((a) => a.date === today && a.status !== 'cancelled');
  const todayCompleted = appointments.filter((a) => a.date === today && a.status === 'completed');
  const activeMembers = memberCards.filter((c) => c.remainingQuota > 0).length;

  const thisMonthConsumptions = consumptions.filter((c) => {
    const date = new Date(c.time);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });

  const monthRevenue = thisMonthConsumptions.reduce((sum, c) => sum + c.amount, 0);

  const weekDates = Array.from({ length: 7 }, (_, i) => format(addDays(new Date(), i), 'yyyy-MM-dd'));

  const poolWeekStats = pools.map((pool) => {
    let totalScheduled = 0;
    let totalWaitlist = 0;
    let totalQuotaConsume = 0;
    let peakLoadRate = 0;
    let unsettledAmount = 0;

    weekDates.forEach((dateStr) => {
      const dayApts = appointments.filter(
        (a) => a.poolId === pool.id && a.date === dateStr && a.status !== 'cancelled'
      );
      const scheduled = dayApts.filter((a) => !a.isWaitlist);
      const waitlist = dayApts.filter((a) => a.isWaitlist);

      totalScheduled += scheduled.length;
      totalWaitlist += waitlist.length;

      scheduled.forEach((apt) => {
        if (apt.memberCardId) totalQuotaConsume++;
        else unsettledAmount += 88;
      });

      const hours = [];
      for (let h = 8; h < 20; h++) {
        const startTime = `${String(h).padStart(2, '0')}:00`;
        const endTime = `${String(h + 1).padStart(2, '0')}:00`;
        const overlapping = scheduled.filter((a) => isOverlapping(a.startTime, a.endTime, startTime, endTime));
        if (pool.capacity > 0) {
          const loadRate = overlapping.length / pool.capacity;
          if (loadRate > peakLoadRate) peakLoadRate = loadRate;
        }
      }
    });

    const avgDailyScheduled = totalScheduled / 7;
    const avgLoadRate = pool.capacity > 0 ? avgDailyScheduled / (pool.capacity * 12) * 100 : 0;

    return {
      pool,
      totalScheduled,
      totalWaitlist,
      totalQuotaConsume,
      unsettledAmount,
      avgLoadRate: Math.min(100, Math.round(avgLoadRate * 10)),
      peakLoadRate: Math.min(100, Math.round(peakLoadRate * 100)),
    };
  });

  const chartData = weekDates.map((dateStr) => {
    const date = new Date(dateStr);
    const dayApts = appointments.filter((a) => a.date === dateStr && a.status !== 'cancelled');
    const scheduled = dayApts.filter((a) => !a.isWaitlist).length;
    const waitlist = dayApts.filter((a) => a.isWaitlist).length;
    return {
      date: format(date, 'MM/dd'),
      预约数: scheduled,
      候補数: waitlist,
    };
  });

  const monthData = Array.from({ length: 30 }, (_, i) => {
    const date = addDays(new Date(), -29 + i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayConsumptions = consumptions.filter((c) => c.time.startsWith(dateStr) && c.adjustType !== 'refund');
    return {
      date: format(date, 'dd'),
      消费人次: dayConsumptions.length,
    };
  });

  const todayWaterRecords = waterRecords.filter((r) => r.date === today);

  const stats = [
    {
      label: '今日预约',
      value: todayAppointments.length,
      icon: Calendar,
      color: 'from-primary-400 to-primary-600',
      bgColor: 'bg-primary-50',
      subtext: `已完成 ${todayCompleted.length} 位`,
    },
    {
      label: '在籍宝宝',
      value: babies.length,
      icon: Users,
      color: 'from-secondary-400 to-secondary-500',
      bgColor: 'bg-secondary-50',
      subtext: `活跃会员 ${activeMembers} 位`,
    },
    {
      label: '次卡总数',
      value: memberCards.length,
      icon: CreditCard,
      color: 'from-accent-400 to-accent-500',
      bgColor: 'bg-accent-50',
      subtext: `剩余 ${memberCards.reduce((s, c) => s + c.remainingQuota, 0)} 次`,
    },
    {
      label: '本月收入',
      value: `¥${monthRevenue}`,
      icon: TrendingUp,
      color: 'from-success-400 to-success-500',
      bgColor: 'bg-success-50',
      subtext: `共 ${thisMonthConsumptions.length} 笔消费`,
    },
  ];

  const loadRateColor = (rate: number) => {
    if (rate >= 90) return 'text-danger-600';
    if (rate >= 70) return 'text-warning-600';
    return 'text-success-600';
  };

  const loadRateBg = (rate: number) => {
    if (rate >= 90) return 'bg-danger-100';
    if (rate >= 70) return 'bg-warning-100';
    return 'bg-success-100';
  };

  const loadRateBarColor = (rate: number) => {
    if (rate >= 90) return 'bg-danger-500';
    if (rate >= 70) return 'bg-warning-500';
    return 'bg-success-500';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">运营看板 👋</h1>
          <p className="text-gray-500 mt-1">今天是{format(new Date(), 'yyyy年MM月dd日 EEEE', { locale: zhCN })}</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary">导出报表</button>
          <button className="btn-primary" onClick={() => navigate('/schedule')}>新建预约</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="card animate-slide-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 text-sm">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-1">{stat.subtext}</p>
              </div>
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card animate-slide-up animation-delay-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">未来一周泳池运营概览</h3>
            <p className="text-sm text-gray-500 mt-1">点击卡片可跳转到对应泳池的排期页面</p>
          </div>
          <button 
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium"
            onClick={() => navigate('/schedule')}
          >
            查看全部排期 <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {poolWeekStats.map((stat, idx) => (
            <div
              key={stat.pool.id}
              className="p-5 rounded-2xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all cursor-pointer bg-white"
              style={{ animationDelay: `${(idx + 1) * 100}ms` }}
              onClick={() => navigate('/schedule')}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center">
                  <Waves className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{stat.pool.name}</p>
                  <p className="text-xs text-gray-500">容量 {stat.pool.capacity} 位</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Users2 className="w-3 h-3" /> 高峰满载率
                    </span>
                    <span className={`text-sm font-bold ${loadRateColor(stat.peakLoadRate)}`}>
                      {stat.peakLoadRate}%
                    </span>
                  </div>
                  <div className={`h-2 rounded-full ${loadRateBg(stat.peakLoadRate)} overflow-hidden`}>
                    <div
                      className={`h-full rounded-full ${loadRateBarColor(stat.peakLoadRate)} transition-all`}
                      style={{ width: `${stat.peakLoadRate}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 rounded-xl bg-warning-50">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 候补人数
                    </p>
                    <p className={`text-lg font-bold mt-1 ${stat.totalWaitlist > 0 ? 'text-warning-600' : 'text-gray-400'}`}>
                      {stat.totalWaitlist}
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-success-50">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Ticket className="w-3 h-3" /> 次卡消耗
                    </p>
                    <p className="text-lg font-bold mt-1 text-success-600">{stat.totalQuotaConsume}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> 待结算金额
                    </span>
                    <span className="text-sm font-bold text-primary-600">
                      ¥{stat.unsettledAmount + stat.totalQuotaConsume * 88}
                    </span>
                  </div>
                </div>

                {stat.peakLoadRate >= 90 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-danger-50 text-danger-600 text-xs">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>高峰时段已满负荷，请注意</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card animate-slide-up animation-delay-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">未来7天预约趋势</h3>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary-400"></span>
                预约数
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-warning-400"></span>
                候補数
              </span>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAppointments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4FC3F7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4FC3F7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorWaitlist" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFB74D" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FFB74D" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#999' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#999' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  }}
                />
                <Area type="monotone" dataKey="预约数" stroke="#4FC3F7" strokeWidth={2} fillOpacity={1} fill="url(#colorAppointments)" />
                <Area type="monotone" dataKey="候補数" stroke="#FFB74D" strokeWidth={2} fillOpacity={1} fill="url(#colorWaitlist)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card animate-slide-up animation-delay-300">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">今日水温</h3>
          <div className="space-y-4">
            {pools.slice(0, 3).map((pool) => {
              const record = todayWaterRecords.find((r) => r.poolId === pool.id);
              return (
                <div key={pool.id} className="p-4 bg-gradient-to-r from-primary-50 to-cyan-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <Waves className="w-5 h-5 text-primary-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{pool.name}</p>
                        <p className="text-xs text-gray-500">{pool.ageRange}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {record ? (
                        <>
                          <p className="text-lg font-bold text-primary-600 flex items-center gap-1">
                            <Thermometer className="w-4 h-4" />
                            {record.temperature}°C
                          </p>
                          <p className="text-xs text-gray-500">{record.disinfection}</p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-400">未记录</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card animate-slide-up animation-delay-400">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">近30天消费人次</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#999' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  }}
                />
                <Bar dataKey="消费人次" fill="url(#colorBar)" radius={[4, 4, 0, 0]} />
                <defs>
                  <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4FC3F7" />
                    <stop offset="100%" stopColor="#81D4FA" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card animate-slide-up animation-delay-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">今日预约列表</h3>
            <button 
              className="text-xs text-primary-600 hover:text-primary-700"
              onClick={() => navigate('/schedule')}
            >
              全部
            </button>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {todayAppointments.length > 0 ? (
              todayAppointments.slice(0, 6).map((apt) => {
                const baby = babies.find((b) => b.id === apt.babyId);
                const pool = pools.find((p) => p.id === apt.poolId);
                return (
                  <div key={apt.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm"
                      style={{ backgroundColor: baby?.avatarColor || '#ccc' }}
                    >
                      {baby?.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">
                        {baby?.name}
                        {apt.isWaitlist && <span className="ml-1 text-xs text-warning-600">(候补)</span>}
                      </p>
                      <p className="text-xs text-gray-500">{pool?.name} · {apt.startTime}-{apt.endTime}</p>
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
              })
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>今日暂无预约</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
