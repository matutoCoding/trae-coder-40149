
import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { Receipt, Thermometer, Search, Download, Plus, CheckCircle2, Waves, Link2, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import Modal from '@/components/Modal';

export default function Consumption() {
  const {
    consumptions,
    babies,
    appointments,
    memberCards,
    pools,
    waterRecords,
    addWaterRecord,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'consumption' | 'water'>('consumption');
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPool, setFilterPool] = useState('all');

  const [showAddWaterModal, setShowAddWaterModal] = useState(false);
  const [waterForm, setWaterForm] = useState({
    poolId: pools[0]?.id || '',
    date: format(new Date(), 'yyyy-MM-dd'),
    temperature: 37.0,
    disinfection: '氯消毒 0.3mg/L',
    recorder: '李救生员',
  });

  const filteredConsumptions = consumptions.filter((c) => {
    const baby = babies.find((b) => b.id === c.babyId);
    const matchSearch = baby?.name.includes(searchText) || searchText === '';
    const matchType = filterType === 'all' || c.type === filterType;
    return matchSearch && matchType;
  });

  const filteredWaterRecords = waterRecords.filter((r) => {
    return filterPool === 'all' || r.poolId === filterPool;
  });

  const quotaCount = consumptions.filter((c) => c.type === 'quota').length;
  const selfPayCount = consumptions.filter((c) => c.type === 'self-pay').length;
  const selfPayAmount = consumptions.filter((c) => c.type === 'self-pay').reduce((sum, c) => sum + c.amount, 0);
  const linkedCount = consumptions.filter((c) => c.appointmentId).length;

  const getBabyById = (babyId: string) => babies.find((b) => b.id === babyId);
  const getPoolById = (poolId: string) => pools.find((p) => p.id === poolId);
  const getAppointmentById = (aptId: string) => appointments.find((a) => a.id === aptId);
  const getCardById = (cardId: string) => memberCards.find((c) => c.id === cardId);

  const handleAddWaterRecord = () => {
    if (!waterForm.poolId) return;
    addWaterRecord({
      ...waterForm,
      temperature: Number(waterForm.temperature.toFixed(1)),
      recordTime: `${waterForm.date} ${format(new Date(), 'HH:mm')}`,
    });
    setShowAddWaterModal(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">消费明细</h1>
          <p className="text-gray-500 mt-1">查看消费记录和水温消毒记录</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            导出报表
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="card animate-slide-up">
          <p className="text-sm text-gray-500">总消费笔数</p>
          <p className="text-2xl font-bold text-gray-800 mt-2">{consumptions.length}</p>
        </div>
        <div className="card animate-slide-up animation-delay-100">
          <p className="text-sm text-gray-500">次卡消费</p>
          <p className="text-2xl font-bold text-primary-600 mt-2">{quotaCount} 次</p>
        </div>
        <div className="card animate-slide-up animation-delay-200">
          <p className="text-sm text-gray-500">自费消费</p>
          <p className="text-2xl font-bold text-accent-600 mt-2">{selfPayCount} 次</p>
        </div>
        <div className="card animate-slide-up animation-delay-300">
          <p className="text-sm text-gray-500">自费收入</p>
          <p className="text-2xl font-bold text-success-600 mt-2">¥{selfPayAmount}</p>
        </div>
        <div className="card animate-slide-up animation-delay-400">
          <p className="text-sm text-gray-500">预约关联</p>
          <p className="text-2xl font-bold text-secondary-500 mt-2">{linkedCount} 条</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('consumption')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'consumption'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Receipt className="w-4 h-4" />
              消费记录
            </button>
            <button
              onClick={() => setActiveTab('water')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'water'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Thermometer className="w-4 h-4" />
              水温消毒
            </button>
          </div>
        </div>

        {activeTab === 'consumption' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="搜索宝宝姓名..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm w-48 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="input-field text-sm py-2 w-36"
                >
                  <option value="all">全部类型</option>
                  <option value="quota">次卡扣费</option>
                  <option value="self-pay">自费消费</option>
                </select>
              </div>
              <span className="text-sm text-gray-500">
                共 {filteredConsumptions.length} 条记录
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                    <th className="pb-3 font-medium">时间</th>
                    <th className="pb-3 font-medium">宝宝</th>
                    <th className="pb-3 font-medium">消费类型</th>
                    <th className="pb-3 font-medium">金额</th>
                    <th className="pb-3 font-medium">关联预约</th>
                    <th className="pb-3 font-medium">使用次卡</th>
                    <th className="pb-3 font-medium">操作员</th>
                    <th className="pb-3 font-medium">备注</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConsumptions.slice(0, 30).map((item) => {
                    const baby = getBabyById(item.babyId);
                    const appointment = item.appointmentId ? getAppointmentById(item.appointmentId) : null;
                    const appointmentPool = appointment ? getPoolById(appointment.poolId) : null;
                    const card = item.cardId ? getCardById(item.cardId) : null;

                    return (
                      <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-4 text-sm text-gray-600">{item.time}</td>
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                              style={{ backgroundColor: baby?.avatarColor || '#ccc' }}
                            >
                              {baby?.name?.charAt(0)}
                            </div>
                            <span className="font-medium text-gray-800">{baby?.name}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className={`badge ${
                            item.type === 'quota'
                              ? 'bg-primary-100 text-primary-600'
                              : item.type === 'self-pay'
                              ? 'bg-accent-100 text-accent-600'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {item.type === 'quota' ? '次卡扣费' :
                             item.type === 'self-pay' ? '自费消费' : '其他'}
                          </span>
                        </td>
                        <td className="py-4">
                          <span className={`font-medium ${
                            item.type === 'self-pay' ? 'text-success-600' : 'text-gray-600'
                          }`}>
                            {item.type === 'quota' ? '扣次' : `¥${item.amount}`}
                          </span>
                        </td>
                        <td className="py-4">
                          {appointment ? (
                            <div className="flex items-center gap-1.5">
                              <Link2 className="w-3.5 h-3.5 text-primary-400" />
                              <div className="text-xs">
                                <p className="text-gray-700 font-medium">{appointment.date}</p>
                                <p className="text-gray-500">{appointment.startTime}-{appointment.endTime} · {appointmentPool?.name}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-4">
                          {card ? (
                            <div className="flex items-center gap-1.5">
                              <CreditCard className="w-3.5 h-3.5 text-accent-400" />
                              <span className="text-xs text-gray-600">{card.cardType}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-4 text-sm text-gray-600">{item.operator}</td>
                        <td className="py-4 text-sm text-gray-500 max-w-[200px] truncate" title={item.remark}>{item.remark}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredConsumptions.length > 30 && (
              <div className="text-center mt-4">
                <button className="btn-secondary">加载更多</button>
              </div>
            )}
          </>
        )}

        {activeTab === 'water' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <select
                  value={filterPool}
                  onChange={(e) => setFilterPool(e.target.value)}
                  className="input-field text-sm py-2 w-40"
                >
                  <option value="all">全部泳池</option>
                  {pools.map((pool) => (
                    <option key={pool.id} value={pool.id}>{pool.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  共 {filteredWaterRecords.length} 条记录
                </span>
                <button
                  onClick={() => {
                    setWaterForm({
                      poolId: pools[0]?.id || '',
                      date: format(new Date(), 'yyyy-MM-dd'),
                      temperature: 37.0,
                      disinfection: '氯消毒 0.3mg/L',
                      recorder: '李救生员',
                    });
                    setShowAddWaterModal(true);
                  }}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  录入检测记录
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWaterRecords.slice(0, 15).map((record) => {
                const pool = getPoolById(record.poolId);
                const tempColor = record.temperature >= 36.5 && record.temperature <= 38
                  ? 'text-primary-600'
                  : record.temperature < 36.5
                  ? 'text-warning-600'
                  : 'text-danger-600';
                return (
                  <div
                    key={record.id}
                    className="p-4 bg-gradient-to-br from-primary-50 to-cyan-50 rounded-xl hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                          <Waves className="w-4 h-4 text-primary-500" />
                        </div>
                        <span className="font-medium text-gray-800">{pool?.name}</span>
                      </div>
                      <span className="text-sm text-gray-500">{record.date}</span>
                    </div>

                    <div className="flex items-end justify-between">
                      <div>
                        <p className={`text-3xl font-bold ${tempColor} flex items-center gap-1`}>
                          <Thermometer className="w-6 h-6" />
                          {record.temperature}
                          <span className="text-lg">°C</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1 bg-white/60 inline-block px-2 py-1 rounded-lg">
                          {record.disinfection}
                        </p>
                      </div>
                      <div className="text-right text-xs text-gray-500 space-y-1">
                        <p>记录人</p>
                        <p className="text-sm font-medium text-gray-700">{record.recorder}</p>
                        <p className="pt-1">{record.recordTime.split(' ')[1]}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredWaterRecords.length > 15 && (
              <div className="text-center mt-6">
                <button className="btn-secondary">加载更多记录</button>
              </div>
            )}

            {filteredWaterRecords.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Thermometer className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="mb-3">暂无水温消毒记录</p>
                <button onClick={() => setShowAddWaterModal(true)} className="btn-primary">
                  <Plus className="w-4 h-4 inline mr-1" />
                  录入第一条记录
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        isOpen={showAddWaterModal}
        onClose={() => setShowAddWaterModal(false)}
        title="录入水温消毒记录"
        size="sm"
        footer={
          <>
            <button onClick={() => setShowAddWaterModal(false)} className="btn-secondary">
              取消
            </button>
            <button onClick={handleAddWaterRecord} className="btn-primary">
              <CheckCircle2 className="w-4 h-4 inline mr-1" />
              保存记录
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">选择泳池</label>
            <select
              value={waterForm.poolId}
              onChange={(e) => setWaterForm({ ...waterForm, poolId: e.target.value })}
              className="input-field"
            >
              {pools.filter((p) => p.status !== 'inactive').map((pool) => (
                <option key={pool.id} value={pool.id}>
                  {pool.name}（{pool.ageRange}）
                  {pool.status === 'maintenance' ? ' - 维护中' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">检测日期</label>
            <input
              type="date"
              value={waterForm.date}
              onChange={(e) => setWaterForm({ ...waterForm, date: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              水温（°C）
              <span className={`ml-2 text-xs ${
                waterForm.temperature >= 36.5 && waterForm.temperature <= 38
                  ? 'text-success-600'
                  : 'text-warning-600'
              }`}>
                适宜范围：36.5°C ~ 38°C
              </span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={34}
                max={40}
                step={0.1}
                value={waterForm.temperature}
                onChange={(e) => setWaterForm({ ...waterForm, temperature: parseFloat(e.target.value) })}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
              <input
                type="number"
                min={34}
                max={40}
                step={0.1}
                value={waterForm.temperature}
                onChange={(e) => setWaterForm({ ...waterForm, temperature: parseFloat(e.target.value) || 37 })}
                className="input-field w-24 text-center font-bold text-primary-600"
              />
              <span className="text-gray-500">°C</span>
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">消毒情况</label>
            <select
              value={waterForm.disinfection}
              onChange={(e) => setWaterForm({ ...waterForm, disinfection: e.target.value })}
              className="input-field"
            >
              <option value="氯消毒 0.3mg/L">氯消毒 0.3mg/L</option>
              <option value="氯消毒 0.5mg/L">氯消毒 0.5mg/L</option>
              <option value="氯消毒 0.8mg/L">氯消毒 0.8mg/L</option>
              <option value="臭氧消毒">臭氧消毒</option>
              <option value="紫外线消毒">紫外线消毒</option>
              <option value="更换新水">更换新水</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">记录人</label>
            <input
              type="text"
              value={waterForm.recorder}
              onChange={(e) => setWaterForm({ ...waterForm, recorder: e.target.value })}
              placeholder="请输入记录人姓名"
              className="input-field"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
