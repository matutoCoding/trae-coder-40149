
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Waves, Repeat, CreditCard, Receipt, Waves as WavesIcon } from 'lucide-react';

const menuItems = [
  { path: '/dashboard', label: '首页概览', icon: LayoutDashboard },
  { path: '/pool-schedule', label: '泳池排期', icon: Waves },
  { path: '/cycle-generator', label: '周期生成', icon: Repeat },
  { path: '/quota-management', label: '额度管控', icon: CreditCard },
  { path: '/consumption', label: '消费明细', icon: Receipt },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white/90 backdrop-blur-sm shadow-soft-xl h-screen fixed left-0 top-0 flex flex-col z-50">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-200">
            <WavesIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">婴儿游泳馆</h1>
            <p className="text-xs text-gray-500">智能预约管理系统</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-item ${isActive ? 'active' : ''}`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-gray-100">
        <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
              <span className="text-lg">👶</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">管理员</p>
              <p className="text-xs text-gray-500">admin@baby.com</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
