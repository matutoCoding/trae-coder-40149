
import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { Receipt, Thermometer, Search, Download, Plus, CheckCircle2, Waves, Link2, CreditCard, AlertCircle, BadgeCheck, RotateCcw, Edit3, Info, XCircle, DollarSign } from 'lucide-react';
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
    refundConsumption,
    reSettleConsumption,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'consumption' | 'water'>('consumption');
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPool, setFilterPool] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterAdjust, setFilterAdjust] = useState('all');

  const [showAddWaterModal, setShowAddWaterModal] = useState(false);
  const [waterForm, setWaterForm] = useState({
    poolId: pools[0]?.id || '',
    date: format(new Date(), 'yyyy-MM-dd'),
    temperature: 37.0,
    disinfection: '氯消毒 0.3mg/L',
    recorder: '李救生员',
  });

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showResettleModal, setShowResettleModal] = useState(false);
  const [selectedConsumption, setSelectedConsumption] = useState<string | null>(null);
  const [refundRemark, setRefundRemark] = useState('');
  const [resettleForm, setResettleForm] = useState({
    payType: 'self-pay' as 'quota' | 'self-pay',
    cardId: '',
    amount: 88,
    remark: '',
  });

  const filteredConsumptions = consumptions.filter((c) => {
    const baby = babies.find((b) => b.id === c.babyId);
    const matchSearch = baby?.name.includes(searchText) || searchText === '';
    const matchType = filterType === 'all' || c.type === filterType;
    const matchSource = filterSource === 'all' || (filterSource === 'waitlist' ? c.isFromWaitlist : !c.isFromWaitlist);
    const matchAdjust = filterAdjust === 'all' || c.adjustType === filterAdjust;
    return matchSearch && matchType && matchSource && matchAdjust;
  });

  const filteredWaterRecords = waterRecords.filter((r) => {
    return filterPool === 'all' || r.poolId === filterPool;
  });

  const quotaCount = consumptions.filter((c) => c.type === 'quota' && c.adjustType !== 'refund').length;
  const selfPayCount = consumptions.filter((c) => c.type === 'self-pay' && c.adjustType !== 'refund').length;
  const selfPayAmount = consumptions.filter((c) => c.type === 'self-pay' && c.adjustType !== 'refund').reduce((sum, c) => sum + c.amount, 0);
  const linkedCount = consumptions.filter((c) => c.appointmentId).length;
  const waitlistCount = consumptions.filter((c) => c.isFromWaitlist).length;
  const refundCount = consumptions.filter((c) => c.adjustType === 'refund').length;

  const getBabyById = (babyId: string) => babies.find((b) => b.id === babyId);
  const getPoolById = (poolId: string) => pools.find((p) => p.id === poolId);
  const getAppointmentById = (aptId: string) => appointments.find((a) => a.id === aptId);
  const getCardById = (cardId: string) => memberCards.find((c) => c.id === cardId);
  const getConsumptionById = (id: string) => consumptions.find((c) => c.id === id);

  const handleAddWaterRecord = () => {
    if (!waterForm.poolId) return;
    addWaterRecord({
      ...waterForm,
      temperature: Number(waterForm.temperature.toFixed(1)),
      recordTime: `${waterForm.date} ${format(new Date(), 'HH:mm')}`,
    });
    setShowAddWaterModal(false);
  };

  const handleRefund = () => {
    if (!selectedConsumption) return;
    refundConsumption({
      consumptionId: selectedConsumption,
      operator: '前台操作员',
    });
    setShowRefundModal(false);
    setSelectedConsumption(null);
    setRefundRemark('');
  };

  const handleResettle = () => {
    if (!selectedConsumption) return;
    reSettleConsumption({
      consumptionId: selectedConsumption,
      refundType: 're-settle',
      newPaymentType: resettleForm.payType,
      newCardId: resettleForm.payType === 'quota' ? resettleForm.cardId : null,
      newSelfPayAmount: resettleForm.payType === 'self-pay' ? resettleForm.amount : 0,
      operator: '前台操作员',
    });
    setShowResettleModal(false);
    setSelectedConsumption(null);
    setResettleForm({ payType: 'self-pay', cardId: '', amount: 88, remark: '' });
  };

  const openRefundModal = (id: string) => {
    setSelectedConsumption(id);
    setRefundRemark('');
    setShowRefundModal(true);
  };

  const openResettleModal = (id: string) => {
    const c = getConsumptionById(id);
    if (!c) return;
    setSelectedConsumption(id);
    setResettleForm({
      payType: c.type === 'quota' ? 'self-pay' : 'quota',
      cardId: c.type === 'quota' ? '' : (memberCards.find(mc => mc.babyId === c.babyId && mc.remainingQuota > 0)?.id || ''),
      amount: c.amount || 88,
      remark: '',
    });
    setShowResettleModal(true);
  };

  const currentConsumption = selectedConsumption ? getConsumptionById(selectedConsumption) : null;
  const currentBaby = currentConsumption ? getBabyById(currentConsumption.babyId) : null;
  const relatedConsumption = currentConsumption?.relatedConsumptionId
    ? getConsumptionById(currentConsumption.relatedConsumptionId)
    : null;

  const babyCards = currentConsumption
    ? memberCards.filter((c) => c.babyId === currentConsumption.babyId && c.remainingQuota > 0)
    : [];

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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="card animate-slide-up">
          <p className="text-sm text-gray-500">总消费笔数</p>
          <p className="text-2xl font-bold text-gray-800 mt-2">{consumptions.filter(c => c.adjustType !== 'refund').length}</p>
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
        <div className="card animate-slide-up animation-delay-500">
          <p className="text-sm text-gray-500">退款笔数</p>
          <p className="text-2xl font-bold text-danger-500 mt-2">{refundCount} 笔</p>
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
              <div className="flex items-center gap-3 flex-wrap">
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
                <select
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value)}
                  className="input-field text-sm py-2 w-40"
                >
                  <option value="all">全部来源</option>
                  <option value="normal">正常预约</option>
                  <option value="waitlist">候补转正</option>
                </select>
                <select
                  value={filterAdjust}
                  onChange={(e) => setFilterAdjust(e.target.value)}
                  className="input-field text-sm py-2 w-40"
                >
                  <option value="all">全部状态</option>
                  <option value="original">原始消费</option>
                  <option value="refund">退款记录</option>
                  <option value="adjustment">调整记录</option>
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
                    <th className="pb-3 font-medium">调整状态</th>
                    <th className="pb-3 font-medium">关联记录</th>
                    <th className="pb-3 font-medium">使用次卡</th>
                    <th className="pb-3 font-medium">操作员</th>
                    <th className="pb-3 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConsumptions.slice(0, 30).map((item) => {
                    const baby = getBabyById(item.babyId);
                    const appointment = item.appointmentId ? getAppointmentById(item.appointmentId) : null;
                    const appointmentPool = appointment ? getPoolById(appointment.poolId) : null;
                    const card = item.cardId ? getCardById(item.cardId) : null;
                    const related = item.relatedConsumptionId ? getConsumptionById(item.relatedConsumptionId) : null;
                    const relatedBaby = related ? getBabyById(related.babyId) : null;

                    return (
                      <tr key={item.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                        item.adjustType === 'refund' ? 'bg-danger-50/30' :
                        item.adjustType === 'adjustment' ? 'bg-warning-50/30' : ''
                      }`}>
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
                            item.adjustType === 'refund' ? 'text-danger-600' :
                            item.type === 'self-pay' ? 'text-success-600' : 'text-gray-600'
                          }`}>
                            {item.adjustType === 'refund' ? '-' : ''}
                            {item.type === 'quota' ? (item.adjustType === 'refund' ? '+1次' : '扣次') : `¥${item.amount}`}
                          </span>
                        </td>
                        <td className="py-4">
                          {item.adjustType === 'original' ? (
                            <span className="inline-flex items-center gap-1 badge bg-success-100 text-success-700">
                              <BadgeCheck className="w-3 h-3" />
                              原始消费
                            </span>
                          ) : item.adjustType === 'refund' ? (
                            <span className="inline-flex items-center gap-1 badge bg-danger-100 text-danger-700">
                              <XCircle className="w-3 h-3" />
                              退款
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 badge bg-warning-100 text-warning-700">
                              <Edit3 className="w-3 h-3" />
                              调整
                            </span>
                          )}
                        </td>
                        <td className="py-4">
                          {related ? (
                            <div className="flex items-center gap-1.5">
                              <Link2 className="w-3.5 h-3.5 text-gray-400" />
                              <div className="text-xs">
                                <p className="text-gray-600 font-medium">
                                  {relatedBaby?.name}
                                </p>
                                <p className="text-gray-400">
                                  {related.time.split(' ')[0]}
                                </p>
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
                        <td className="py-4">
                          {item.adjustType === 'original' && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openRefundModal(item.id)}
                                className="text-xs text-danger-600 hover:text-danger-700 flex items-center gap-1"
                              >
                                <RotateCcw className="w-3 h-3" />
                                退款
                              </button>
                              <button
                                onClick={() => openResettleModal(item.id)}
                                className="text-xs text-warning-600 hover:text-warning-700 flex items-center gap-1"
                              >
                                <Edit3 className="w-3 h-3" />
                                调整
                              </button>
                            </div>
                          )}
                          {item.adjustType !== 'original' && (
                            <span className="text-xs text-gray-400">不可操作</span>
                          )}
                        </td>
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
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        title="确认退款"
        size="sm"
        footer={
          <>
            <button onClick={() => setShowRefundModal(false)} className="btn-secondary">
              取消
            </button>
            <button onClick={handleRefund} className="btn-danger">
              <RotateCcw className="w-4 h-4 inline mr-1" />
              确认退款
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-danger-50 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-danger-700">确认要退款吗？</p>
                <p className="text-sm text-danger-600 mt-1">
                  退款后将生成一条反向明细，次卡余额自动回滚。
                </p>
              </div>
            </div>
          </div>

          {currentConsumption && currentBaby && (
            <div className="p-4 bg-gray-50 rounded-xl space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">宝宝</span>
                <span className="font-medium text-gray-800">{currentBaby.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">消费时间</span>
                <span className="font-medium text-gray-800">{currentConsumption.time}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">消费类型</span>
                <span className="font-medium text-gray-800">
                  {currentConsumption.type === 'quota' ? '次卡扣费' : '自费消费'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">金额/次数</span>
                <span className="font-bold text-danger-600">
                  {currentConsumption.type === 'quota' ? '回退 1 次' : `¥${currentConsumption.amount}`}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm text-gray-600 mb-1 block">退款原因（可选）</label>
            <textarea
              value={refundRemark}
              onChange={(e) => setRefundRemark(e.target.value)}
              placeholder="请输入退款原因..."
              className="input-field min-h-[80px]"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showResettleModal}
        onClose={() => setShowResettleModal(false)}
        title="调整结算方式"
        size="md"
        footer={
          <>
            <button onClick={() => setShowResettleModal(false)} className="btn-secondary">
              取消
            </button>
            <button onClick={handleResettle} className="btn-primary">
              <CheckCircle2 className="w-4 h-4 inline mr-1" />
              确认调整
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-warning-50 rounded-xl">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-warning-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-warning-700">调整结算方式</p>
                <p className="text-sm text-warning-600 mt-1">
                  将生成一条退款记录和一条新的结算记录，原消费记录保持不变。
                </p>
              </div>
            </div>
          </div>

          {currentConsumption && currentBaby && (
            <div className="p-4 bg-gray-50 rounded-xl space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">宝宝</span>
                <span className="font-medium text-gray-800">{currentBaby.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">原消费类型</span>
                <span className="font-medium text-gray-800">
                  {currentConsumption.type === 'quota' ? '次卡扣费' : '自费消费'}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm text-gray-600 mb-2 block">新的支付方式</label>
            <div className="flex gap-3">
              <button
                onClick={() => setResettleForm({ ...resettleForm, payType: 'quota' })}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  resettleForm.payType === 'quota'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <CreditCard className={`w-6 h-6 mx-auto mb-2 ${
                  resettleForm.payType === 'quota' ? 'text-primary-600' : 'text-gray-400'
                }`} />
                <p className={`text-sm font-medium ${
                  resettleForm.payType === 'quota' ? 'text-primary-700' : 'text-gray-600'
                }`}>次卡扣费</p>
              </button>
              <button
                onClick={() => setResettleForm({ ...resettleForm, payType: 'self-pay' })}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  resettleForm.payType === 'self-pay'
                    ? 'border-accent-500 bg-accent-50'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <DollarSign className={`w-6 h-6 mx-auto mb-2 ${
                  resettleForm.payType === 'self-pay' ? 'text-accent-600' : 'text-gray-400'
                }`} />
                <p className={`text-sm font-medium ${
                  resettleForm.payType === 'self-pay' ? 'text-accent-700' : 'text-gray-600'
                }`}>自费消费</p>
              </button>
            </div>
          </div>

          {resettleForm.payType === 'quota' && (
            <div>
              <label className="text-sm text-gray-600 mb-1 block">选择次卡</label>
              <select
                value={resettleForm.cardId}
                onChange={(e) => setResettleForm({ ...resettleForm, cardId: e.target.value })}
                className="input-field"
              >
                <option value="">请选择次卡</option>
                {babyCards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.cardType}（剩余 {card.remainingQuota} 次）
                  </option>
                ))}
              </select>
              {babyCards.length === 0 && (
                <p className="text-xs text-danger-500 mt-1">该宝宝没有可用的次卡</p>
              )}
            </div>
          )}

          {resettleForm.payType === 'self-pay' && (
            <div>
              <label className="text-sm text-gray-600 mb-1 block">自费金额（元）</label>
              <input
                type="number"
                value={resettleForm.amount}
                onChange={(e) => setResettleForm({ ...resettleForm, amount: Number(e.target.value) })}
                className="input-field"
              />
            </div>
          )}

          <div>
            <label className="text-sm text-gray-600 mb-1 block">调整原因（可选）</label>
            <textarea
              value={resettleForm.remark}
              onChange={(e) => setResettleForm({ ...resettleForm, remark: e.target.value })}
              placeholder="请输入调整原因..."
              className="input-field min-h-[80px]"
            />
          </div>
        </div>
      </Modal>

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
