import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import {
  UserPlus,
  Search,
  BookOpen,
  Mail,
  Phone,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  MoreVertical,
  ShieldCheck,
} from 'lucide-react';

export const TeachersManager: React.FC = () => {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  // Create/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<User | null>(null);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [subject, setSubject] = useState('');
  const [avatar, setAvatar] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirm modal
  const [deletingTeacher, setDeletingTeacher] = useState<User | null>(null);

  useEffect(() => {
    loadTeachers();
  }, [search, statusFilter]);

  const loadTeachers = async () => {
    setIsLoading(true);
    try {
      const data = await api.getUsers({
        role: 'TEACHER',
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setTeachers(data);
    } catch (err: any) {
      toast.error('خطا در دریافت لیست اساتید');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingTeacher(null);
    setFirstName('');
    setLastName('');
    setUsername('');
    setEmail('');
    setMobile('');
    setPassword('password123');
    setSubject('ریاضیات');
    setAvatar('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150');
    setStatus('ACTIVE');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (teacher: User) => {
    setEditingTeacher(teacher);
    setFirstName(teacher.firstName);
    setLastName(teacher.lastName);
    setUsername(teacher.username);
    setEmail(teacher.email);
    setMobile(teacher.mobile || '');
    setPassword('');
    setSubject(teacher.subject || '');
    setAvatar(teacher.avatar || '');
    setStatus(teacher.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingTeacher) {
        await api.updateUser(editingTeacher.id, {
          firstName,
          lastName,
          mobile,
          subject,
          avatar,
          status,
        });
        toast.success('اطلاعات استاد با موفقیت ویرایش شد');
      } else {
        await api.createUser({
          role: 'TEACHER',
          firstName,
          lastName,
          username,
          email,
          mobile,
          password: password || 'password123',
          subject,
          avatar,
          status,
        });
        toast.success('استاد جدید با موفقیت در سامانه ثبت شد');
      }
      setIsModalOpen(false);
      loadTeachers();
    } catch (err: any) {
      toast.error(err.message || 'خطا در ثبت اطلاعات');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (teacher: User) => {
    const newStatus = teacher.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.updateUser(teacher.id, { status: newStatus });
      toast.success(`وضعیت استاد به ${newStatus === 'ACTIVE' ? 'فعال' : 'غیرفعال'} تغییر یافت`);
      loadTeachers();
    } catch (err) {
      toast.error('خطا در تغییر وضعیت');
    }
  };

  const handleDelete = async () => {
    if (!deletingTeacher) return;
    try {
      await api.deleteUser(deletingTeacher.id);
      toast.success('استاد با موفقیت حذف گردید');
      setDeletingTeacher(null);
      loadTeachers();
    } catch (err: any) {
      toast.error(err.message || 'خطا در حذف استاد');
    }
  };

  const filteredTeachers = subjectFilter
    ? teachers.filter((t) => t.subject?.includes(subjectFilter))
    : teachers;

  return (
    <div className="space-y-6">
      {/* Header and Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200">
        <div>
          <h2 className="text-lg font-black text-slate-800">مدیریت اساتید و معلمان</h2>
          <p className="text-xs text-slate-500 mt-1">
            ثبت، تخصیص دروس، مدیریت دسترسی‌ها و بررسی وضعیت فعالیت مدرسان
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          افزودن استاد جدید
        </button>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        <div className="relative">
          <input
            type="text"
            placeholder="جستجوی نام، نام کاربری یا درس..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3.5 pr-9 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
        </div>

        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">همه دروس و رشته‌ها</option>
          <option value="ریاضی">ریاضیات و حسابان</option>
          <option value="فیزیک">فیزیک و آزمایشگاه</option>
          <option value="هندسه">هندسه تحلیلی</option>
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

      {/* Teachers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-3.5 px-4">استاد</th>
                <th className="py-3.5 px-4">درس / تخصص</th>
                <th className="py-3.5 px-4">اطلاعات تماس</th>
                <th className="py-3.5 px-4">وضعیت</th>
                <th className="py-3.5 px-4 text-left">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    هیچ استادی مطابق فیلترهای انتخابی یافت نشد
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={teacher.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                          alt={teacher.firstName}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="font-bold text-slate-800">
                            {teacher.firstName} {teacher.lastName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">@{teacher.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-medium text-[11px] border border-emerald-200">
                        <BookOpen className="w-3.5 h-3.5" />
                        {teacher.subject || 'عمومی'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{teacher.email}</span>
                      </div>
                      {teacher.mobile && (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono">{teacher.mobile}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(teacher)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                          teacher.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                        }`}
                      >
                        {teacher.status === 'ACTIVE' ? (
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
                          onClick={() => handleOpenEdit(teacher)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="ویرایش اطلاعات"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingTeacher(teacher)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="حذف استاد"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTeacher ? 'ویرایش اطلاعات استاد' : 'ثبت نام استاد جدید'}
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
                placeholder="مثال: سید محمد"
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
                placeholder="مثال: علوی"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نام کاربری *</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={!!editingTeacher}
                placeholder="dr.alavi"
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
                disabled={!!editingTeacher}
                placeholder="alavi@maktab.ir"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">شماره تلفن همراه</label>
              <input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="09121112233"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">درس یا تخصص آموزشی *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                placeholder="مثال: ریاضیات و حسابان"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {!editingTeacher && (
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">لینک تصویر پرسنلی</label>
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
              {isSubmitting ? 'در حال ثبت...' : editingTeacher ? 'ذخیره تغییرات' : 'ثبت استاد'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingTeacher}
        onClose={() => setDeletingTeacher(null)}
        title="تایید حذف استاد"
        maxWidth="sm"
      >
        <div className="space-y-4 text-right">
          <p className="text-xs text-slate-600 leading-relaxed">
            آیا از حذف کامل استاد{' '}
            <span className="font-bold text-slate-900">
              {deletingTeacher?.firstName} {deletingTeacher?.lastName}
            </span>{' '}
            اطمینان دارید؟ این عملیات غیرقابل بازگشت است.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeletingTeacher(null)}
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
