
import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { CreditCard, Plus, RefreshCw, AlertTriangle, Check, ArrowRight } from 'lucide-react';
import type { MemberCard } from '@/types';

export default function QuotaManagement() {
  const { babies, memberCards, resetQuota, resetAllQuotas, consumeQuota } = useAppStore();
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  
  const getBabyById = (babyId: string) => babies.find((b) => b.id === babyId);
  
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
  
  const handleSelfPay = (babyId: string) => {
    const card = memberCards.find((c) => c.babyId === babyId);
    if (card) {
      consumeQuota(babyId, 'self-pay', card.selfPayPrice);
    }
  };
  
  const handleConsumeQuota = (babyId: string) => {
    const card = memberCards.find((c) => c.babyId === babyId);
    if (card && card.remainingQuota > 0) {
      consumeQuota(babyId, 'quota', 0);
    }
  };
  
  const totalQuota = memberCards.reduce((sum, c) => sum + c.totalQuota, 0);
  const usedQuota = memberCards.reduce((sum, c) => sum + (c.totalQuota - c.remainingQuota), 0);
  const zeroQuotaCount = memberCards.filter((c) => c.remainingQuota === 0).length;
  
  const selectedCardData = memberCards.find((c) => c.id === selectedCard);
  const selectedBaby = selectedCardData ? getBabyById(selectedCardData.babyId) : null;
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">额度管控</h1>
          <p className="text-gray-500 mt-1">管理会员次卡额度，周期重置与超额自费</p>
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
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            新建次卡
          </button>
        </div>
      </div>
      
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
              <Check className="w-6 h-6 text-white" />
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
              <AlertTriangle className="w-6 h-6 text-white" />
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
              <ArrowRight className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">自费转化率</p>
              <p className="text-2xl font-bold text-gray-800">
                {memberCards.length > 0 ? Math.round((zeroQuotaCount / memberCards.length) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>
      
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
                              if (card.remainingQuota > 0) {
                                handleConsumeQuota(card.babyId);
                              } else {
                                handleSelfPay(card.babyId);
                              }
                            }}
                            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                              card.remainingQuota > 0
                                ? 'bg-primary-100 text-primary-600 hover:bg-primary-200'
                                : 'bg-accent-100 text-accent-600 hover:bg-accent-200'
                            }`}
                          >
                            {card.remainingQuota > 0 ? '扣费' : '自费'}
                          </button>
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
        </div>
        
        <div className="space-y-6">
          {selectedCardData && selectedBaby ? (
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
                  <span className="font-bold text-lg text-primary-600">
                    {selectedCardData.remainingQuota} 次
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">自费单价</span>
                  <span className="font-medium text-gray-800">¥{selectedCardData.selfPayPrice}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">有效期</span>
                  <span className="font-medium text-gray-800">
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
              
              <div className="mt-6 pt-4 border-t border-gray-100 space-y-3">
                <button
                  onClick={() => resetQuota(selectedCardData.babyId)}
                  className="w-full btn-secondary flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  重置本周期额度
                </button>
                {selectedCardData.remainingQuota === 0 && (
                  <button
                    onClick={() => handleSelfPay(selectedCardData.babyId)}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                  >
                    自费消费 ¥{selectedCardData.selfPayPrice}
                  </button>
                )}
              </div>
            </div>
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
                <p>每周期初自动重置次卡额度，重置后剩余次数恢复为总额度</p>
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
                <p>额度用完后自动转为自费消费，按次卡自费单价计费</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
