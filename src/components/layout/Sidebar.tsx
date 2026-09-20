import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarDays,
  CheckSquare,
  Video,
  FileSpreadsheet,
  Award,
  History,
  FolderArchive,
  DownloadCloud,
  FileCheck2,
  LogOut,
  Sparkles,
  BookOpen,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenProfile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, onOpenProfile }) => {
  const { role, user, logout } = useAuth();

  const adminNavItems: NavItem[] = [
    { id: 'overview', label: 'داشبورد اصلی', icon: LayoutDashboard },
    { id: 'majors-courses', label: 'مدیریت رشته‌ها و دروس', icon: BookOpen },
    { id: 'teachers', label: 'مدیریت اساتید', icon: Users },
    { id: 'students', label: 'مدیریت دانش‌آموزان', icon: GraduationCap },
    { id: 'classes', label: 'کلاس‌های آنلاین', icon: CalendarDays },
    { id: 'grades', label: 'گزارش و اصلاح نمرات', icon: Award },
    { id: 'reports', label: 'کارنامه‌های ماهانه', icon: FileSpreadsheet },
    { id: 'audit', label: 'لاگ و ممیزی سیستم', icon: History },
  ];

  const teacherNavItems: NavItem[] = [
    { id: 'overview', label: 'داشبورد مدرس', icon: LayoutDashboard },
    { id: 'conference', label: 'کلاس زنده و کنفرانس', icon: Video, highlight: true },
    { id: 'materials', label: 'فایل‌های آموزشی', icon: FolderArchive },
    { id: 'assignments', label: 'تکالیف و تصحیح', icon: CheckSquare },
    { id: 'grading', label: 'دفتر نمرات و حضور غیاب', icon: Award },
    { id: 'reports', label: 'کارنامه‌های ماهانه', icon: FileSpreadsheet },
  ];

  const studentNavItems: NavItem[] = [
    { id: 'overview', label: 'داشبورد دانش‌آموز', icon: LayoutDashboard },
    { id: 'live', label: 'ورود به کلاس زنده', icon: Video, highlight: true },
    { id: 'materials', label: 'فایل‌ها و جزوات', icon: DownloadCloud },
    { id: 'submissions', label: 'تکالیف و ارسال پاسخ', icon: FileCheck2 },
    { id: 'grades', label: 'نمرات و ارزیابی', icon: Award },
    { id: 'report', label: 'کارنامه ماهانه (PDF)', icon: FileSpreadsheet },
  ];

  const items =
    role === 'ADMIN'
      ? adminNavItems
      : role === 'TEACHER'
      ? teacherNavItems
      : studentNavItems;

  const roleLabel =
    role === 'ADMIN'
      ? 'مدیر کل سیستم'
      : role === 'TEACHER'
      ? 'مدرس سامانه'
      : 'دانش‌آموز';

  return (
    <aside className="w-full md:w-64 bg-[#0F172A] text-white flex flex-col shrink-0 border-l border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-700/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-lg shadow-blue-600/30">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-blue-400 tracking-tight leading-tight">
              سامانه آموزش آنلاین
            </h1>
            <p className="text-xs text-slate-400 mt-1">پنل مدیریت یکپارچه</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-5 h-5 ${
                    isActive
                      ? 'text-white'
                      : item.highlight
                      ? 'text-emerald-400'
                      : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.highlight && !isActive && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Profile Badge at bottom */}
      <div className="p-4 border-t border-slate-700/80 bg-slate-900/50">
        <div className="flex items-center justify-between">
          <div
            onClick={onOpenProfile}
            className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
            title="ویرایش مشخصات کاربری"
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt=""
                className="w-10 h-10 rounded-full object-cover border border-slate-600 group-hover:border-blue-400 transition-colors"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-lg font-bold text-white shadow-xs">
                {user?.firstName?.charAt(0) || 'ع'}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-slate-100 truncate group-hover:text-blue-300 transition-colors">
                {user ? `${user.firstName} ${user.lastName}` : 'کاربر گرامی'}
              </span>
              <span className="text-[10px] text-slate-400 truncate">{roleLabel}</span>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
            title="خروج از حساب کاربری"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
