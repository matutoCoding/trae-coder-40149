
import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { Receipt, Thermometer, Search, Filter, Download } from 'lucide-react';

export default function Consumption() {
  const { consumptions, babies, waterRecords, pools } = useAppStore();
  const [activeTab, setActiveTab] = useState<'consumption' | 'water'>('consumption');
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  const filteredConsumptions = consumptions.filter((c) => {
    const baby = babies.find((b) => b.id === c.babyId);
    const matchSearch = baby?.name.includes(searchText) || searchText === '';
    const matchType = filterType === 'all' || c.type === filterType;
    return matchSearch && matchType;
  });
  
  const totalAmount = consumptions.reduce((sum, c) => sum + c.amount, 0);
  const quotaCount = consumptions.filter((c) => c.type === 'quota').length;
  const selfPayCount = consumptions.filter((c) => c.type === 'self-pay').length;
  const selfPayAmount = consumptions.filter((c) => c.type === 'self-pay').reduce((sum, c) => sum + c.amount, 0);
  
  const getBabyById = (babyId: string) => babies.find((b) => b.id === babyId);
  const getPoolById = (poolId: string) => pools.find((p) => p.id === poolId);
  
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
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                    <th className="pb-3 font-medium">操作员</th>
                    <th className="pb-3 font-medium">备注</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConsumptions.slice(0, 20).map((item) => {
                    const baby = getBabyById(item.babyId);
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
                        <td className="py-4 text-sm text-gray-600">{item.operator}</td>
                        <td className="py-4 text-sm text-gray-500">{item.remark}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {filteredConsumptions.length > 20 && (
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
                <select className="input-field text-sm py-2 w-36">
                  <option>全部泳池</option>
                  {pools.map((pool) => (
                    <option key={pool.id} value={pool.id}>{pool.name}</option>
                  ))}
                </select>
              </div>
              <span className="text-sm text-gray-500">
                共 {waterRecords.length} 条记录
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {waterRecords.slice(0, 12).map((record) => {
                const pool = getPoolById(record.poolId);
                return (
                  <div
                    key={record.id}
                    className="p-4 bg-gradient-to-br from-primary-50 to-cyan-50 rounded-xl hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                          <Thermometer className="w-4 h-4 text-primary-500" />
                        </div>
                        <span className="font-medium text-gray-800">{pool?.name}</span>
                      </div>
                      <span className="text-sm text-gray-500">{record.date}</span>
                    </div>
                    
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-3xl font-bold text-primary-600">
                          {record.temperature}
                          <span className="text-lg">°C</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{record.disinfection}</p>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        <p>记录人: {record.recorder}</p>
                        <p>{record.recordTime.split(' ')[1]}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {waterRecords.length > 12 && (
              <div className="text-center mt-6">
                <button className="btn-secondary">加载更多记录</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
