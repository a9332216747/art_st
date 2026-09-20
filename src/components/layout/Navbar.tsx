import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { InAppNotification, UserRole } from '../../types';
import {
  Bell,
  Check,
  Shield,
  BookOpen,
  UserCheck,
  Plus,
  Video,
  Calendar,
} from 'lucide-react';

interface NavbarProps {
  onOpenProfile: () => void;
  onSelectTab?: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenProfile, onSelectTab }) => {
  const { role, switchDemoUser } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const notifs = await api.getNotifications();
      setNotifications(notifs);
    } catch (e) {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {}
  };

  const handleRoleSwitch = async (newRole: UserRole) => {
    if (newRole === role || isSwitching) return;
    setIsSwitching(true);
    try {
      await switchDemoUser(newRole);
    } finally {
      setIsSwitching(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handlePrimaryAction = () => {
    if (!onSelectTab) return;
    if (role === 'ADMIN') onSelectTab('classes');
    else if (role === 'TEACHER') onSelectTab('conference');
    else onSelectTab('live');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shadow-xs sticky top-0 z-30">
      {/* Right Side in RTL: Date and Quick Role Switcher */}
      <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
        <div className="flex items-center gap-2 text-slate-500 text-xs sm:text-sm font-medium">
          <Calendar className="w-4 h-4 text-slate-400 hidden sm:block" />
          <span>امروز: یکشنبه، ۱۶ شهریور ۱۴۰۴</span>
        </div>

        {/* Demo Role Switcher */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200/80 text-xs">
          <span className="text-slate-400 px-1.5 font-normal text-[11px]">نقش:</span>
          <button
            onClick={() => handleRoleSwitch('ADMIN')}
            disabled={isSwitching}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              role === 'ADMIN'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Shield className="w-3 h-3" />
            مدیر سیستم
          </button>
          <button
            onClick={() => handleRoleSwitch('TEACHER')}
            disabled={isSwitching}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              role === 'TEACHER'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            مدرس (علوی)
          </button>
          <button
            onClick={() => handleRoleSwitch('STUDENT')}
            disabled={isSwitching}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              role === 'STUDENT'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <UserCheck className="w-3 h-3" />
            دانش‌آموز (سارا)
          </button>
        </div>
      </div>

      {/* Left Side in RTL: Notifications, Divider, Action Button */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative text-slate-500 hover:text-slate-800 p-1.5 rounded-lg transition-colors"
            title="اعلان‌های سامانه"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-800">اعلان‌های سامانه</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700">
                      {unreadCount} جدید
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    علامت‌گذاری همه
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-right">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">هیچ اعلانی موجود نیست</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3.5 transition-colors ${
                        !n.read ? 'bg-blue-50/40' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-slate-800">{n.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(n.createdAt).toLocaleTimeString('fa-IR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-8 w-[1px] bg-slate-200"></div>

        {/* Primary Action Button */}
        <button
          onClick={handlePrimaryAction}
          className="bg-blue-50 text-blue-700 px-3.5 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-bold border border-blue-100 hover:bg-blue-100 transition-colors flex items-center gap-1.5 shadow-xs"
        >
          {role === 'ADMIN' ? (
            <>
              <Plus className="w-4 h-4" />
              <span>ایجاد کلاس جدید</span>
            </>
          ) : role === 'TEACHER' ? (
            <>
              <Video className="w-4 h-4 text-blue-600" />
              <span>ورود به کلاس آنلاین</span>
            </>
          ) : (
            <>
              <Video className="w-4 h-4 text-blue-600" />
              <span>کلاس‌های آنلاین زنده</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
