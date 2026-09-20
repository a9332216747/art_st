import React, { useState, useEffect } from 'react';
import { Assignment, AssignmentSubmission, ClassSession } from '../../types';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import {
  FileCheck2,
  Clock,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileText,
  Award,
} from 'lucide-react';

export const StudentAssignments: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);

  // Submit Modal
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const [aList, cList, subList] = await Promise.all([
        api.getAssignments(),
        api.getClasses(),
        api.getSubmissions({ studentId: user.id }),
      ]);
      setAssignments(aList);
      setClasses(cList);
      setSubmissions(subList);
    } catch (e) {
      toast.error('خطا در دریافت تکالیف');
    }
  };

  const handleOpenSubmit = (asg: Assignment) => {
    setActiveAssignment(asg);
    setSubmissionFile(null);
  };

  const handleSubmitFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssignment || !submissionFile || !user) {
      toast.error('لطفاً فایل پاسخ را انتخاب نمایید');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', submissionFile);
      formData.append('assignmentId', activeAssignment.id);
      formData.append('classId', activeAssignment.classId);
      formData.append('studentId', user.id);
      formData.append('teacherId', activeAssignment.teacherId);

      await api.submitAssignment(formData);
      toast.success('پاسخ تکلیف با موفقیت تحویل داده شد');
      setActiveAssignment(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'خطا در ارسال پاسخ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200">
        <h2 className="text-lg font-black text-slate-800">تکالیف درسی و ارسال پاسخ‌ها</h2>
        <p className="text-xs text-slate-500 mt-1">
          مشاهده تکالیف محول شده، دریافت صورت تمرینات، ارسال فایل پاسخ و مشاهده بازخورد استاد
        </p>
      </div>

      {/* Assignments List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {assignments.map((asg) => {
          const cls = classes.find((c) => c.id === asg.classId);
          const userSub = submissions.find((s) => s.assignmentId === asg.id);

          return (
            <div
              key={asg.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow relative"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-[11px] border border-indigo-100">
                    {cls?.title || 'کلاس درس'}
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    مهلت: {asg.deadline}
                  </span>
                </div>

                <h3 className="text-sm font-extrabold text-slate-900 leading-snug">{asg.title}</h3>

                {asg.description && (
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {asg.description}
                  </p>
                )}

                {asg.attachmentUrl && (
                  <div className="pt-1">
                    <a
                      href={asg.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      <Download className="w-3.5 h-3.5" />
                      دریافت فایل صورت سوالات استاد
                    </a>
                  </div>
                )}
              </div>

              {/* Submission status & actions */}
              <div className="pt-4 mt-4 border-t border-slate-100 space-y-3">
                {userSub ? (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">وضعیت تحویل:</span>
                      {userSub.status === 'REVIEWED' ? (
                        <span className="font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          تصحیح شده (نمره: {userSub.grade} از {asg.maxScore})
                        </span>
                      ) : (
                        <span className="font-bold text-amber-600 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          ارسال شده (در انتظار بررسی استاد)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/50">
                      <span className="text-slate-500 font-mono">فایل شما: {userSub.fileName}</span>
                      <a
                        href={userSub.fileUrl}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:underline text-[11px] font-bold"
                      >
                        دانلود مجدد
                      </a>
                    </div>

                    {userSub.feedback && (
                      <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 leading-relaxed">
                        <span className="font-bold block mb-0.5">نظر استاد:</span>
                        {userSub.feedback}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => handleOpenSubmit(asg)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
                  >
                    <UploadCloud className="w-4 h-4" />
                    ارسال پاسخ تکلیف
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit Homework Modal */}
      <Modal
        isOpen={!!activeAssignment}
        onClose={() => setActiveAssignment(null)}
        title={`ارسال پاسخ تکلیف: ${activeAssignment?.title || ''}`}
        maxWidth="md"
      >
        <form onSubmit={handleSubmitFile} className="space-y-4 text-right">
          <p className="text-xs text-slate-600 leading-relaxed">
            فایل پاسخ خود را با فرمت‌های PDF، تصاویر اسکن شده یا فایل فشرده ZIP انتخاب فرمایید:
          </p>

          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-indigo-500 transition-colors">
            <input
              type="file"
              required
              onChange={(e) => setSubmissionFile(e.target.files ? e.target.files[0] : null)}
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700"
            />
            {submissionFile && (
              <div className="mt-3 text-xs text-emerald-600 font-bold flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                {submissionFile.name} ({(submissionFile.size / 1024).toFixed(0)} کیلوبایت)
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setActiveAssignment(null)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
            >
              {isSubmitting ? 'در حال آپلود و ارسال...' : 'ارسال قطعی تکلیف'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
