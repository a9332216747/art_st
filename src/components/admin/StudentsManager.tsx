import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import {
  UserPlus,
  Search,
  GraduationCap,
  Mail,
  Phone,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  IdCard,
  UserCheck,
} from 'lucide-react';

export const StudentsManager: React.FC = () => {
  const [students, setStudents] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const toast = useToast();

  // Create/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<User | null>(null);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [gradeLevel, setGradeLevel] = useState('پایه دوازدهم ریاضی و فیزیک');
  const [assignedTeacherId, setAssignedTeacherId] = useState('');
  const [avatar, setAvatar] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal
  const [deletingStudent, setDeletingStudent] = useState<User | null>(null);

  useEffect(() => {
    loadData();
  }, [search, statusFilter]);

  const loadData = async () => {
    try {
      const [stuData, teachData] = await Promise.all([
        api.getUsers({
          role: 'STUDENT',
          search: search || undefined,
          status: statusFilter || undefined,
        }),
        api.getUsers({ role: 'TEACHER' }),
      ]);
      setStudents(stuData);
      setTeachers(teachData);
    } catch (err) {
      toast.error('خطا در دریافت لیست دانش‌آموزان');
    }
  };

  const handleOpenCreate = () => {
    setEditingStudent(null);
    setFirstName('');
    setLastName('');
    setStudentId(`STU-${Math.floor(10000 + Math.random() * 90000)}`);
    setUsername('');
    setEmail('');
    setMobile('');
    setPassword('password123');
    setGradeLevel('پایه دوازدهم ریاضی و فیزیک');
    setAssignedTeacherId(teachers[0]?.id || '');
    setAvatar('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150');
    setStatus('ACTIVE');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (stu: User) => {
    setEditingStudent(stu);
    setFirstName(stu.firstName);
    setLastName(stu.lastName);
    setStudentId(stu.studentId || '');
    setUsername(stu.username);
    setEmail(stu.email);
    setMobile(stu.mobile || '');
    setPassword('');
    setGradeLevel(stu.gradeLevel || 'پایه دوازدهم');
    setAssignedTeacherId(stu.assignedTeacherId || '');
    setAvatar(stu.avatar || '');
    setStatus(stu.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingStudent) {
        await api.updateUser(editingStudent.id, {
          firstName,
          lastName,
          mobile,
          gradeLevel,
          assignedTeacherId,
          avatar,
          status,
        });
        toast.success('اطلاعات دانش‌آموز ویرایش شد');
      } else {
        await api.createUser({
          role: 'STUDENT',
          firstName,
          lastName,
          studentId,
          username,
          email,
          mobile,
          password: password || 'password123',
          gradeLevel,
          assignedTeacherId,
          avatar,
          status,
        });
        toast.success('دانش‌آموز جدید با موفقیت ثبت شد');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'خطا در ذخیره اطلاعات');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (stu: User) => {
    const newStatus = stu.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.updateUser(stu.id, { status: newStatus });
      toast.success(`وضعیت به ${newStatus === 'ACTIVE' ? 'فعال' : 'غیرفعال'} تغییر یافت`);
      loadData();
    } catch (err) {
      toast.error('خطا در تغییر وضعیت');
    }
  };

  const handleDelete = async () => {
    if (!deletingStudent) return;
    try {
      await api.deleteUser(deletingStudent.id);
      toast.success('دانش‌آموز با موفقیت حذف گردید');
      setDeletingStudent(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'خطا در حذف');
    }
  };

  const filteredStudents = gradeFilter
    ? students.filter((s) => s.gradeLevel?.includes(gradeFilter))
    : students;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200">
        <div>
          <h2 className="text-lg font-black text-slate-800">مدیریت پرونده دانش‌آموزان</h2>
          <p className="text-xs text-slate-500 mt-1">
            ثبت‌نام دانش‌آموز، تخصیص استاد راهنما، رصد وضعیت تحصیلی و کد دانش‌آموزی
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          ثبت‌نام دانش‌آموز جدید
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        <div className="relative">
          <input
            type="text"
            placeholder="جستجو بر اساس نام، کد دانش‌آموزی یا نام کاربری..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3.5 pr-9 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
        </div>

        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">همه پایه‌های تحصیلی</option>
          <option value="دوازدهم ریاضی">پایه دوازدهم ریاضی</option>
          <option value="دوازدهم تجربی">پایه دوازدهم تجربی</option>
          <option value="یازدهم">پایه یازدهم</option>
          <option value="دهم">پایه دهم</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="ACTIVE">فقط فعال</option>
          <option value="INACTIVE">فقط غیرفعال</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-3.5 px-4">دانش‌آموز</th>
                <th className="py-3.5 px-4">کد دانش‌آموزی</th>
                <th className="py-3.5 px-4">پایه و رشته</th>
                <th className="py-3.5 px-4">استاد راهنما</th>
                <th className="py-3.5 px-4">وضعیت</th>
                <th className="py-3.5 px-4 text-left">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    دانش‌آموزی با این مشخصات یافت نشد
                  </td>
                </tr>
              ) : (
                filteredStudents.map((stu) => {
                  const assignedTeacher = teachers.find((t) => t.id === stu.assignedTeacherId);
                  return (
                    <tr key={stu.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={stu.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                            alt={stu.firstName}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <div className="font-bold text-slate-800">
                              {stu.firstName} {stu.lastName}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">@{stu.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 text-[11px]">
                          <IdCard className="w-3 h-3 text-slate-500" />
                          {stu.studentId || '-'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-700">{stu.gradeLevel || 'پایه تحصیلی'}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-slate-600 text-xs">
                          <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                          {assignedTeacher
                            ? `${assignedTeacher.firstName} ${assignedTeacher.lastName}`
                            : 'تخصیص نیافته'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleStatus(stu)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                            stu.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                          }`}
                        >
                          {stu.status === 'ACTIVE' ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              فعال
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              غیرفعال
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(stu)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="ویرایش"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingStudent(stu)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStudent ? 'ویرایش پرونده دانش‌آموز' : 'ثبت نام دانش‌آموز جدید'}
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نام *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                placeholder="مثال: سارا"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نام خانوادگی *</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                placeholder="مثال: رضایی"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">کد دانش‌آموزی *</label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نام کاربری *</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={!!editingStudent}
                placeholder="sara.rezaei"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ایمیل *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!!editingStudent}
                placeholder="sara@student.ir"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">پایه یا مقطع تحصیلی *</label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="پایه دوازدهم ریاضی و فیزیک">پایه دوازدهم ریاضی و فیزیک</option>
                <option value="پایه دوازدهم علوم تجربی">پایه دوازدهم علوم تجربی</option>
                <option value="پایه یازدهم ریاضی و فیزیک">پایه یازدهم ریاضی و فیزیک</option>
                <option value="پایه یازدهم علوم تجربی">پایه یازدهم علوم تجربی</option>
                <option value="پایه دهم ریاضی و فیزیک">پایه دهم ریاضی و فیزیک</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">استاد راهنما تخصیص‌یافته</label>
              <select
                value={assignedTeacherId}
                onChange={(e) => setAssignedTeacherId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">بدون استاد راهنما</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName} ({t.subject})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">شماره تلفن همراه</label>
              <input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="0935..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
            {!editingStudent && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رمز عبور اولیه</label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password123"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">آدرس عکس پروفایل</label>
              <input
                type="url"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">وضعیت حساب</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="ACTIVE">فعال</option>
                <option value="INACTIVE">غیرفعال</option>
              </select>
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
              {isSubmitting ? 'در حال ثبت...' : editingStudent ? 'ذخیره تغییرات' : 'ثبت نام دانش‌آموز'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingStudent}
        onClose={() => setDeletingStudent(null)}
        title="تایید حذف پرونده دانش‌آموز"
        maxWidth="sm"
      >
        <div className="space-y-4 text-right">
          <p className="text-xs text-slate-600 leading-relaxed">
            آیا از حذف کامل دانش‌آموز{' '}
            <span className="font-bold text-slate-900">
              {deletingStudent?.firstName} {deletingStudent?.lastName}
            </span>{' '}
            اطمینان دارید؟ تمامی ارسال‌های تکلیف و سوابق نمرات مرتبط حذف خواهد شد.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeletingStudent(null)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
            >
              حذف قطعی
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
