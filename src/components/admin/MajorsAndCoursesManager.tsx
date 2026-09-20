import React, { useState, useEffect } from 'react';
import { Major, Course, User } from '../../types';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import {
  BookOpen,
  GraduationCap,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  Layers,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Hash,
  Award,
  RefreshCw,
} from 'lucide-react';
import { Modal } from '../common/Modal';

export const MajorsAndCoursesManager: React.FC = () => {
  const toast = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'majors' | 'courses'>('majors');
  
  // Data state
  const [majors, setMajors] = useState<Major[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filter & search
  const [majorSearch, setMajorSearch] = useState('');
  const [courseSearch, setCourseSearch] = useState('');
  const [selectedMajorFilter, setSelectedMajorFilter] = useState('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('');

  // Modals state
  const [isMajorModalOpen, setIsMajorModalOpen] = useState(false);
  const [editingMajor, setEditingMajor] = useState<Major | null>(null);
  const [majorForm, setMajorForm] = useState({
    code: '',
    name: '',
    category: 'THEORETICAL' as 'THEORETICAL' | 'TECHNICAL' | 'VOCATIONAL',
    gradeLevels: ['دهم', 'یازدهم', 'دوازدهم'],
    description: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState({
    code: '',
    title: '',
    majorId: 'ALL',
    gradeLevel: 'دوازدهم',
    units: 3,
    type: 'SPECIALIZED' as 'SPECIALIZED' | 'GENERAL' | 'WORKSHOP' | 'LABORATORY',
    passingGrade: 10,
    defaultTeacherId: '',
    description: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'major' | 'course';
    id: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [mList, cList, tList] = await Promise.all([
        api.getMajors(),
        api.getCourses(),
        api.getUsers({ role: 'TEACHER' }),
      ]);
      setMajors(mList);
      setCourses(cList);
      setTeachers(tList);
    } catch (e: any) {
      toast.error('خطا در بارگذاری اطلاعات رشته‌ها و دروس');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // -----------------------------
  // Major Handlers
  // -----------------------------
  const openCreateMajorModal = () => {
    setEditingMajor(null);
    setMajorForm({
      code: `MAJ-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      category: 'THEORETICAL',
      gradeLevels: ['دهم', 'یازدهم', 'دوازدهم'],
      description: '',
      status: 'ACTIVE',
    });
    setIsMajorModalOpen(true);
  };

  const openEditMajorModal = (major: Major) => {
    setEditingMajor(major);
    setMajorForm({
      code: major.code,
      name: major.name,
      category: major.category,
      gradeLevels: major.gradeLevels,
      description: major.description || '',
      status: major.status,
    });
    setIsMajorModalOpen(true);
  };

  const handleSaveMajor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!majorForm.name.trim()) {
      toast.error('نام رشته تحصیلی الزامی است');
      return;
    }

    try {
      if (editingMajor) {
        await api.updateMajor(editingMajor.id, majorForm);
        toast.success(`رشته «${majorForm.name}» با موفقیت ویرایش شد`);
      } else {
        await api.createMajor(majorForm);
        toast.success(`رشته تحصیلی جدید «${majorForm.name}» با موفقیت تعریف شد`);
      }
      setIsMajorModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'خطا در ذخیره رشته تحصیلی');
    }
  };

  // -----------------------------
  // Course Handlers
  // -----------------------------
  const openCreateCourseModal = () => {
    setEditingCourse(null);
    setCourseForm({
      code: `CRS-${Math.floor(100 + Math.random() * 900)}`,
      title: '',
      majorId: majors[0]?.id || 'ALL',
      gradeLevel: 'دوازدهم',
      units: 3,
      type: 'SPECIALIZED',
      passingGrade: 10,
      defaultTeacherId: teachers[0]?.id || '',
      description: '',
      status: 'ACTIVE',
    });
    setIsCourseModalOpen(true);
  };

  const openEditCourseModal = (course: Course) => {
    setEditingCourse(course);
    setCourseForm({
      code: course.code,
      title: course.title,
      majorId: course.majorId,
      gradeLevel: course.gradeLevel,
      units: course.units,
      type: course.type,
      passingGrade: course.passingGrade,
      defaultTeacherId: course.defaultTeacherId || '',
      description: course.description || '',
      status: course.status,
    });
    setIsCourseModalOpen(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseForm.title.trim()) {
      toast.error('عنوان درس الزامی است');
      return;
    }

    const matchedMajor = majors.find((m) => m.id === courseForm.majorId);
    const majorName = courseForm.majorId === 'ALL' ? 'عمومی تمامی رشته‌ها' : matchedMajor?.name || 'عمومی';

    try {
      if (editingCourse) {
        await api.updateCourse(editingCourse.id, {
          ...courseForm,
          majorName,
        });
        toast.success(`درس «${courseForm.title}» با موفقیت اصلاح گردید`);
      } else {
        await api.createCourse({
          ...courseForm,
          majorName,
        });
        toast.success(`درس جدید «${courseForm.title}» با موفقیت اضافه شد`);
      }
      setIsCourseModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'خطا در ثبت درس');
    }
  };

  // -----------------------------
  // Delete Handler
  // -----------------------------
  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === 'major') {
        await api.deleteMajor(deleteConfirm.id);
        toast.success(`رشته «${deleteConfirm.title}» حذف شد`);
      } else {
        await api.deleteCourse(deleteConfirm.id);
        toast.success(`درس «${deleteConfirm.title}» حذف شد`);
      }
      setDeleteConfirm(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'خطا در حذف آیتم');
    }
  };

  // Filters
  const filteredMajors = majors.filter(
    (m) =>
      m.name.toLowerCase().includes(majorSearch.toLowerCase()) ||
      m.code.toLowerCase().includes(majorSearch.toLowerCase()) ||
      (m.description || '').toLowerCase().includes(majorSearch.toLowerCase())
  );

  const filteredCourses = courses.filter((c) => {
    if (selectedMajorFilter && c.majorId !== selectedMajorFilter && c.majorId !== 'ALL') return false;
    if (selectedGradeFilter && c.gradeLevel !== selectedGradeFilter) return false;
    if (courseSearch) {
      const s = courseSearch.toLowerCase();
      return c.title.toLowerCase().includes(s) || c.code.toLowerCase().includes(s);
    }
    return true;
  });

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'THEORETICAL':
        return { label: 'شاخه نظری', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'TECHNICAL':
        return { label: 'فنی و حرفه‌ای', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'VOCATIONAL':
        return { label: 'کاردانش و هنر', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { label: 'عمومی', color: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const getCourseTypeLabel = (type: string) => {
    switch (type) {
      case 'SPECIALIZED':
        return { label: 'تخصصی', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'GENERAL':
        return { label: 'عمومی', color: 'bg-slate-100 text-slate-700 border-slate-200' };
      case 'WORKSHOP':
        return { label: 'کارگاهی / عملی', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'LABORATORY':
        return { label: 'آزمایشگاهی', color: 'bg-teal-50 text-teal-700 border-teal-200' };
      default:
        return { label: 'تخصصی', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-black text-slate-800">مدیریت جامع رشته‌های تحصیلی و دروس</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            تعریف رشته‌های جدید، ویرایش سرفصل‌ها، اصلاح مشخصات دروس و تخصیص واحدها با دسترسی کامل مدیر
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            title="به‌روزرسانی داده‌ها"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {activeSubTab === 'majors' ? (
            <button
              onClick={openCreateMajorModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن رشته جدید</span>
            </button>
          ) : (
            <button
              onClick={openCreateCourseModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن درس جدید</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('majors')}
          className={`flex items-center gap-2 py-3 px-5 text-xs font-bold border-b-2 transition-colors ${
            activeSubTab === 'majors'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>رشته‌های تحصیلی ({majors.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('courses')}
          className={`flex items-center gap-2 py-3 px-5 text-xs font-bold border-b-2 transition-colors ${
            activeSubTab === 'courses'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>دروس و عناوین آموزشی ({courses.length})</span>
        </button>
      </div>

      {/* SUB-TAB 1: MAJORS LIST */}
      {activeSubTab === 'majors' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative">
              <input
                type="text"
                placeholder="جستجو در نام رشته، کد و توضیحات..."
                value={majorSearch}
                onChange={(e) => setMajorSearch(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
          </div>

          {/* Majors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMajors.map((major) => {
              const catInfo = getCategoryLabel(major.category);
              const courseCount = courses.filter(
                (c) => c.majorId === major.id || c.majorId === 'ALL'
              ).length;

              return (
                <div
                  key={major.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-mono font-bold">
                          {major.code}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${catInfo.color}`}>
                          {catInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditMajorModal(major)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="ویرایش رشته"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteConfirm({
                              type: 'major',
                              id: major.id,
                              title: major.name,
                            })
                          }
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="حذف رشته"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-800">{major.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {major.description || 'بدون توضیحات تکمیلی'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {major.gradeLevels.map((lvl) => (
                        <span
                          key={lvl}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium"
                        >
                          {lvl}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">دروس اختصاص یافته:</span>
                    <button
                      onClick={() => {
                        setSelectedMajorFilter(major.id);
                        setActiveSubTab('courses');
                      }}
                      className="text-blue-600 hover:text-blue-800 font-bold font-mono hover:underline"
                    >
                      {courseCount} عنوان درس ←
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredMajors.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                رشته‌ای با این مشخصات یافت نشد
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: COURSES LIST */}
      {activeSubTab === 'courses' && (
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                placeholder="جستجو در عنوان یا کد درس..."
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                className="w-full pl-4 pr-10 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5" />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedMajorFilter}
                onChange={(e) => setSelectedMajorFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
              >
                <option value="">همه رشته‌ها</option>
                {majors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedGradeFilter}
                onChange={(e) => setSelectedGradeFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
              >
                <option value="">همه پایه‌ها</option>
                <option value="دهم">پایه دهم</option>
                <option value="یازدهم">پایه یازدهم</option>
                <option value="دوازدهم">پایه دوازدهم</option>
              </select>
            </div>
          </div>

          {/* Courses Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="py-3 px-4">کد درس</th>
                    <th className="py-3 px-4">عنوان درس</th>
                    <th className="py-3 px-4">رشته تحصیلی</th>
                    <th className="py-3 px-4">پایه</th>
                    <th className="py-3 px-4">نوع درس</th>
                    <th className="py-3 px-4">تعداد واحد</th>
                    <th className="py-3 px-4">حداقل نمره قبولی</th>
                    <th className="py-3 px-4 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCourses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        هیچ درسی برای این فیلتر یافت نشد
                      </td>
                    </tr>
                  ) : (
                    filteredCourses.map((course) => {
                      const typeInfo = getCourseTypeLabel(course.type);
                      return (
                        <tr key={course.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-600">
                            {course.code}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800 text-sm">{course.title}</div>
                            {course.description && (
                              <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                {course.description}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-medium">
                            {course.majorName || 'عمومی'}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-600">{course.gradeLevel}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${typeInfo.color}`}>
                              {typeInfo.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-700">
                            {course.units} واحد
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-600">
                            {course.passingGrade} از ۲۰
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openEditCourseModal(course)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="اصلاح درس"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteConfirm({
                                    type: 'course',
                                    id: course.id,
                                    title: course.title,
                                  })
                                }
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="حذف درس"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* MAJOR MODAL (CREATE / EDIT) */}
      <Modal
        isOpen={isMajorModalOpen}
        onClose={() => setIsMajorModalOpen(false)}
        title={editingMajor ? 'ویرایش رشته تحصیلی' : 'تعریف رشته تحصیلی جدید'}
      >
        <form onSubmit={handleSaveMajor} className="space-y-4 text-right">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">کد شناسایی رشته:</label>
            <input
              type="text"
              required
              value={majorForm.code}
              onChange={(e) => setMajorForm({ ...majorForm, code: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">نام رشته تحصیلی:</label>
            <input
              type="text"
              required
              placeholder="مانند: ریاضی و فیزیک، علوم تجربی، شبکه و نرم‌افزار"
              value={majorForm.name}
              onChange={(e) => setMajorForm({ ...majorForm, name: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">شاخه تحصیلی:</label>
            <select
              value={majorForm.category}
              onChange={(e) =>
                setMajorForm({ ...majorForm, category: e.target.value as any })
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
            >
              <option value="THEORETICAL">شاخه نظری</option>
              <option value="TECHNICAL">فنی و حرفه‌ای</option>
              <option value="VOCATIONAL">کاردانش و هنر</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">پایه‌های تحصیلی ارائه شده:</label>
            <div className="flex gap-4 p-2 bg-slate-50 rounded-xl border border-slate-200">
              {['دهم', 'یازدهم', 'دوازدهم'].map((grade) => {
                const checked = majorForm.gradeLevels.includes(grade);
                return (
                  <label key={grade} className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setMajorForm({
                            ...majorForm,
                            gradeLevels: [...majorForm.gradeLevels, grade],
                          });
                        } else {
                          setMajorForm({
                            ...majorForm,
                            gradeLevels: majorForm.gradeLevels.filter((g) => g !== grade),
                          });
                        }
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>پایه {grade}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات و اهداف آموزشی رشته:</label>
            <textarea
              rows={3}
              placeholder="توضیح کوتاه در مورد پیش‌نیازها و اهداف آموزشی..."
              value={majorForm.description}
              onChange={(e) => setMajorForm({ ...majorForm, description: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsMajorModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
            >
              {editingMajor ? 'ذخیره اصلاحات رشته' : 'ثبت رشته جدید'}
            </button>
          </div>
        </form>
      </Modal>

      {/* COURSE MODAL (CREATE / EDIT) */}
      <Modal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        title={editingCourse ? 'اصلاح مشخصات درس' : 'تعریف درس جدید'}
      >
        <form onSubmit={handleSaveCourse} className="space-y-4 text-right">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">کد درس:</label>
              <input
                type="text"
                required
                value={courseForm.code}
                onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تعداد واحد:</label>
              <input
                type="number"
                min={1}
                max={12}
                value={courseForm.units}
                onChange={(e) => setCourseForm({ ...courseForm, units: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">عنوان درس:</label>
            <input
              type="text"
              required
              placeholder="مانند: حسابان ۲، فیزیک ۳، زیست‌شناسی تخصصی"
              value={courseForm.title}
              onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رشته تحصیلی مرتبط:</label>
              <select
                value={courseForm.majorId}
                onChange={(e) => setCourseForm({ ...courseForm, majorId: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
              >
                <option value="ALL">عمومی تمامی رشته‌ها</option>
                {majors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">پایه تحصیلی:</label>
              <select
                value={courseForm.gradeLevel}
                onChange={(e) => setCourseForm({ ...courseForm, gradeLevel: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
              >
                <option value="دهم">پایه دهم</option>
                <option value="یازدهم">پایه یازدهم</option>
                <option value="دوازدهم">پایه دوازدهم</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نوع درس:</label>
              <select
                value={courseForm.type}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, type: e.target.value as any })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
              >
                <option value="SPECIALIZED">تخصصی</option>
                <option value="GENERAL">عمومی</option>
                <option value="WORKSHOP">کارگاهی / عملی</option>
                <option value="LABORATORY">آزمایشگاهی</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">حداقل نمره قبولی (از ۲۰):</label>
              <input
                type="number"
                min={7}
                max={20}
                value={courseForm.passingGrade}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, passingGrade: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">مدرس پیش‌فرض:</label>
            <select
              value={courseForm.defaultTeacherId}
              onChange={(e) => setCourseForm({ ...courseForm, defaultTeacherId: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
            >
              <option value="">بدون تعیین مدرس اولیه</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName} ({t.subject || 'عمومی'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">سرفصل‌ها و توضیحات درس:</label>
            <textarea
              rows={3}
              placeholder="فصول و مباحث کلیدی کتاب درسی..."
              value={courseForm.description}
              onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCourseModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
            >
              {editingCourse ? 'ذخیره تغییرات درس' : 'ثبت درس در سامانه'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRM MODAL */}
      {deleteConfirm && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteConfirm(null)}
          title={`حذف ${deleteConfirm.type === 'major' ? 'رشته تحصیلی' : 'درس'}`}
        >
          <div className="space-y-4 text-right">
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                آیا از حذف {deleteConfirm.type === 'major' ? 'رشته' : 'درس'} «
                {deleteConfirm.title}» اطمینان دارید؟ این عملیات در لاگ سیستم ثبت خواهد شد.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                انصراف
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs"
              >
                بله، حذف شود
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
