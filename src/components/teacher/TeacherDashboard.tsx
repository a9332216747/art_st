import React, { useState, useEffect } from 'react';
import { ClassSession, Assignment, AssignmentSubmission, DailyGradeRecord } from '../../types';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Video,
  BookOpen,
  CheckSquare,
  Award,
  Users,
  Clock,
  ArrowRight,
  FolderArchive,
  Radio,
  FileSpreadsheet,
} from 'lucide-react';
import { WebConferenceRoom } from '../conference/WebConferenceRoom';
import { EducationalFilesManager } from './EducationalFilesManager';
import { TeacherAssignmentsManager } from './TeacherAssignmentsManager';
import { DailyGradingSystem } from './DailyGradingSystem';
import { MonthlyReportModal } from '../reports/MonthlyReportModal';

interface TeacherDashboardProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ currentTab, onSelectTab }) => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [activeLiveClass, setActiveLiveClass] = useState<ClassSession | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  useEffect(() => {
    loadTeacherData();
  }, [user]);

  const loadTeacherData = async () => {
    if (!user) return;
    try {
      const [cList, aList, subList] = await Promise.all([
        api.getClasses({ teacherId: user.id }),
        api.getAssignments({ teacherId: user.id }),
        api.getSubmissions({ teacherId: user.id }),
      ]);
      setClasses(cList);
      setAssignments(aList);
      setSubmissions(subList);
      if (cList.length > 0 && !activeLiveClass) {
        setActiveLiveClass(cList[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const pendingSubmissions = submissions.filter((s) => s.status === 'PENDING');

  // If currently inside WebConferenceRoom
  if (currentTab === 'conference') {
    if (classes.length === 0) {
      return (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          کلاسی برای شما تعریف نشده است.
        </div>
      );
    }
    const currentCls = activeLiveClass || classes[0];
    return (
      <WebConferenceRoom
        currentClass={currentCls}
        onExit={() => onSelectTab('overview')}
      />
    );
  }

  if (currentTab === 'materials') return <EducationalFilesManager />;
  if (currentTab === 'assignments') return <TeacherAssignmentsManager />;
  if (currentTab === 'grading') return <DailyGradingSystem />;
  if (currentTab === 'reports') {
    return (
      <div className="space-y-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
          <div>
            <h2 className="text-lg font-bold text-slate-800">کارنامه‌های ماهانه دانش‌آموزان</h2>
            <p className="text-xs text-slate-500 mt-1">
              مشاهده عملکرد ماهانه، نرخ حضور و ریزنمرات دانش‌آموزان کلاس‌های شما
            </p>
          </div>
          <button
            onClick={() => setIsReportOpen(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
          >
            مشاهده کارنامه
          </button>
        </div>
        <MonthlyReportModal isOpen={true} onClose={() => onSelectTab('overview')} />
      </div>
    );
  }

  // Default Overview with Professional Polish design
  return (
    <div className="space-y-6">
      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => onSelectTab('assignments')}
          className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between h-28 cursor-pointer hover:border-amber-300 transition-colors"
        >
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-sm">تکالیف در انتظار تصحیح</span>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <CheckSquare className="w-4 h-4" />
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-slate-800 tracking-tight font-mono">
              {pendingSubmissions.length}
            </span>
            <span className="text-[10px] text-amber-600 font-medium">بررسی و ثبت نمره ←</span>
          </div>
        </div>

        <div
          onClick={() => onSelectTab('materials')}
          className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between h-28 cursor-pointer hover:border-blue-300 transition-colors"
        >
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-sm">کلاس‌های تحت تدریس</span>
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <BookOpen className="w-4 h-4" />
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-slate-800 tracking-tight font-mono">
              {classes.length}
            </span>
            <span className="text-[10px] text-blue-600 font-medium">فایل‌ها و جزوات ←</span>
          </div>
        </div>

        <div
          onClick={() => onSelectTab('grading')}
          className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between h-28 cursor-pointer hover:border-emerald-300 transition-colors"
        >
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-sm">دفتر ارزیابی و حضور و غیاب</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-emerald-700">آماده ثبت جلسه جاری</span>
            <span className="text-[10px] text-emerald-600 font-medium">ورود به دفتر نمره ←</span>
          </div>
        </div>
      </div>

      {/* Class Schedule Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-700">کلاس‌های آنلاین و وب‌کنفرانس شما</h3>
          <span className="text-xs text-blue-600 font-medium">نیم‌سال جاری</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-blue-700 text-[11px] font-bold">
                    {cls.subject}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-600">
                    {cls.startTime} الی {cls.endTime}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-2">{cls.title}</h4>
                <p className="text-xs text-slate-500 mt-1">{cls.scheduleDay}</p>
              </div>

              <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {cls.studentIds?.length || 0} دانش‌آموز ثبت‌نامی
                </span>
                <button
                  onClick={() => {
                    setActiveLiveClass(cls);
                    onSelectTab('conference');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-xs"
                >
                  <Video className="w-3.5 h-3.5" />
                  ورود به اتاق کنفرانس
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <MonthlyReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} />
    </div>
  );
};
