
import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { CreditCard, Plus, RefreshCw, AlertCircle, CheckCircle2, X, ChevronRight, Baby, Clock, Waves, DollarSign, Zap, CalendarDays } from 'lucide-react';
import type { MemberCard, SettlementForm } from '@/types';
import Modal from '@/components/Modal';
import { format, addYears } from 'date-fns';

export default function QuotaManagement() {
  const {
    babies,
    memberCards,
    appointments,
    pools,
    consumptions,
    addMemberCard,
    checkAndResetCycleQuotas,
    lastAutoResetDate,
    settleAppointment,
    resetQuota,
    resetAllQuotas,
  } = useAppStore();

  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [autoResetMessage, setAutoResetMessage] = useState<{ weeklyReset: number; monthlyReset: number } | null>(null);
  const [settleAppointmentId, setSettleAppointmentId] = useState<string | null>(null);
  const [settlePaymentType, setSettlePaymentType] = useState<'quota' | 'self-pay'>('quota');
  const [settleCardId, setSettleCardId] = useState<string | null>(null);
  const [settleSelfPayAmount, setSettleSelfPayAmount] = useState<number>(88);
  const [settleMessage, setSettleMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [cardForm, setCardForm] = useState({
    babyId: '',
    cardType: '',
    totalQuota: 3,
    cycleType: 'weekly' as 'weekly' | 'monthly',
    effectiveDate: format(new Date(), 'yyyy-MM-dd'),
    expireDate: format(addYears(new Date(), 1), 'yyyy-MM-dd'),
    selfPayPrice: 88,
  });

  useEffect(() => {
    const result = checkAndResetCycleQuotas();
    if (result.weeklyReset > 0 || result.monthlyReset > 0) {
      setAutoResetMessage(result);
      setTimeout(() => setAutoResetMessage(null), 5000);
    }
  }, []);

  const getBabyById = (babyId: string) => babies.find((b) => b.id === babyId);
  const getPoolById = (poolId: string) => pools.find((p) => p.id === poolId);

  const babiesWithoutCard = babies.filter(
    (b) => !memberCards.some((c) => c.babyId === b.id)
  );

  const getQuotaStatus = (card: MemberCard) => {
    const ratio = card.remainingQuota / card.totalQuota;
    if (ratio === 0) return { label: '已用完', color: 'danger' };
    if (ratio <= 0.3) return { label: '额度不足', color: 'warning' };
    return { label: '正常', color: 'success' };
  };

  const handleResetAll = () => {
    if (resetConfirm) {
      resetAllQuotas();
      setResetConfirm(false);
    } else {
      setResetConfirm(true);
      setTimeout(() => setResetConfirm(false), 3000);
    }
  };

  const handleAddCard = () => {
    if (!cardForm.babyId || !cardForm.cardType.trim()) return;
    addMemberCard({
      ...cardForm,
      remainingQuota: cardForm.totalQuota,
      lastResetDate: format(new Date(), 'yyyy-MM-dd'),
    });
    setShowAddCardModal(false);
    setCardForm({
      babyId: '',
      cardType: '',
      totalQuota: 3,
      cycleType: 'weekly',
      effectiveDate: format(new Date(), 'yyyy-MM-dd'),
      expireDate: format(addYears(new Date(), 1), 'yyyy-MM-dd'),
      selfPayPrice: 88,
    });
  };

  const handleOpenSettleModal = (appointmentId: string) => {
    const appointment = appointments.find((a) => a.id === appointmentId);
    if (!appointment) return;

    const babyCards = memberCards.filter((c) => c.babyId === appointment.babyId);
    const hasAvailableCard = babyCards.some((c) => c.remainingQuota > 0);
    const firstAvailableCard = babyCards.find((c) => c.remainingQuota > 0);
    const firstCard = babyCards[0];

    setSettleAppointmentId(appointmentId);
    setSettleCardId(firstAvailableCard?.id || firstCard?.id || null);
    setSettlePaymentType(hasAvailableCard ? 'quota' : 'self-pay');
    setSettleSelfPayAmount(firstCard?.selfPayPrice || 88);
    setSettleMessage(null);
    setShowSettleModal(true);
  };

  const handlePaymentTypeChange = (type: 'quota' | 'self-pay') => {
    if (type === 'quota') {
      const appointment = appointments.find((a) => a.id === settleAppointmentId);
      if (!appointment) return;
      const babyCards = memberCards.filter((c) => c.babyId === appointment.babyId);
      const hasAvailableCard = babyCards.some((c) => c.remainingQuota > 0);
      if (!hasAvailableCard) {
        setSettleMessage({ type: 'error', text: '该宝宝所有次卡均无剩余额度，已自动切换为自费结算' });
        setSettlePaymentType('self-pay');
        return;
      }
      if (!settleCardId) {
        const firstAvailableCard = babyCards.find((c) => c.remainingQuota > 0);
        setSettleCardId(firstAvailableCard?.id || null);
      }
    }
    setSettlePaymentType(type);
    setSettleMessage(null);
  };

  const handleCardSelect = (cardId: string) => {
    setSettleCardId(cardId);
    const card = memberCards.find((c) => c.id === cardId);
    if (card && settlePaymentType === 'self-pay') {
      setSettleSelfPayAmount(card.selfPayPrice);
    }
    if (card && card.remainingQuota === 0 && settlePaymentType === 'quota') {
      setSettleMessage({ type: 'error', text: '该次卡剩余额度不足，已自动切换为自费结算' });
      setSettlePaymentType('self-pay');
      setSettleSelfPayAmount(card.selfPayPrice);
    }
  };

  const handleSettleConfirm = () => {
    if (!settleAppointmentId) return;

    const form: SettlementForm = {
      appointmentId: settleAppointmentId,
      cardId: settlePaymentType === 'quota' ? settleCardId : null,
      paymentType: settlePaymentType,
      selfPayAmount: settlePaymentType === 'self-pay' ? settleSelfPayAmount : 0,
      operator: '前台',
    };

    const result = settleAppointment(form);
    if (result.success) {
      setSettleMessage({ type: 'success', text: result.message });
      setTimeout(() => {
        setShowSettleModal(false);
        setSettleMessage(null);
      }, 1500);
    } else {
      setSettleMessage({ type: 'error', text: result.message });
    }
  };

  const currentSettleAppointment = appointments.find((a) => a.id === settleAppointmentId);
  const currentSettleBaby = currentSettleAppointment ? getBabyById(currentSettleAppointment.babyId) : null;
  const currentSettlePool = currentSettleAppointment ? getPoolById(currentSettleAppointment.poolId) : null;
  const currentSettleBabyCards = currentSettleAppointment
    ? memberCards.filter((c) => c.babyId === currentSettleAppointment.babyId)
    : [];
  const selectedSettleCard = memberCards.find((c) => c.id === settleCardId);

  const scheduledAppointments = appointments.filter(
    (a) => a.status === 'scheduled'
  );

  const totalQuota = memberCards.reduce((sum, c) => sum + c.totalQuota, 0);
  const usedQuota = memberCards.reduce((sum, c) => sum + (c.totalQuota - c.remainingQuota), 0);
  const zeroQuotaCount = memberCards.filter((c) => c.remainingQuota === 0).length;

  const selectedCardData = memberCards.find((c) => c.id === selectedCard);
  const selectedBaby = selectedCardData ? getBabyById(selectedCardData.babyId) : null;

  const selectedBabyScheduledAppointments = selectedCardData
    ? appointments.filter(
        (a) => a.babyId === selectedCardData.babyId && a.status === 'scheduled'
      )
    : [];

  const selectedBabyLinkedConsumptions = selectedCardData
    ? consumptions.filter(
        (c) =>
          c.babyId === selectedCardData.babyId &&
          c.appointmentId
      )
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {autoResetMessage && (
        <div className="p-4 bg-success-50 border border-success-200 rounded-2xl flex items-center gap-3 animate-slide-up">
          <CheckCircle2 className="w-5 h-5 text-success-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-success-700">本周期额度自动重置完成</p>
            <p className="text-sm text-success-600">
              周卡重置 {autoResetMessage.weeklyReset} 张，月卡重置 {autoResetMessage.monthlyReset} 张
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">额度管控</h1>
          <p className="text-gray-500 mt-1">管理会员次卡额度，预约结算与周期重置</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleResetAll}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              resetConfirm
                ? 'bg-danger-500 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            {resetConfirm ? '确认重置全部?' : '重置全部额度'}
          </button>
          <button
            onClick={() => setShowAddCardModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            新建次卡
          </button>
        </div>
      </div>

      {lastAutoResetDate && (
        <div className="p-3 bg-primary-50 rounded-xl flex items-center gap-2 text-sm text-primary-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>上次自动重置日期：{lastAutoResetDate} · 周卡每周一自动重置，月卡每月1日自动重置</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card animate-slide-up">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">次卡总数</p>
              <p className="text-2xl font-bold text-gray-800">{memberCards.length}</p>
            </div>
          </div>
        </div>

        <div className="card animate-slide-up animation-delay-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-success-400 to-success-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">已用额度</p>
              <p className="text-2xl font-bold text-gray-800">{usedQuota} / {totalQuota}</p>
            </div>
          </div>
        </div>

        <div className="card animate-slide-up animation-delay-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-warning-400 to-warning-500 rounded-2xl flex items-center justify-center shadow-lg">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">额度用完</p>
              <p className="text-2xl font-bold text-gray-800">{zeroQuotaCount} 张</p>
            </div>
          </div>
        </div>

        <div className="card animate-slide-up animation-delay-300">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-accent-400 to-accent-500 rounded-2xl flex items-center justify-center shadow-lg">
              <CalendarDays className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">待结算预约</p>
              <p className="text-2xl font-bold text-gray-800">{scheduledAppointments.length}</p>
            </div>
          </div>
        </div>
      </div>

      {scheduledAppointments.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary-500" />
              待结算预约
            </h3>
            <span className="badge bg-primary-100 text-primary-600">{scheduledAppointments.length} 个预约</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                  <th className="pb-3 font-medium">宝宝</th>
                  <th className="pb-3 font-medium">日期</th>
                  <th className="pb-3 font-medium">时段</th>
                  <th className="pb-3 font-medium">泳池</th>
                  <th className="pb-3 font-medium">卡状态</th>
                  <th className="pb-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {scheduledAppointments.map((appt) => {
                  const baby = getBabyById(appt.babyId);
                  const pool = getPoolById(appt.poolId);
                  const card = memberCards.find((c) => c.babyId === appt.babyId);
                  return (
                    <tr key={appt.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium text-sm"
                            style={{ backgroundColor: baby?.avatarColor || '#ccc' }}
                          >
                            {baby?.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{baby?.name}</p>
                            <p className="text-xs text-gray-500">{baby?.memberCardNo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <p className="text-gray-800">{appt.date}</p>
                      </td>
                      <td className="py-3">
                        <p className="text-gray-800">{appt.startTime} - {appt.endTime}</p>
                      </td>
                      <td className="py-3">
                        <p className="text-gray-800">{pool?.name || '-'}</p>
                      </td>
                      <td className="py-3">
                        {card ? (
                          <span className={`badge ${
                            card.remainingQuota === 0
                              ? 'bg-danger-100 text-danger-600'
                              : card.remainingQuota <= card.totalQuota * 0.3
                                ? 'bg-warning-100 text-warning-600'
                                : 'bg-success-100 text-success-600'
                          }`}>
                            余{card.remainingQuota}次
                          </span>
                        ) : (
                          <span className="badge bg-gray-100 text-gray-600">无次卡</span>
                        )}
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => handleOpenSettleModal(appt.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors font-medium"
                        >
                          <DollarSign className="w-4 h-4" />
                          结算
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">次卡列表</h3>
            <div className="flex gap-2">
              <select className="input-field text-sm py-2 w-auto">
                <option>全部状态</option>
                <option>正常</option>
                <option>额度不足</option>
                <option>已用完</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                  <th className="pb-3 font-medium">宝宝</th>
                  <th className="pb-3 font-medium">卡类型</th>
                  <th className="pb-3 font-medium">额度</th>
                  <th className="pb-3 font-medium">周期</th>
                  <th className="pb-3 font-medium">状态</th>
                  <th className="pb-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {memberCards.map((card) => {
                  const baby = getBabyById(card.babyId);
                  const status = getQuotaStatus(card);
                  const progress = (card.remainingQuota / card.totalQuota) * 100;

                  return (
                    <tr
                      key={card.id}
                      onClick={() => setSelectedCard(card.id)}
                      className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedCard === card.id ? 'bg-primary-50/50' : ''
                      }`}
                    >
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm"
                            style={{ backgroundColor: baby?.avatarColor || '#ccc' }}
                          >
                            {baby?.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{baby?.name}</p>
                            <p className="text-xs text-gray-500">{baby?.memberCardNo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <p className="text-gray-800">{card.cardType}</p>
                        <p className="text-xs text-gray-500">自费 ¥{card.selfPayPrice}/次</p>
                      </td>
                      <td className="py-4">
                        <div className="w-32">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-600">{card.remainingQuota} / {card.totalQuota}</span>
                            <span className="text-gray-500 text-xs">{Math.round(progress)}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                progress === 0 ? 'bg-danger-400' :
                                progress <= 30 ? 'bg-warning-400' : 'bg-success-400'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="badge bg-primary-100 text-primary-600">
                          {card.cycleType === 'weekly' ? '周卡' : '月卡'}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className={`badge ${
                          status.color === 'success' ? 'bg-success-100 text-success-600' :
                          status.color === 'warning' ? 'bg-warning-100 text-warning-600' :
                          'bg-danger-100 text-danger-600'
                        }`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              resetQuota(card.babyId);
                            }}
                            className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            重置
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {babiesWithoutCard.length > 0 && (
            <div className="mt-4 p-4 bg-warning-50 rounded-xl">
              <p className="text-sm text-warning-700 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                以下宝宝尚未办理次卡：
              </p>
              <div className="flex flex-wrap gap-2">
                {babiesWithoutCard.map((baby) => (
                  <button
                    key={baby.id}
                    onClick={() => {
                      setCardForm({ ...cardForm, babyId: baby.id });
                      setShowAddCardModal(true);
                    }}
                    className="px-3 py-1 bg-white text-sm rounded-lg hover:bg-warning-100 transition-colors border border-warning-200"
                  >
                    {baby.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {selectedCardData && selectedBaby ? (
            <>
              <div className="card animate-slide-up">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">次卡详情</h3>

                <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-5 text-white mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm opacity-90">{selectedCardData.cardType}</span>
                    <CreditCard className="w-6 h-6 opacity-80" />
                  </div>
                  <p className="text-2xl font-bold">{selectedBaby.memberCardNo}</p>
                  <p className="text-sm opacity-80 mt-1">{selectedBaby.name} 的次卡</p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">周期类型</span>
                    <span className="font-medium text-gray-800">
                      {selectedCardData.cycleType === 'weekly' ? '每周' : '每月'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">周期总额度</span>
                    <span className="font-medium text-gray-800">{selectedCardData.totalQuota} 次</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">剩余额度</span>
                    <span className={`font-bold text-lg ${
                      selectedCardData.remainingQuota === 0 ? 'text-danger-600' :
                      selectedCardData.remainingQuota <= selectedCardData.totalQuota * 0.3 ? 'text-warning-600' :
                      'text-primary-600'
                    }`}>
                      {selectedCardData.remainingQuota} 次
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">自费单价</span>
                    <span className="font-medium text-gray-800">¥{selectedCardData.selfPayPrice}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">有效期</span>
                    <span className="font-medium text-gray-800 text-sm">
                      {selectedCardData.effectiveDate} ~ {selectedCardData.expireDate}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">上次重置</span>
                    <span className="font-medium text-gray-800">
                      {selectedCardData.lastResetDate || '未重置'}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => resetQuota(selectedCardData.babyId)}
                    className="w-full btn-secondary flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    重置本周期额度
                  </button>
                </div>
              </div>

              {selectedBabyScheduledAppointments.length > 0 && (
                <div className="card animate-slide-up">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-primary-500" />
                    待结算预约
                  </h3>
                  <div className="space-y-3">
                    {selectedBabyScheduledAppointments.map((appt) => {
                      const pool = getPoolById(appt.poolId);
                      return (
                        <div
                          key={appt.id}
                          className="p-3 bg-primary-50/60 rounded-xl border border-primary-100"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <CalendarDays className="w-4 h-4 text-primary-500" />
                              <span className="font-medium text-gray-800">{appt.date}</span>
                            </div>
                            <button
                              onClick={() => handleOpenSettleModal(appt.id)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors font-medium"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              去结算
                            </button>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {appt.startTime} - {appt.endTime}
                            </span>
                            <span className="flex items-center gap-1">
                              <Waves className="w-3.5 h-3.5" />
                              {pool?.name || '-'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedBabyLinkedConsumptions.length > 0 && (
                <div className="card animate-slide-up">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Waves className="w-5 h-5 text-success-500" />
                    消费记录
                  </h3>
                  <div className="space-y-3">
                    {selectedBabyLinkedConsumptions.slice(0, 5).map((cons) => {
                      const linkedAppt = appointments.find((a) => a.id === cons.appointmentId);
                      const pool = linkedAppt ? getPoolById(linkedAppt.poolId) : null;
                      return (
                        <div
                          key={cons.id}
                          className="p-3 bg-gray-50 rounded-xl border border-gray-100"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`badge text-xs ${
                              cons.type === 'quota'
                                ? 'bg-success-100 text-success-600'
                                : 'bg-accent-100 text-accent-600'
                            }`}>
                              {cons.type === 'quota' ? '次卡扣费' : '自费'}
                            </span>
                            <span className="text-xs text-gray-500">{cons.time}</span>
                          </div>
                          <div className="text-sm text-gray-700">
                            <span>{linkedAppt?.date} {linkedAppt?.startTime}-{linkedAppt?.endTime}</span>
                            {pool && <span className="text-gray-400 ml-2">· {pool.name}</span>}
                          </div>
                          {cons.type === 'self-pay' && (
                            <p className="text-sm font-medium text-accent-600 mt-1">¥{cons.amount}</p>
                          )}
                          {cons.remark && (
                            <p className="text-xs text-gray-400 mt-1">{cons.remark}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card text-center py-12">
              <CreditCard className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">选择一张次卡查看详情</p>
            </div>
          )}

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">额度重置规则</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary-600 text-xs font-bold">1</span>
                </div>
                <p>每周期初<strong>自动重置</strong>次卡额度，重置后剩余次数恢复为总额度</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary-600 text-xs font-bold">2</span>
                </div>
                <p>上一周期未用完的额度<strong>不累加</strong>，清零处理</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary-600 text-xs font-bold">3</span>
                </div>
                <p>点击"结算"按钮可选择<strong>次卡扣费</strong>或<strong>自费消费</strong></p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary-600 text-xs font-bold">4</span>
                </div>
                <p>周卡：<strong>每周一</strong>自动重置 &nbsp;|&nbsp; 月卡：<strong>每月1日</strong>自动重置</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showAddCardModal}
        onClose={() => setShowAddCardModal(false)}
        title="新建次卡"
        size="md"
        footer={
          <>
            <button onClick={() => setShowAddCardModal(false)} className="btn-secondary">
              取消
            </button>
            <button onClick={handleAddCard} className="btn-primary">
              <CheckCircle2 className="w-4 h-4 inline mr-1" />
              创建次卡
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">选择宝宝 <span className="text-danger-500">*</span></label>
            <select
              value={cardForm.babyId}
              onChange={(e) => setCardForm({ ...cardForm, babyId: e.target.value })}
              className="input-field"
            >
              <option value="">请选择宝宝</option>
              {babies.map((baby) => (
                <option key={baby.id} value={baby.id}>
                  {baby.name}（{baby.ageMonths}个月，{baby.memberCardNo}）
                  {memberCards.some((c) => c.babyId === baby.id) ? ' - 已有次卡' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">卡类型名称 <span className="text-danger-500">*</span></label>
            <input
              type="text"
              value={cardForm.cardType}
              onChange={(e) => setCardForm({ ...cardForm, cardType: e.target.value })}
              placeholder="如：周卡-每周3次、月卡-每月12次"
              className="input-field"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">周期类型</label>
              <select
                value={cardForm.cycleType}
                onChange={(e) => setCardForm({ ...cardForm, cycleType: e.target.value as 'weekly' | 'monthly' })}
                className="input-field"
              >
                <option value="weekly">周卡（每周重置）</option>
                <option value="monthly">月卡（每月重置）</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">每周期次数</label>
              <input
                type="number"
                min={1}
                value={cardForm.totalQuota}
                onChange={(e) => setCardForm({ ...cardForm, totalQuota: parseInt(e.target.value) || 1 })}
                className="input-field"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">生效日期</label>
              <input
                type="date"
                value={cardForm.effectiveDate}
                onChange={(e) => setCardForm({ ...cardForm, effectiveDate: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">到期日期</label>
              <input
                type="date"
                value={cardForm.expireDate}
                onChange={(e) => setCardForm({ ...cardForm, expireDate: e.target.value })}
                className="input-field"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">自费单价（额度用完后每次费用，元）</label>
            <input
              type="number"
              min={0}
              value={cardForm.selfPayPrice}
              onChange={(e) => setCardForm({ ...cardForm, selfPayPrice: parseInt(e.target.value) || 0 })}
              className="input-field"
            />
          </div>
          <div className="p-3 bg-primary-50 rounded-xl text-sm text-primary-700">
            <p className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              创建后次卡将立即生效，初始剩余额度 = 每周期次数
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showSettleModal}
        onClose={() => setShowSettleModal(false)}
        title="结算预约"
        size="lg"
        footer={
          <>
            <button onClick={() => setShowSettleModal(false)} className="btn-secondary">
              取消
            </button>
            <button onClick={handleSettleConfirm} className="btn-primary">
              <CheckCircle2 className="w-4 h-4 inline mr-1" />
              确认结算
            </button>
          </>
        }
      >
        <div className="space-y-6">
          {settleMessage && (
            <div className={`p-4 rounded-xl flex items-center gap-3 ${
              settleMessage.type === 'success'
                ? 'bg-success-50 border border-success-200'
                : 'bg-warning-50 border border-warning-200'
            }`}>
              {settleMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-success-500 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-warning-500 flex-shrink-0" />
              )}
              <p className={`font-medium ${
                settleMessage.type === 'success' ? 'text-success-700' : 'text-warning-700'
              }`}>
                {settleMessage.text}
              </p>
            </div>
          )}

          {currentSettleBaby && currentSettleAppointment && (
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: currentSettleBaby.avatarColor }}
              >
                {currentSettleBaby.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Baby className="w-4 h-4 text-primary-500" />
                  <span className="font-semibold text-gray-800 text-lg">{currentSettleBaby.name}</span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {currentSettleAppointment.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {currentSettleAppointment.startTime} - {currentSettleAppointment.endTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <Waves className="w-3.5 h-3.5" />
                    {currentSettlePool?.name || '-'}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </div>
          )}

          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => handlePaymentTypeChange('quota')}
              disabled={currentSettleBabyCards.length === 0}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                settlePaymentType === 'quota'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              次卡扣费
            </button>
            <button
              onClick={() => handlePaymentTypeChange('self-pay')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                settlePaymentType === 'self-pay'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              自费
            </button>
          </div>

          {currentSettleBabyCards.length > 0 ? (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-800">选择次卡</h4>
              <div className="space-y-2">
                {currentSettleBabyCards.map((card) => {
                  const hasQuota = card.remainingQuota > 0;
                  return (
                    <label
                      key={card.id}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        settleCardId === card.id
                          ? 'border-primary-500 bg-primary-50/50'
                          : 'border-gray-100 hover:border-gray-200 bg-white'
                      } ${!hasQuota && settlePaymentType === 'quota' ? 'opacity-50' : ''}`}
                    >
                      <input
                        type="radio"
                        name="settleCard"
                        value={card.id}
                        checked={settleCardId === card.id}
                        onChange={() => handleCardSelect(card.id)}
                        className="w-4 h-4 text-primary-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-800">{card.cardType}</span>
                          <span className={`badge ${
                            card.remainingQuota === 0
                              ? 'bg-danger-100 text-danger-600'
                              : card.remainingQuota <= card.totalQuota * 0.3
                                ? 'bg-warning-100 text-warning-600'
                                : 'bg-success-100 text-success-600'
                          }`}>
                            余{card.remainingQuota} / {card.totalQuota}次
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <RefreshCw className="w-3.5 h-3.5" />
                            {card.cycleType === 'weekly' ? '周卡' : '月卡'}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5" />
                            自费 ¥{card.selfPayPrice}/次
                          </span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-xl text-center">
              <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">该宝宝暂无次卡，仅可自费结算</p>
            </div>
          )}

          {settlePaymentType === 'self-pay' && (
            <div>
              <label className="text-sm text-gray-600 mb-1 block">自费金额（元）</label>
              <div className="relative">
                <DollarSign className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min={0}
                  value={settleSelfPayAmount}
                  onChange={(e) => setSettleSelfPayAmount(parseFloat(e.target.value) || 0)}
                  className="input-field pl-10 text-lg font-bold text-accent-600"
                />
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
