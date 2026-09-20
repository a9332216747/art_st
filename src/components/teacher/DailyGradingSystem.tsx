import React, { useState, useEffect } from 'react';
import { DailyGradeRecord, ClassSession, User } from '../../types';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Save,
  Users,
  CheckCheck,
  AlertCircle,
} from 'lucide-react';

export const DailyGradingSystem: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState('۱۴۰۴/۰۷/۲۰');
  const [students, setStudents] = useState<User[]>([]);
  const [grades, setGrades] = useState<Record<string, Partial<DailyGradeRecord>>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadClassesAndStudents();
  }, []);

  useEffect(() => {
    if (selectedClassId && selectedDate) {
      loadGradesForClassAndDate();
    }
  }, [selectedClassId, selectedDate]);

  const loadClassesAndStudents = async () => {
    try {
      const [cList, sList] = await Promise.all([
        api.getClasses(),
        api.getUsers({ role: 'STUDENT' }),
      ]);
      setClasses(cList);
      setStudents(sList);
      if (cList.length > 0) {
        setSelectedClassId(cList[0].id);
      }
    } catch (e) {
      toast.error('خطا در بارگذاری اطلاعات کلاس');
    }
  };

  const loadGradesForClassAndDate = async () => {
    try {
      const existing = await api.getGrades({
        classId: selectedClassId,
        date: selectedDate,
      });

      const map: Record<string, Partial<DailyGradeRecord>> = {};
      existing.forEach((g) => {
        map[g.studentId] = g;
      });

      // Default values for enrolled students
      const cls = classes.find((c) => c.id === selectedClassId);
      const enrolled = students.filter((s) => cls?.studentIds?.includes(s.id));

      enrolled.forEach((s) => {
        if (!map[s.id]) {
          map[s.id] = {
            studentId: s.id,
            classId: selectedClassId,
            teacherId: user?.id || 'usr_teacher_1',
            date: selectedDate,
            dailyGrade: 18,
            participationGrade: 18,
            assignmentGrade: 18,
            attendanceStatus: 'PRESENT',
            teacherNotes: '',
          };
        }
      });

      setGrades(map);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStudentGrade = (
    studentId: string,
    field: keyof DailyGradeRecord,
    value: any
  ) => {
    setGrades((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }));
  };

  const handleMarkAllPresent = () => {
    setGrades((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((sId) => {
        updated[sId] = {
          ...updated[sId],
          attendanceStatus: 'PRESENT',
        };
      });
      return updated;
    });
    toast.success('تمامی دانش‌آموزان به عنوان «حاضر» علامت‌گذاری شدند');
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const recordsToSave = Object.values(grades).filter(
        (rec): rec is Partial<DailyGradeRecord> => typeof rec === 'object' && rec !== null
      );
      const promises = recordsToSave.map((record) =>
        api.saveGrade({
          dailyGrade: record.dailyGrade ?? 18,
          participationGrade: record.participationGrade ?? 18,
          assignmentGrade: record.assignmentGrade ?? 18,
          attendanceStatus: record.attendanceStatus ?? 'PRESENT',
          teacherNotes: record.teacherNotes ?? '',
          studentId: record.studentId || '',
          classId: selectedClassId,
          date: selectedDate,
          teacherId: user?.id || 'usr_teacher_1',
        })
      );
      await Promise.all(promises);
      toast.success('تمامی نمرات و وضعیت حضور و غیاب ذخیره و ممیزی شدند');
    } catch (e) {
      toast.error('خطا در ذخیره نمرات');
    } finally {
      setIsSaving(false);
    }
  };

  const currentClass = classes.find((c) => c.id === selectedClassId);
  const enrolledStudents = students.filter((s) => currentClass?.studentIds?.includes(s.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200">
        <div>
          <h2 className="text-lg font-black text-slate-800">دفتر نمره‌دهی روزانه و حضور و غیاب</h2>
          <p className="text-xs text-slate-500 mt-1">
            ثبت نمره کلاسی، ارزشیابی فعالیت شفاهی، تمرین‌ها و ثبت تاخیر یا غیبت دانش‌آموزان
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllPresent}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
          >
            <CheckCheck className="w-4 h-4 text-emerald-600" />
            ثبت همه حاضر
          </button>
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'در حال ذخیره‌سازی...' : 'ذخیره نمرات جلسه'}
          </button>
        </div>
      </div>

      {/* Control Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-slate-200">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">انتخاب کلاس درس</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.subject})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">تاریخ جلسه (شمسی)</label>
          <div className="relative">
            <input
              type="text"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              placeholder="۱۴۰۴/۰۷/۲۰"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-mono"
            />
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>
      </div>

      {/* Grading Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="py-3.5 px-4">دانش‌آموز</th>
                <th className="py-3.5 px-4">حضور و غیاب</th>
                <th className="py-3.5 px-4">نمره روزانه (۰-۲۰)</th>
                <th className="py-3.5 px-4">فعالیت و پرسش (۰-۲۰)</th>
                <th className="py-3.5 px-4">تکلیف (۰-۲۰)</th>
                <th className="py-3.5 px-4">یادداشت استاد برای اولیا/دانش‌آموز</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enrolledStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    دانش‌آموزی در این کلاس ثبت‌نام نشده است
                  </td>
                </tr>
              ) : (
                enrolledStudents.map((stu) => {
                  const record = grades[stu.id] || {};
                  return (
                    <tr key={stu.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={
                              stu.avatar ||
                              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
                            }
                            alt=""
                            className="w-8 h-8 rounded-lg object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <div className="font-bold text-slate-800">
                              {stu.firstName} {stu.lastName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{stu.studentId}</div>
                          </div>
                        </div>
                      </td>

                      {/* Attendance Select */}
                      <td className="py-3 px-4">
                        <select
                          value={record.attendanceStatus || 'PRESENT'}
                          onChange={(e) =>
                            handleUpdateStudentGrade(stu.id, 'attendanceStatus', e.target.value)
                          }
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border focus:ring-1 focus:ring-indigo-500 ${
                            record.attendanceStatus === 'PRESENT'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : record.attendanceStatus === 'LATE'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}
                        >
                          <option value="PRESENT">حاضر</option>
                          <option value="LATE">تاخیر ورود</option>
                          <option value="ABSENT">غایب غیرموجه</option>
                          <option value="EXCUSED">غیبت موجه</option>
                        </select>
                      </td>

                      {/* Daily Grade */}
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min={0}
                          max={20}
                          step={0.5}
                          value={record.dailyGrade ?? 18}
                          onChange={(e) =>
                            handleUpdateStudentGrade(stu.id, 'dailyGrade', Number(e.target.value))
                          }
                          className="w-20 px-2.5 py-1 text-xs rounded-lg border border-slate-300 font-mono font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500"
                        />
                      </td>

                      {/* Participation Grade */}
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min={0}
                          max={20}
                          step={0.5}
                          value={record.participationGrade ?? 18}
                          onChange={(e) =>
                            handleUpdateStudentGrade(
                              stu.id,
                              'participationGrade',
                              Number(e.target.value)
                            )
                          }
                          className="w-20 px-2.5 py-1 text-xs rounded-lg border border-slate-300 font-mono text-slate-700 focus:ring-2 focus:ring-indigo-500"
                        />
                      </td>

                      {/* Assignment Grade */}
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min={0}
                          max={20}
                          step={0.5}
                          value={record.assignmentGrade ?? 18}
                          onChange={(e) =>
                            handleUpdateStudentGrade(
                              stu.id,
                              'assignmentGrade',
                              Number(e.target.value)
                            )
                          }
                          className="w-20 px-2.5 py-1 text-xs rounded-lg border border-slate-300 font-mono text-slate-700 focus:ring-2 focus:ring-indigo-500"
                        />
                      </td>

                      {/* Teacher notes */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={record.teacherNotes || ''}
                          onChange={(e) =>
                            handleUpdateStudentGrade(stu.id, 'teacherNotes', e.target.value)
                          }
                          placeholder="یادداشت معلم..."
                          className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                        />
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
