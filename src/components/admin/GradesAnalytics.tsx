import React, { useState, useEffect } from 'react';
import { DailyGradeRecord, User, ClassSession, AssignmentSubmission } from '../../types';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  Award,
  Filter,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  FileSpreadsheet,
  Edit2,
  Plus,
  RefreshCw,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from '../common/Modal';

export const GradesAnalytics: React.FC = () => {
  const toast = useToast();
  const [grades, setGrades] = useState<DailyGradeRecord[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');

  // Admin Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<DailyGradeRecord | null>(null);
  const [gradeForm, setGradeForm] = useState({
    studentId: '',
    classId: '',
    date: new Date().toLocaleDateString('fa-IR'),
    dailyGrade: 18,
    participationGrade: 18,
    assignmentGrade: 18,
    attendanceStatus: 'PRESENT' as 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED',
    teacherNotes: '',
    reason: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [gList, sList, tList, cList, subList] = await Promise.all([
        api.getGrades(),
        api.getUsers({ role: 'STUDENT' }),
        api.getUsers({ role: 'TEACHER' }),
        api.getClasses(),
        api.getSubmissions(),
      ]);
      setGrades(Array.isArray(gList) ? gList : []);
      setStudents(sList);
      setTeachers(tList);
      setClasses(cList);
      setSubmissions(subList);
    } catch (e) {
      console.error(e);
      toast.error('خطا در بارگذاری داده‌های نمرات');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEdit = (grade: DailyGradeRecord) => {
    setEditingGrade(grade);
    setGradeForm({
      studentId: grade.studentId,
      classId: grade.classId,
      date: grade.date,
      dailyGrade: grade.dailyGrade,
      participationGrade: grade.participationGrade || 0,
      assignmentGrade: grade.assignmentGrade || 0,
      attendanceStatus: (grade.attendanceStatus as any) || 'PRESENT',
      teacherNotes: grade.teacherNotes || '',
      reason: 'اصلاح نمره و حضور توسط مدیریت سیستم',
    });
    setIsEditModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingGrade(null);
    setGradeForm({
      studentId: students[0]?.id || '',
      classId: classes[0]?.id || '',
      date: new Date().toLocaleDateString('fa-IR'),
      dailyGrade: 20,
      participationGrade: 20,
      assignmentGrade: 20,
      attendanceStatus: 'PRESENT',
      teacherNotes: 'ثبت مستقیم توسط مدیر سیستم',
      reason: 'ثبت ارزیابی کلاسی توسط مدیر سامانه',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingGrade) {
        await api.updateGrade(editingGrade.id, {
          ...gradeForm,
          operatorName: 'مدیر کل سیستم',
        });
        toast.success('نمره و وضعیت حضور با موفقیت اصلاح شد و در لاگ سیستم ثبت گردید.');
      } else {
        await api.saveGrade({
          ...gradeForm,
          teacherId: classes.find((c) => c.id === gradeForm.classId)?.teacherId || 'admin',
        });
        toast.success('ارزیابی جدید با موفقیت ثبت شد');
      }
      setIsEditModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'خطا در ذخیره نمره');
    }
  };

  // Filtered grades
  const filteredGrades = grades.filter((g) => {
    if (selectedStudentId && g.studentId !== selectedStudentId) return false;
    if (selectedTeacherId && g.teacherId !== selectedTeacherId) return false;
    if (selectedClassId && g.classId !== selectedClassId) return false;
    return true;
  });

  // Calculate metrics
  const totalDailySum = filteredGrades.reduce((acc, curr) => acc + (curr.dailyGrade || 0), 0);
  const avgDailyGrade = filteredGrades.length > 0 ? (totalDailySum / filteredGrades.length).toFixed(1) : '۰';

  const presentCount = filteredGrades.filter((g) => g.attendanceStatus === 'PRESENT').length;
  const absentCount = filteredGrades.filter((g) => g.attendanceStatus === 'ABSENT').length;
  const lateCount = filteredGrades.filter((g) => g.attendanceStatus === 'LATE').length;
  const totalAttendance = filteredGrades.length || 1;
  const attendanceRate = Math.round((presentCount / totalAttendance) * 100);

  // Chart data: Progress Trend
  const trendData = filteredGrades.map((g) => {
    const student = students.find((s) => s.id === g.studentId);
    return {
      name: `${g.date}`,
      daily: g.dailyGrade,
      assignment: g.assignmentGrade || 0,
      participation: g.participationGrade || 0,
      studentName: student ? `${student.firstName} ${student.lastName}` : 'دانش‌آموز',
    };
  });

  // Attendance donut data
  const attendanceData = [
    { name: 'حاضر', value: presentCount || 1, color: '#10b981' },
    { name: 'تاخیر', value: lateCount, color: '#f59e0b' },
    { name: 'غایب', value: absentCount, color: '#f43f5e' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Award className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-black text-slate-800">گزارش و اصلاح نمرات و وضعیت حضور دانش‌آموزان</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            مشاهده نمودارهای تحلیلی، رصد عملکرد کلاسی و دسترسی مدیر به ویرایش نمرات و وضعیت حضور و غیاب
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            title="به‌روزرسانی"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت نمره / وضعیت جدید</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">میانگین نمرات روزانه</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">{avgDailyGrade}</span>
            <span className="text-xs text-slate-400">از ۲۰ نمره</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">درصد حضور در کلاس</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 font-mono">{attendanceRate}٪</span>
            <span className="text-xs text-slate-400">حضور منظم</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">جلسات نیازمند بررسی</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 font-mono">{absentCount}</span>
            <span className="text-xs text-slate-400">مورد غیبت</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">تعداد کل ارزیابی‌ها</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-600 font-mono">{filteredGrades.length}</span>
            <span className="text-xs text-slate-400">رکورد ثبت‌شده</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700">فیلتر نمرات بر اساس:</span>
        </div>

        <select
          value={selectedStudentId}
          onChange={(e) => setSelectedStudentId(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">همه دانش‌آموزان</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.firstName} {s.lastName}
            </option>
          ))}
        </select>

        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">همه کلاس‌ها و دروس</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Line Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 mb-4">روند نمرات روزانه و ارزیابی کلاسی</h3>
          <div className="h-56 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 20]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="daily"
                  name="نمره روزانه"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="assignment"
                  name="تکلیف"
                  stroke="#10b981"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="participation"
                  name="فعالیت کلاسی"
                  stroke="#f59e0b"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance Distribution Donut */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <h3 className="text-sm font-bold text-slate-800 mb-2">توزیع وضعیت حضور و غیاب</h3>
          <div className="h-56 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={attendanceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {attendanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
            <div>
              <div className="text-[11px] text-slate-500">حاضر</div>
              <div className="text-sm font-bold text-emerald-600">{presentCount} جلسه</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">تاخیر</div>
              <div className="text-sm font-bold text-amber-500">{lateCount} جلسه</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">غایب</div>
              <div className="text-sm font-bold text-rose-500">{absentCount} جلسه</div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Grades Table with Admin Edit Action */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between font-bold text-xs text-slate-700">
          <span>دفتر ثبت نمرات تفکیکی جلسات و مدیریت وضعیت حضور</span>
          <span className="text-indigo-600">امکان اصلاح مستقیم توسط مدیر سیستم فعال است</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-white border-b border-slate-100 text-slate-500 font-bold">
              <tr>
                <th className="py-3 px-4">تاریخ</th>
                <th className="py-3 px-4">دانش‌آموز</th>
                <th className="py-3 px-4">کلاس / درس</th>
                <th className="py-3 px-4">وضعیت حضور</th>
                <th className="py-3 px-4">نمره روزانه</th>
                <th className="py-3 px-4">نمره فعالیت</th>
                <th className="py-3 px-4">نمره تکلیف</th>
                <th className="py-3 px-4">یادداشت استاد</th>
                <th className="py-3 px-4 text-center">عملیات اصلاح</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGrades.map((g) => {
                const stu = students.find((s) => s.id === g.studentId);
                const cls = classes.find((c) => c.id === g.classId);
                return (
                  <tr key={g.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-600">{g.date}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {stu ? `${stu.firstName} ${stu.lastName}` : g.studentId}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{cls?.title || 'کلاس'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          g.attendanceStatus === 'PRESENT'
                            ? 'bg-emerald-50 text-emerald-700'
                            : g.attendanceStatus === 'LATE'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {g.attendanceStatus === 'PRESENT'
                          ? 'حاضر'
                          : g.attendanceStatus === 'LATE'
                          ? 'تاخیر'
                          : 'غایب'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">{g.dailyGrade} / ۲۰</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{g.participationGrade ?? '-'} / ۲۰</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{g.assignmentGrade ?? '-'} / ۲۰</td>
                    <td className="py-3 px-4 text-slate-500 max-w-[180px] truncate">{g.teacherNotes || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenEdit(g)}
                        className="flex items-center justify-center gap-1 mx-auto px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
                        title="اصلاح نمره و حضور توسط مدیر"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>اصلاح نمره</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT / CREATE GRADE MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editingGrade ? 'اصلاح نمره و وضعیت حضور توسط مدیر سیستم' : 'ثبت مستقیم نمره و حضور توسط مدیر'}
      >
        <form onSubmit={handleSaveGrade} className="space-y-4 text-right">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center gap-2">
            <Shield className="w-4 h-4 shrink-0 text-blue-600" />
            <span>
              هرگونه اصلاح نمره و حضور توسط مدیر سیستم همراه با شناسه کاربری و علت در لاگ‌های ممیزی ثبت می‌شود.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">دانش‌آموز:</label>
              <select
                disabled={!!editingGrade}
                value={gradeForm.studentId}
                onChange={(e) => setGradeForm({ ...gradeForm, studentId: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-bold"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">کلاس / درس:</label>
              <select
                disabled={!!editingGrade}
                value={gradeForm.classId}
                onChange={(e) => setGradeForm({ ...gradeForm, classId: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">وضعیت حضور و غیاب:</label>
              <select
                value={gradeForm.attendanceStatus}
                onChange={(e) =>
                  setGradeForm({ ...gradeForm, attendanceStatus: e.target.value as any })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-bold"
              >
                <option value="PRESENT">حاضر در کلاس</option>
                <option value="LATE">با تاخیر</option>
                <option value="ABSENT">غایب غیرموجه</option>
                <option value="EXCUSED">غیبت موجه</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تاریخ جلسه:</label>
              <input
                type="text"
                value={gradeForm.date}
                onChange={(e) => setGradeForm({ ...gradeForm, date: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نمره روزانه (از ۲۰):</label>
              <input
                type="number"
                min={0}
                max={20}
                step={0.25}
                required
                value={gradeForm.dailyGrade}
                onChange={(e) =>
                  setGradeForm({ ...gradeForm, dailyGrade: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono font-bold text-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">فعالیت کلاسی (از ۲۰):</label>
              <input
                type="number"
                min={0}
                max={20}
                step={0.25}
                value={gradeForm.participationGrade}
                onChange={(e) =>
                  setGradeForm({ ...gradeForm, participationGrade: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نمره تکلیف (از ۲۰):</label>
              <input
                type="number"
                min={0}
                max={20}
                step={0.25}
                value={gradeForm.assignmentGrade}
                onChange={(e) =>
                  setGradeForm({ ...gradeForm, assignmentGrade: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">علت اصلاح یا توضیحات مدیر:</label>
            <input
              type="text"
              required
              placeholder="مانند: ارائه گواهی پزشکی موجه، بازبینی برگه امتحانی یا ثبت نمره جبرانی"
              value={gradeForm.reason}
              onChange={(e) => setGradeForm({ ...gradeForm, reason: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">یادداشت برای کارنامه دانش‌آموز:</label>
            <textarea
              rows={2}
              placeholder="توضیح قابل مشاهده برای دانش‌آموز..."
              value={gradeForm.teacherNotes}
              onChange={(e) => setGradeForm({ ...gradeForm, teacherNotes: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ذخیره تغییرات و ثبت در ممیزی</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
