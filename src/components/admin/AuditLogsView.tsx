import React, { useState, useEffect } from 'react';
import { GradeAuditLog } from '../../types';
import { api } from '../../api/client';
import { History, Shield, Clock, Search, RefreshCw, Filter, CheckCircle2, User } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedActionFilter, setSelectedActionFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAuditLogs();
      setLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error loading audit logs:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionName = (action: string) => {
    switch (action) {
      case 'GRADE_SAVED':
        return 'ثبت نمره روزانه';
      case 'GRADE_UPDATED':
      case 'GRADE_MODIFIED':
        return 'اصلاح نمره / حضور';
      case 'MAJOR_CREATED':
        return 'تعریف رشته جدید';
      case 'MAJOR_UPDATED':
        return 'ویرایش رشته تحصیلی';
      case 'MAJOR_DELETED':
        return 'حذف رشته تحصیلی';
      case 'COURSE_CREATED':
        return 'تعریف درس جدید';
      case 'COURSE_UPDATED':
        return 'اصلاح مشخصات درس';
      case 'COURSE_DELETED':
        return 'حذف درس';
      case 'REMOTE_DESKTOP_SESSION':
        return 'جلسه ریموت دسکتاپ';
      default:
        return action || 'تغییر داده';
    }
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CREATED')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (action.includes('DELETED')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (action.includes('UPDATED') || action.includes('MODIFIED')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (action.includes('REMOTE')) return 'bg-purple-50 text-purple-700 border-purple-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const filteredLogs = logs.filter((l) => {
    const operator = (l.changedByName || l.operatorName || l.teacherName || 'مدیر سیستم').toLowerCase();
    const act = (l.action || l.fieldChanged || '').toLowerCase();
    const reason = (l.reason || '').toLowerCase();
    const s = search.toLowerCase();

    const matchesSearch = !s || operator.includes(s) || act.includes(s) || reason.includes(s);
    const matchesAction = !selectedActionFilter || l.action === selectedActionFilter;
    return matchesSearch && matchesAction;
  });

  const formatDateTime = (ts: any) => {
    if (!ts) return '-';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return String(ts);
      return d.toLocaleDateString('fa-IR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(ts);
    }
  };

  const formatValueDisplay = (val: any) => {
    if (val === undefined || val === null) return '-';
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val);
      } catch {
        return '[شیء]';
      }
    }
    return String(val);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <History className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-lg font-black text-slate-800">لاگ‌های ممیزی و تاریخچه امنیت سامانه</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ردگیری خودکار و غیرقابل تغییر تمامی عملیات‌های ثبت نمره، اصلاح وضعیت حضور، تغییرات دروس و رشته‌ها
          </p>
        </div>

        <button
          onClick={loadLogs}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>به‌روزرسانی لاگ‌ها</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="جستجو در لاگ‌ها (نام اقدام‌کننده، نوع عملیات، علت تغییر)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
        </div>

        <select
          value={selectedActionFilter}
          onChange={(e) => setSelectedActionFilter(e.target.value)}
          className="px-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium w-full sm:w-auto"
        >
          <option value="">همه انواع عملیات</option>
          <option value="GRADE_SAVED">ثبت نمره</option>
          <option value="GRADE_UPDATED">اصلاح نمره / حضور</option>
          <option value="MAJOR_CREATED">تعریف رشته</option>
          <option value="MAJOR_UPDATED">ویرایش رشته</option>
          <option value="COURSE_CREATED">تعریف درس</option>
          <option value="COURSE_UPDATED">ویرایش درس</option>
          <option value="REMOTE_DESKTOP_SESSION">ریموت دسکتاپ</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-3 px-4">زمان ثبت رویداد</th>
                <th className="py-3 px-4">کاربر اقدام‌کننده</th>
                <th className="py-3 px-4">نوع عملیات ممیزی</th>
                <th className="py-3 px-4">مقدار قبلی</th>
                <th className="py-3 px-4">مقدار جدید</th>
                <th className="py-3 px-4">علت یا توضیحات تغییر</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    هیچ لاگی منطبق بر جستجوی شما یافت نشد
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => {
                  const operatorName = log.changedByName || log.operatorName || log.teacherName || 'مدیر سیستم';
                  const actionType = log.action || log.fieldChanged || 'RECORD_ACTION';
                  const prevVal = log.oldValue !== undefined ? log.oldValue : log.previousValue;
                  const newVal = log.newValue !== undefined ? log.newValue : log.value;

                  return (
                    <tr key={log.id || `log-${index}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDateTime(log.timestamp)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{operatorName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${getActionBadgeColor(actionType)}`}>
                          {getActionName(actionType)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-rose-600 font-semibold max-w-[150px] truncate" title={formatValueDisplay(prevVal)}>
                        {formatValueDisplay(prevVal)}
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-600 font-semibold max-w-[150px] truncate" title={formatValueDisplay(newVal)}>
                        {formatValueDisplay(newVal)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 leading-relaxed max-w-[220px]">
                        {log.reason || 'ثبت سیستمی'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
