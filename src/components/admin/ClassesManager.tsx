import React, { useState, useEffect } from 'react';
import { ClassSession, User } from '../../types';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import {
  CalendarDays,
  Plus,
  BookOpen,
  UserCheck,
  Clock,
  Users,
  Edit2,
  Trash2,
  Video,
} from 'lucide-react';

export const ClassesManager: React.FC = () => {
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const toast = useToast();

  // Create / Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassSession | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [scheduleDay, setScheduleDay] = useState('شنبه و دوشنبه');
  const [startTime, setStartTime] = useState('۱۰:۰۰');
  const [endTime, setEndTime] = useState('۱۱:۳۰');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal
  const [deletingClass, setDeletingClass] = useState<ClassSession | null>(null);

  // Roster view modal
  const [viewingRoster, setViewingRoster] = useState<ClassSession | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [clsList, teachList, stuList] = await Promise.all([
        api.getClasses(),
        api.getUsers({ role: 'TEACHER' }),
        api.getUsers({ role: 'STUDENT' }),
      ]);
      setClasses(clsList);
      setTeachers(teachList);
      setStudents(stuList);
    } catch (err) {
      toast.error('خطا در بارگذاری کلاس‌ها');
    }
  };

  const handleOpenCreate = () => {
    setEditingClass(null);
    setTitle('');
    setSubject('ریاضیات تخصصی');
    setTeacherId(teachers[0]?.id || '');
    setSelectedStudentIds(students.map((s) => s.id));
    setScheduleDay('شنبه و دوشنبه');
    setStartTime('۱۰:۰۰');
    setEndTime('۱۱:۳۰');
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cls: ClassSession) => {
    setEditingClass(cls);
    setTitle(cls.title);
    setSubject(cls.subject);
    setTeacherId(cls.teacherId);
    setSelectedStudentIds(cls.studentIds || []);
    setScheduleDay(cls.scheduleDay);
    setStartTime(cls.startTime);
    setEndTime(cls.endTime);
    setDescription(cls.description || '');
    setIsModalOpen(true);
  };

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleSelectAllStudents = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map((s) => s.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subject || !teacherId) {
      toast.error('تکمیل عنوان، درس و استاد الزامی است');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingClass) {
        await api.updateClass(editingClass.id, {
          title,
          subject,
          teacherId,
          studentIds: selectedStudentIds,
          scheduleDay,
          startTime,
          endTime,
          description,
        });
        toast.success('کلاس با موفقیت ویرایش شد');
      } else {
        await api.createClass({
          title,
          subject,
          teacherId,
          studentIds: selectedStudentIds,
          scheduleDay,
          startTime,
          endTime,
          description,
        });
        toast.success('کلاس جدید با موفقیت ایجاد شد');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'خطا در ثبت کلاس');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingClass) return;
    try {
      await api.deleteClass(deletingClass.id);
      toast.success('کلاس با موفقیت حذف گردید');
      setDeletingClass(null);
      loadData();
    } catch (err) {
      toast.error('خطا در حذف کلاس');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200">
        <div>
          <h2 className="text-lg font-black text-slate-800">مدیریت کلاس‌ها و دوره‌های آنلاین</h2>
          <p className="text-xs text-slate-500 mt-1">
            تعریف کلاس، تخصیص استاد، ثبت‌نام دانش‌آموزان و زمان‌بندی جلسات وب‌کنفرانس
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          ایجاد کلاس جدید
        </button>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {classes.map((cls) => {
          const teacher = teachers.find((t) => t.id === cls.teacherId);
          return (
            <div
              key={cls.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-[11px] border border-indigo-100">
                    {cls.subject}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(cls)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="ویرایش"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingClass(cls)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-extrabold text-slate-900 text-sm leading-snug">{cls.title}</h3>

                {cls.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{cls.description}</p>
                )}

                <div className="pt-2 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium">استاد:</span>
                    <span className="font-bold text-slate-800">
                      {teacher ? `${teacher.firstName} ${teacher.lastName}` : cls.teacherName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>زمان‌بندی:</span>
                    <span className="font-medium">
                      {cls.scheduleDay} ({cls.startTime} الی {cls.endTime})
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setViewingRoster(cls)}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600"
                >
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>{cls.studentIds?.length || 0} دانش‌آموز ثبت‌نامی</span>
                </button>

                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                  <Video className="w-3 h-3 text-indigo-500" />
                  اتاق کنفرانس آماده
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClass ? 'ویرایش اطلاعات کلاس' : 'تعریف کلاس آنلاین جدید'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">عنوان کلاس *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="مثال: حسابان ۲ و دیفرانسیل پیشرفته"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نام درس / رشته *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                placeholder="مثال: ریاضیات تخصصی"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">استاد مدرس کلاس *</label>
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">انتخاب استاد...</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName} ({t.subject})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">روزهای برگزاری *</label>
              <input
                type="text"
                value={scheduleDay}
                onChange={(e) => setScheduleDay(e.target.value)}
                required
                placeholder="مثال: شنبه و دوشنبه"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ساعت شروع *</label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                placeholder="۱۰:۰۰"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ساعت پایان *</label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                placeholder="۱۱:۳۰"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات و سرفصل‌ها</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="توضیحات مختصر در مورد مباحث این دوره..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Assign Students section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700">
                دانش‌آموزان ثبت‌نامی ({selectedStudentIds.length} نفر انتخاب شده)
              </label>
              <button
                type="button"
                onClick={handleSelectAllStudents}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {selectedStudentIds.length === students.length ? 'لغو انتخاب همه' : 'انتخاب همه'}
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2.5 divide-y divide-slate-100 bg-slate-50/50">
              {students.map((stu) => {
                const isSelected = selectedStudentIds.includes(stu.id);
                return (
                  <label
                    key={stu.id}
                    className="flex items-center justify-between py-2 px-2 hover:bg-slate-100/80 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleStudent(stu.id)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        {stu.firstName} {stu.lastName}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">({stu.studentId})</span>
                    </div>
                    <span className="text-[11px] text-slate-400">{stu.gradeLevel}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
            >
              {isSubmitting ? 'در حال ذخیره...' : editingClass ? 'ذخیره تغییرات' : 'ایجاد کلاس'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Roster Modal */}
      <Modal
        isOpen={!!viewingRoster}
        onClose={() => setViewingRoster(null)}
        title={`لیست دانش‌آموزان کلاس: ${viewingRoster?.title || ''}`}
        maxWidth="md"
      >
        <div className="space-y-3 text-right">
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {viewingRoster?.studentIds?.map((sId) => {
              const stu = students.find((s) => s.id === sId);
              if (!stu) return null;
              return (
                <div key={sId} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={stu.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                      alt={stu.firstName}
                      className="w-8 h-8 rounded-lg object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        {stu.firstName} {stu.lastName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{stu.studentId}</div>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500">{stu.gradeLevel}</span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setViewingRoster(null)}
              className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
            >
              بستن
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={!!deletingClass}
        onClose={() => setDeletingClass(null)}
        title="تایید حذف کلاس"
        maxWidth="sm"
      >
        <div className="space-y-4 text-right">
          <p className="text-xs text-slate-600 leading-relaxed">
            آیا از حذف کلاس <span className="font-bold text-slate-900">{deletingClass?.title}</span> اطمینان
            دارید؟
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeletingClass(null)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
            >
              حذف کلاس
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
