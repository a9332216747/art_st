import React, { useState, useEffect } from 'react';
import { DailyGradeRecord, ClassSession } from '../../types';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Award, CheckCircle, Clock, FileSpreadsheet, TrendingUp, Calendar } from 'lucide-react';
import { MonthlyReportModal } from '../reports/MonthlyReportModal';

export const StudentGradesView: React.FC = () => {
  const { user } = useAuth();
  const [grades, setGrades] = useState<DailyGradeRecord[]>([]);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [isReportOpen, setIsReportOpen] = useState(false);

  useEffect(() => {
    if (user) loadStudentGrades();
  }, [user]);

  const loadStudentGrades = async () => {
    if (!user) return;
    try {
      const [gList, cList] = await Promise.all([
        api.getGrades({ studentId: user.id }),
        api.getClasses(),
      ]);
      setGrades(gList);
      setClasses(cList);
    } catch (e) {
      console.error(e);
    }
  };

  const totalSum = grades.reduce((acc, curr) => acc + (curr.dailyGrade || 0), 0);
  const average = grades.length > 0 ? (totalSum / grades.length).toFixed(1) : '۰';
  const presentCount = grades.filter((g) => g.attendanceStatus === 'PRESENT').length;

  const chartData = grades.map((g) => ({
    date: g.date,
    dailyGrade: g.dailyGrade,
    participation: g.participationGrade,
    assignment: g.assignmentGrade,
  }));

  return (
    <div className="space-y-6">
      {/* Header with PDF report trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200">
        <div>
          <h2 className="text-lg font-black text-slate-800">نمرات و پرونده عملکرد تحصیلی من</h2>
          <p className="text-xs text-slate-500 mt-1">
            مشاهده نمرات روزانه ثبت شده توسط اساتید، بازخوردها و وضعیت حضور در جلسات
          </p>
        </div>
        <button
          onClick={() => setIsReportOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all"
        >
          <FileSpreadsheet className="w-4 h-4" />
          دریافت کارنامه ماهانه (خروجی PDF)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">معدل و میانگین نمرات</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">{average}</span>
            <span className="text-xs text-slate-400">از ۲۰ نمره</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">تعداد جلسات حاضر</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 font-mono">{presentCount}</span>
            <span className="text-xs text-slate-400">از {grades.length} جلسه</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">وضعیت پیشرفت تحصیلی</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-lg font-black text-slate-900">روند صعودی مطلوب</span>
          </div>
        </div>
      </div>

      {/* Progress Chart */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 mb-4">نمودار نمرات در جلسات اخیر</h3>
        <div className="h-64 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
              <YAxis domain={[0, 20]} stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  color: '#fff',
                  borderRadius: '12px',
                  fontSize: '12px',
                  textAlign: 'right',
                }}
              />
              <Line
                type="monotone"
                dataKey="dailyGrade"
                name="نمره روزانه"
                stroke="#4f46e5"
                strokeWidth={2.5}
                dot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="participation"
                name="فعالیت کلاسی"
                stroke="#f59e0b"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="assignment"
                name="تکلیف"
                stroke="#10b981"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Grades Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700">
          جدول ریز نمرات روزانه
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-white border-b border-slate-100 text-slate-500 font-bold">
              <tr>
                <th className="py-3 px-4">تاریخ جلسه</th>
                <th className="py-3 px-4">کلاس / درس</th>
                <th className="py-3 px-4">وضعیت حضور</th>
                <th className="py-3 px-4">نمره روزانه</th>
                <th className="py-3 px-4">نمره فعالیت</th>
                <th className="py-3 px-4">نمره تکلیف</th>
                <th className="py-3 px-4">یادداشت استاد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grades.map((g) => {
                const cls = classes.find((c) => c.id === g.classId);
                return (
                  <tr key={g.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono text-slate-600">{g.date}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{cls?.title || 'کلاس'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          g.attendanceStatus === 'PRESENT'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {g.attendanceStatus === 'PRESENT' ? 'حاضر' : 'غایب'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">{g.dailyGrade} / ۲۰</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{g.participationGrade} / ۲۰</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{g.assignmentGrade} / ۲۰</td>
                    <td className="py-3 px-4 text-slate-600">{g.teacherNotes || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Report Modal */}
      <MonthlyReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        studentId={user?.id}
      />
    </div>
  );
};
