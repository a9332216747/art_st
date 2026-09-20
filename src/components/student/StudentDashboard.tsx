import React, { useState, useEffect } from 'react';
import { ClassSession, Assignment, AssignmentSubmission, DailyGradeRecord } from '../../types';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Video,
  FileText,
  Award,
  CheckCircle2,
  Clock,
  DownloadCloud,
  FileSpreadsheet,
  Radio,
  BookOpen,
  Calendar,
} from 'lucide-react';
import { WebConferenceRoom } from '../conference/WebConferenceRoom';
import { EducationalFilesManager } from '../teacher/EducationalFilesManager';
import { StudentAssignments } from './StudentAssignments';
import { StudentGradesView } from './StudentGradesView';
import { MonthlyReportModal } from '../reports/MonthlyReportModal';

interface StudentDashboardProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ currentTab, onSelectTab }) => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [grades, setGrades] = useState<DailyGradeRecord[]>([]);
  const [activeLiveClass, setActiveLiveClass] = useState<ClassSession | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  useEffect(() => {
    loadStudentData();
  }, [user]);

  const loadStudentData = async () => {
    if (!user) return;
    try {
      const [cList, aList, subList, gList] = await Promise.all([
        api.getClasses({ studentId: user.id }),
        api.getAssignments(),
        api.getSubmissions({ studentId: user.id }),
        api.getGrades({ studentId: user.id }),
      ]);
      setClasses(cList);
      setAssignments(aList);
      setSubmissions(subList);
      setGrades(gList);
      if (cList.length > 0 && !activeLiveClass) {
        setActiveLiveClass(cList[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const totalDailySum = grades.reduce((acc, curr) => acc + (curr.dailyGrade || 0), 0);
  const avgGrade = grades.length > 0 ? (totalDailySum / grades.length).toFixed(1) : '۱۸.۲';
  const submittedIds = submissions.map((s) => s.assignmentId);
  const pendingAssignments = assignments.filter((a) => !submittedIds.includes(a.id));

  // If live class tab is selected
  if (currentTab === 'live') {
    if (classes.length === 0) {
      return (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          کلاسی برای شما یافت نشد.
        </div>
      );
    }
    const currentCls = activeLiveClass || classes[0];
    return <WebConferenceRoom currentClass={currentCls} onExit={() => onSelectTab('overview')} />;
  }

  if (currentTab === 'materials') return <EducationalFilesManager />;
  if (currentTab === 'submissions') return <StudentAssignments />;
  if (currentTab === 'grades') return <StudentGradesView />;
  if (currentTab === 'report') {
    return (
      <div className="space-y-6">
        <MonthlyReportModal isOpen={true} onClose={() => onSelectTab('overview')} studentId={user?.id} />
      </div>
    );
  }

  // Default Overview with Professional Polish design
  return (
    <div className="space-y-6">
      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Average Grade */}
        <div
          onClick={() => onSelectTab('grades')}
          className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between h-28 cursor-pointer hover:border-blue-300 transition-colors"
        >
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-sm">میانگین نمرات کلاسی</span>
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-slate-800 tracking-tight font-mono">
              {avgGrade} <span className="text-xs font-normal text-slate-400">از ۲۰</span>
            </span>
            <span className="text-[10px] text-blue-600 font-medium">مشاهده کارنامه و ریزنمرات ←</span>
          </div>
        </div>

        {/* Pending Homework */}
        <div
          onClick={() => onSelectTab('submissions')}
          className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between h-28 cursor-pointer hover:border-amber-300 transition-colors"
        >
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-sm">تکالیف در انتظار ارسال</span>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-slate-800 tracking-tight font-mono">
              {pendingAssignments.length}
            </span>
            <span className="text-[10px] text-amber-600 font-medium">ارسال پاسخ تمرینات ←</span>
          </div>
        </div>

        {/* Enrolled Classes */}
        <div
          onClick={() => onSelectTab('materials')}
          className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between h-28 cursor-pointer hover:border-emerald-300 transition-colors"
        >
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-sm">کلاس‌های ثبت‌نامی</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <BookOpen className="w-4 h-4" />
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-slate-800 tracking-tight font-mono">
              {classes.length}
            </span>
            <span className="text-[10px] text-emerald-600 font-medium">دریافت جزوات و اسلایدها ←</span>
          </div>
        </div>
      </div>

      {/* Class Schedule Grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-700">برنامه کلاس‌های آنلاین هفتگی شما</h3>
          <span className="text-xs text-blue-600 font-medium">سال تحصیلی جاری</span>
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
                <p className="text-xs text-slate-500 mt-1">
                  استاد: {cls.teacherName} | {cls.scheduleDay}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between">
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  کلاس فعال
                </span>
                <button
                  onClick={() => {
                    setActiveLiveClass(cls);
                    onSelectTab('live');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-xs"
                >
                  <Video className="w-3.5 h-3.5" />
                  ورود به اتاق کلاس
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <MonthlyReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        studentId={user?.id}
      />
    </div>
  );
};
