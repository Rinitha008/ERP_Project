import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, Trash2, AlertTriangle, Info, CheckCircle2, ShieldAlert } from 'lucide-react';
import { request } from '../utils/api';
export default function NotificationBell({ setCurrentPage }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const fetchNotifications = async () => {
    try {
      const data = await request('/notifications?limit=5');
      setNotifications(data);
    } catch (e) {
      console.warn("Could not fetch notifications in bell component.");
    }
  };
  useEffect(() => {
    fetchNotifications();
    // Poll notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);
  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const markRead = async (id) => {
    try {
      await request(`/notifications/${id}/read`, { method: 'POST' });
      fetchNotifications();
    } catch (e) {
      // local fallback
      const updated = notifications.map(n => n.id === id ? { ...n, is_read: true } : n);
      setNotifications(updated);
      localStorage.setItem('notifications', JSON.stringify(updated));
    }
  };
  const markAllRead = async () => {
    try {
      await request('/notifications/read-all', { method: 'POST' });
      fetchNotifications();
    } catch (e) {
      const updated = notifications.map(n => ({ ...n, is_read: true }));
      setNotifications(updated);
      localStorage.setItem('notifications', JSON.stringify(updated));
    }
  };
  const getIcon = (type) => {
    switch (type) {
      case 'danger':
        return <ShieldAlert size={16} className="text-red-400" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-amber-400" />;
      case 'success':
        return <CheckCircle2 size={16} className="text-emerald-400" />;
      default:
        return <Info size={16} className="text-sky-400" />;
    }
  };
  const getBg = (type) => {
    switch (type) {
      case 'danger': return 'bg-red-500/10 border-red-500/20';
      case 'warning': return 'bg-amber-500/10 border-amber-500/20';
      case 'success': return 'bg-emerald-500/10 border-emerald-500/20';
      default: return 'bg-sky-500/10 border-sky-500/20';
    }
  };
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-slate-100 rounded-xl border border-slate-700/50 transition-all flex items-center justify-center relative"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border border-slate-900 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden z-50 glass-panel">
          <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-sm text-slate-200">Alerts & Warnings</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllRead}
                className="flex items-center gap-1 text-[11px] font-semibold text-sky-400 hover:text-sky-300 transition-colors"
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="py-8 px-4 text-center text-xs text-slate-500">
                No recent notifications.
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id}
                  onClick={() => {
                    if (!notif.is_read) markRead(notif.id);
                  }}
                  className={`p-3.5 text-left transition-colors cursor-pointer ${
                    notif.is_read ? 'hover:bg-slate-800/30' : 'bg-sky-500/5 hover:bg-sky-500/10'
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`p-1.5 rounded-lg border h-fit shrink-0 ${getBg(notif.type)}`}>
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-semibold truncate ${notif.is_read ? 'text-slate-300' : 'text-slate-100'}`}>
                          {notif.title}
                        </p>
                        {!notif.is_read && (
                          <span className="w-1.5 h-1.5 bg-sky-400 rounded-full shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                      <p className="text-[9px] text-slate-500 mt-1">
                        {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <button 
            onClick={() => {
              setIsOpen(false);
              setCurrentPage('notifications');
            }}
            className="w-full py-2.5 bg-slate-950/40 hover:bg-slate-950/60 border-t border-slate-800 text-center text-xs font-semibold text-slate-300 hover:text-slate-100 transition-colors"
          >
            View All Notifications
          </button>
        </div>
      )}
    </div>
  );
}
