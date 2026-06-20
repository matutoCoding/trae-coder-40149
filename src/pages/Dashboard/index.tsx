
import { useAppStore } from '@/store/appStore';
import { Users, Calendar, CreditCard, TrendingUp, Waves, Thermometer } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { format, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';

function generateChartData() {
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const date = subDays(new Date(), i);
    data.push({
      date: format(date, 'MM/dd'),
      预约数: Math.floor(Math.random() * 10) + 10,
      到店数: Math.floor(Math.random() * 8) + 8,
      收入: Math.floor(Math.random() * 500) + 300,
    });
  }
  return data;
}

function generateMonthData() {
  const data = [];
  for (let i = 29; i >= 0; i--) {
    const date = subDays(new Date(), i);
    data.push({
      date: format(date, 'dd'),
      消费人次: Math.floor(Math.random() * 15) + 5,
    });
  }
  return data;
}

export default function Dashboard() {
  const { babies, appointments, memberCards, consumptions, pools, waterRecords } = useAppStore();
  
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
  
  const chartData = generateChartData();
  const monthData = generateMonthData();
  
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
      subtext: `本周已使用 ${memberCards.reduce((s, c) => s + (c.totalQuota - c.remainingQuota), 0)} 次`,
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
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">欢迎回来 👋</h1>
          <p className="text-gray-500 mt-1">今天是{format(new Date(), 'yyyy年MM月dd日 EEEE', { locale: zhCN })}</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary">导出报表</button>
          <button className="btn-primary">新建预约</button>
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
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card animate-slide-up animation-delay-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">近7天预约趋势</h3>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary-400"></span>
                预约数
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-success-400"></span>
                到店数
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
                  <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#81C784" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#81C784" stopOpacity={0} />
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
                <Area type="monotone" dataKey="到店数" stroke="#81C784" strokeWidth={2} fillOpacity={1} fill="url(#colorVisits)" />
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
          <h3 className="text-lg font-semibold text-gray-800 mb-4">今日预约列表</h3>
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
                      <p className="font-medium text-gray-800 truncate">{baby?.name}</p>
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
