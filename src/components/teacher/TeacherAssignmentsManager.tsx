import React, { useState, useEffect } from 'react';
import { Assignment, AssignmentSubmission, ClassSession, User } from '../../types';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import {
  CheckSquare,
  Plus,
  Clock,
  Download,
  Calendar,
  Award,
  CheckCircle2,
  FileText,
  MessageSquare,
  User as UserIcon,
} from 'lucide-react';

export const TeacherAssignmentsManager: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);

  // Create Assignment Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [classId, setClassId] = useState('');
  const [deadline, setDeadline] = useState('۱۴۰۴/۰۷/۲۵');
  const [maxScore, setMaxScore] = useState(20);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Review Modal
  const [reviewingSubmission, setReviewingSubmission] = useState<AssignmentSubmission | null>(null);
  const [reviewGrade, setReviewGrade] = useState<number>(20);
  const [reviewFeedback, setReviewFeedback] = useState<string>('');
  const [isSavingReview, setIsSavingReview] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [aList, cList, sList, subList] = await Promise.all([
        api.getAssignments(),
        api.getClasses(),
        api.getUsers({ role: 'STUDENT' }),
        api.getSubmissions(),
      ]);
      setAssignments(aList);
      setClasses(cList);
      setStudents(sList);
      setSubmissions(subList);
      if (aList.length > 0 && !selectedAssignmentId) {
        setSelectedAssignmentId(aList[0].id);
      }
      if (cList.length > 0 && !classId) {
        setClassId(cList[0].id);
      }
    } catch (e) {
      toast.error('خطا در دریافت اطلاعات تکالیف');
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !classId || !deadline) {
      toast.error('تکمیل تمامی فیلدهای الزامی ضروری است');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('classId', classId);
      formData.append('deadline', deadline);
      formData.append('maxScore', maxScore.toString());
      if (user) formData.append('teacherId', user.id);
      if (attachmentFile) {
        formData.append('file', attachmentFile);
      }

      await api.createAssignment(formData);
      toast.success('تکلیف جدید با موفقیت ایجاد شد');
      setIsCreateOpen(false);
      setTitle('');
      setDescription('');
      setAttachmentFile(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'خطا در ایجاد تکلیف');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenReview = (sub: AssignmentSubmission) => {
    setReviewingSubmission(sub);
    setReviewGrade(sub.grade || 20);
    setReviewFeedback(sub.feedback || 'پاسخ شما با دقت بررسی شد.');
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingSubmission) return;

    setIsSavingReview(true);
    try {
      await api.reviewSubmission(reviewingSubmission.id, Number(reviewGrade), reviewFeedback);
      toast.success('نمره و بازخورد تکلیف با موفقیت ثبت شد');
      setReviewingSubmission(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'خطا در ثبت نمره');
    } finally {
      setIsSavingReview(false);
    }
  };

  const currentAssignment = assignments.find((a) => a.id === selectedAssignmentId);
  const currentSubmissions = submissions.filter((s) => s.assignmentId === selectedAssignmentId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200">
        <div>
          <h2 className="text-lg font-black text-slate-800">مدیریت و تصحیح تکالیف کلاسی</h2>
          <p className="text-xs text-slate-500 mt-1">
            تعریف تکالیف جدید، تعیین مهلت ارسال، دریافت فایل‌های دانش‌آموزان و ثبت نمره و بازخورد
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          تعریف تکلیف جدید
        </button>
      </div>

      {/* Main Grid: Assignment List on Left, Submissions on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assignments List */}
        <div className="space-y-3">
          <div className="text-xs font-black text-slate-700 uppercase tracking-wider px-1">
            لیست تکالیف فعال ({assignments.length})
          </div>
          {assignments.map((asg) => {
            const cls = classes.find((c) => c.id === asg.classId);
            const asgSubs = submissions.filter((s) => s.assignmentId === asg.id);
            const isSelected = asg.id === selectedAssignmentId;

            return (
              <div
                key={asg.id}
                onClick={() => setSelectedAssignmentId(asg.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50/70 border-indigo-300 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-indigo-700 border border-slate-200">
                    {cls?.title || 'کلاس'}
                  </span>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-slate-400" />
                    مهلت: {asg.deadline}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-slate-900 mt-2 leading-snug">{asg.title}</h4>

                <div className="pt-3 mt-2 border-t border-slate-200/50 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">
                    {asgSubs.length} ارسال شده (
                    {asgSubs.filter((s) => s.status === 'REVIEWED').length} بررسی شده)
                  </span>
                  <span className="font-bold text-indigo-700">بارم: {asg.maxScore} نمره</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Assignment Submissions View */}
        <div className="lg:col-span-2 space-y-4">
          {currentAssignment ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {currentAssignment.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {currentAssignment.description}
                    </p>
                  </div>
                  {currentAssignment.attachmentUrl && (
                    <a
                      href={currentAssignment.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-indigo-600 text-xs font-bold transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      فایل پیوست تمرین
                    </a>
                  )}
                </div>
              </div>

              {/* Submissions Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-700">
                    پاسخ‌های ارسال شده توسط دانش‌آموزان ({currentSubmissions.length})
                  </h4>
                </div>

                {currentSubmissions.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    هنوز پاسخی برای این تکلیف ارسال نشده است
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                    {currentSubmissions.map((sub) => {
                      const stu = students.find((s) => s.id === sub.studentId);
                      return (
                        <div
                          key={sub.id}
                          className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                stu?.avatar ||
                                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
                              }
                              alt=""
                              className="w-9 h-9 rounded-xl object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <div className="text-xs font-bold text-slate-800">
                                {stu ? `${stu.firstName} ${stu.lastName}` : sub.studentId}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                تاریخ ارسال: {sub.submittedAt}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-auto">
                            {/* Download submitted file */}
                            <a
                              href={sub.fileUrl}
                              download
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
                              title="دانلود فایل ارسالی"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[100px]">{sub.fileName}</span>
                            </a>

                            {/* Status badge */}
                            {sub.status === 'REVIEWED' ? (
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                نمره: {sub.grade} / ۲۰
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-200">
                                در انتظار تصحیح
                              </span>
                            )}

                            {/* Grade button */}
                            <button
                              onClick={() => handleOpenReview(sub)}
                              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
                            >
                              {sub.status === 'REVIEWED' ? 'ویرایش نمره' : 'ثبت نمره و نظر'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              یک تکلیف را از ستون کناری انتخاب نمایید
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="تعریف و انتشار تکلیف جدید"
        maxWidth="xl"
      >
        <form onSubmit={handleCreateAssignment} className="space-y-4 text-right">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">کلاس مربوطه *</label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              required
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
            <label className="block text-xs font-bold text-slate-700 mb-1">عنوان تکلیف *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="مثال: تمرینات سری سوم مبحث حد و پیوستگی"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">شرح و راهنمای حل تکلیف</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="دستورالعمل، تمرین‌های شماره ۱ تا ۱۰ کتاب درسی..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">مهلت تحویل *</label>
              <input
                type="text"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
                placeholder="۱۴۰۴/۰۷/۲۵"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">حداکثر نمره (بارم) *</label>
              <input
                type="number"
                value={maxScore}
                onChange={(e) => setMaxScore(Number(e.target.value))}
                required
                min={1}
                max={100}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              فایل پیوست سوالات (اختیاری - PDF یا ZIP)
            </label>
            <input
              type="file"
              onChange={(e) => setAttachmentFile(e.target.files ? e.target.files[0] : null)}
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
            >
              {isSubmitting ? 'در حال ثبت...' : 'انتشار تکلیف'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Review Submission Modal */}
      <Modal
        isOpen={!!reviewingSubmission}
        onClose={() => setReviewingSubmission(null)}
        title="تصحیح و ثبت نمره تکلیف دانش‌آموز"
        maxWidth="md"
      >
        <form onSubmit={handleSaveReview} className="space-y-4 text-right">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              نمره اختصاص یافته (از ۲۰ نمره) *
            </label>
            <input
              type="number"
              value={reviewGrade}
              onChange={(e) => setReviewGrade(Number(e.target.value))}
              min={0}
              max={20}
              step={0.25}
              required
              className="w-full px-3 py-2 text-sm font-bold text-indigo-600 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              بازخورد و یادداشت استاد برای دانش‌آموز *
            </label>
            <textarea
              value={reviewFeedback}
              onChange={(e) => setReviewFeedback(e.target.value)}
              rows={3}
              required
              placeholder="نکات مثبت، اشکالات موجود در محاسبات یا تشویق دانش‌آموز..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setReviewingSubmission(null)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSavingReview}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
            >
              {isSavingReview ? 'در حال ثبت...' : 'ثبت قطعی نمره و بازخورد'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
