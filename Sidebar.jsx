import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Warehouse, 
  Upload, 
  Bell, 
  ShoppingCart, 
  BarChart3, 
  Settings, 
  HelpCircle, 
  Sparkles,
  LogOut,
  Boxes
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
export default function Sidebar({ currentPage, setCurrentPage }) {
  const { logout, user } = useAuth();
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'insights', name: 'AI Insights', icon: Sparkles, badge: 'New' },
    { id: 'products', name: 'Products', icon: Package },
    { id: 'warehouses', name: 'Warehouses', icon: Warehouse },
    { id: 'import', name: 'Import Data', icon: Upload },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'procurement', name: 'Procurement', icon: ShoppingCart },
    { id: 'reports', name: 'Reports', icon: BarChart3 },
    { id: 'settings', name: 'Settings', icon: Settings },
    { id: 'help', name: 'Help & Guide', icon: HelpCircle },
  ];
  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 z-30">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-500/10 rounded-lg text-sky-400 border border-sky-500/20 glow-blue">
            <Boxes size={22} className="animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-base text-slate-100 tracking-wide">Smart Inventory</h1>
            <p className="text-[10px] text-sky-400 font-semibold uppercase tracking-wider">AI Powered ERP</p>
          </div>
        </div>
      </div>
      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-150 ${
                isActive 
                  ? 'bg-gradient-to-r from-sky-500/10 to-sky-500/5 text-sky-400 font-medium border-l-4 border-sky-400 shadow-sm shadow-sky-500/5' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} className={isActive ? 'text-sky-400' : 'text-slate-400'} />
                <span className="text-sm">{item.name}</span>
              </div>
              {item.badge && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-500/20 text-sky-400 rounded-full uppercase tracking-wider animate-bounce">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      {/* User Session Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/20">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-slate-800/80">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center font-bold text-white text-sm shrink-0">
              {user?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.username || 'Guest Administrator'}</p>
              <p className="text-[10px] text-slate-500">System Operator</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
            title="Log Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
