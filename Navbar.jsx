import React from 'react';
import GlobalSearch from './GlobalSearch';
import NotificationBell from './NotificationBell';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
export default function Navbar({ 
  currentPage, 
  setCurrentPage, 
  setSelectedProduct, 
  setSelectedWarehouse 
}) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const getPageTitle = () => {
    switch (currentPage) {
      case 'dashboard': return 'Operations Dashboard';
      case 'insights': return 'AI Business Insights';
      case 'products': return 'Product Catalogue';
      case 'warehouses': return 'Warehouse Management';
      case 'import': return 'Import Inventory Data';
      case 'notifications': return 'System Notifications';
      case 'procurement': return 'Procurement & Purchase Orders';
      case 'reports': return 'Business Reports & Export';
      case 'settings': return 'System Settings';
      case 'help': return 'Help & Quick Guide';
      default: return 'Smart ERP';
    }
  };
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md flex items-center justify-between px-8 fixed top-0 right-0 left-64 z-20">
      {/* Title */}
      <div>
        <h2 className="text-base font-bold text-slate-100 tracking-wide">{getPageTitle()}</h2>
        <p className="text-[10px] text-slate-500 font-medium">Operator Workspace</p>
      </div>
      {/* Global Search Bar */}
      <GlobalSearch 
        setCurrentPage={setCurrentPage} 
        setSelectedProduct={setSelectedProduct}
        setSelectedWarehouse={setSelectedWarehouse}
      />
      {/* System Quick Controls */}
      <div className="flex items-center gap-4">
        {/* Settings Variables display */}
        <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-950/40 border border-slate-800 text-[11px] font-semibold text-slate-400">
          <span>Currency: <strong className="text-slate-200">{settings.currency}</strong></span>
          <span className="w-1 h-1 bg-slate-700 rounded-full" />
          <span>Metric: <strong className="text-slate-200">{settings.units}</strong></span>
        </div>
        {/* Notification Bell */}
        <NotificationBell setCurrentPage={setCurrentPage} />
        
        {/* Operator Initials */}
        <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center cursor-default select-none shadow-sm shadow-sky-500/5 glow-blue">
          {user?.username?.substring(0, 2).toUpperCase() || 'OP'}
        </div>
      </div>
    </header>
  );
}
