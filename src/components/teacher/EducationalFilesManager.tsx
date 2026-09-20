import React, { useState, useEffect } from 'react';
import { EducationalFile, ClassSession } from '../../types';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import {
  FolderArchive,
  UploadCloud,
  FileText,
  FileArchive,
  Presentation,
  Download,
  Trash2,
  Filter,
  Plus,
  Calendar,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  FileCode,
  X,
  Layers,
} from 'lucide-react';

export const EducationalFilesManager: React.FC = () => {
  const { user, role } = useAuth();
  const toast = useToast();

  const [files, setFiles] = useState<EducationalFile[]>([]);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Upload modal
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [classId, setClassId] = useState('');
  const [isPackage, setIsPackage] = useState(false);
  const [externalUrl, setExternalUrl] = useState('');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal
  const [deletingFile, setDeletingFile] = useState<EducationalFile | null>(null);

  const canUpload = role === 'TEACHER' || role === 'ADMIN';

  useEffect(() => {
    loadData();
  }, [selectedClassId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fList, cList] = await Promise.all([
        api.getFiles({ classId: selectedClassId || undefined }),
        api.getClasses(),
      ]);
      setFiles(fList);
      setClasses(cList);
      if (cList.length > 0 && !classId) {
        setClassId(cList[0].id);
      }
    } catch (e) {
      toast.error('خطا در دریافت فایل‌های آموزشی');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFileToUpload(f);
      if (!title) {
        setTitle(f.name.replace(/\.[^/.]+$/, ''));
      }
      if (f.name.toLowerCase().endsWith('.zip') || f.name.toLowerCase().endsWith('.rar')) {
        setIsPackage(true);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !classId) {
      toast.error('لطفاً عنوان و کلاس مورد نظر را تعیین نمایید');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (fileToUpload) {
        formData.append('file', fileToUpload);
      }
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('classId', classId);
      formData.append('isPackage', isPackage ? 'true' : 'false');
      if (externalUrl.trim()) {
        formData.append('externalUrl', externalUrl.trim());
      }
      if (user) {
        formData.append('teacherId', user.id);
      }

      await api.uploadEducationalFile(formData);
      toast.success(fileToUpload ? 'فایل آموزشی با موفقیت بارگذاری شد' : 'بسته آموزشی با موفقیت ثبت شد');
      setIsUploadOpen(false);
      setTitle('');
      setDescription('');
      setExternalUrl('');
      setFileToUpload(null);
      setIsPackage(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'خطا در بارگذاری');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingFile) return;
    try {
      setFiles((prev) => prev.filter((f) => f.id !== deletingFile.id));
      toast.success('فایل یا بسته با موفقیت حذف گردید');
      setDeletingFile(null);
    } catch (err) {
      toast.error('خطا در حذف فایل');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return 'فاقد فایل دانلودی';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} مگابایت`;
    return `${Math.round(bytes / 1024)} کیلوبایت`;
  };

  const getFileIcon = (fileType?: string, isPkg?: boolean) => {
    if (isPkg || fileType === 'PACKAGE' || fileType === 'ZIP') {
      return <FileArchive className="w-8 h-8 text-amber-500" />;
    }
    if (fileType === 'PDF') return <FileText className="w-8 h-8 text-rose-500" />;
    if (fileType === 'PPTX' || fileType === 'POWERPOINT') return <Presentation className="w-8 h-8 text-orange-500" />;
    if (fileType === 'NOTE') return <BookOpen className="w-8 h-8 text-indigo-500" />;
    return <FileText className="w-8 h-8 text-blue-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200">
        <div>
          <h2 className="text-lg font-black text-slate-800">مخزن فایل‌ها و بسته‌های آموزشی</h2>
          <p className="text-xs text-slate-500 mt-1">
            اشتراک‌گذاری جزوات درسی (PDF)، ارائه‌ها (PowerPoint)، بسته‌های آموزشی جامع، لینک‌ها و فایل‌های ضمیمه اختیاری
          </p>
        </div>

        {canUpload && (
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            افزودن فایل یا بسته آموزشی جدید
          </button>
        )}
      </div>

      {/* Filter by class */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-bold text-slate-700">فیلتر بر اساس کلاس:</span>
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">همه کلاس‌ها</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} ({c.subject})
            </option>
          ))}
        </select>
      </div>

      {/* Files Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {files.map((file) => {
          const cls = classes.find((c) => c.id === file.classId);
          const hasRealFile = Boolean(file.fileUrl && file.fileUrl.startsWith('/api/files/download'));
          const hasExtUrl = Boolean(file.externalUrl || (file.fileUrl && file.fileUrl.startsWith('http')));

          return (
            <div
              key={file.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    {getFileIcon(file.fileType, file.isPackage || file.isZipPackage)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(file.isPackage || file.isZipPackage) && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        بسته آموزشی
                      </span>
                    )}
                    {canUpload && (
                      <button
                        onClick={() => setDeletingFile(file)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="حذف فایل یا بسته"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">{file.title}</h3>
                  {file.description && (
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{file.description}</p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500">
                  <div className="flex items-center justify-between">
                    <span>کلاس مرتبط:</span>
                    <span className="font-bold text-slate-700">{cls?.title || file.className || 'کلاس عمومی'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>وضعیت ضمیمه:</span>
                    <span className="font-medium text-slate-700">
                      {hasRealFile ? formatFileSize(file.fileSize) : (hasExtUrl ? 'پیوند اینترنتی' : 'محتوای آموزشی')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>تاریخ بارگذاری:</span>
                    <span className="font-mono text-slate-700">{file.date || (file as any).uploadDate || 'امروز'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100">
                {hasRealFile ? (
                  <a
                    href={file.fileUrl}
                    download={file.fileName || 'educational-file'}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-100 hover:bg-indigo-600 text-slate-700 hover:text-white font-bold text-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>دانلود فایل ضمیمه ({file.fileType})</span>
                  </a>
                ) : hasExtUrl ? (
                  <a
                    href={file.externalUrl || file.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold text-xs transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>مشاهده پیوند و منبع آنلاین</span>
                  </a>
                ) : (
                  <div className="w-full text-center py-2 px-3 rounded-xl bg-slate-50 text-slate-600 font-bold text-xs border border-slate-200">
                    بسته آموزشی متنی (فاقد فایل دانلودی)
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {files.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
          <FolderArchive className="w-12 h-12 mx-auto mb-3 opacity-40 text-slate-500" />
          <p className="text-sm font-bold text-slate-600">فایلی برای این کلاس موجود نیست</p>
          <p className="text-xs text-slate-400 mt-1">
            اساتید می‌توانند جزوات درسی، بسته‌های آموزشی و لینک‌های مفید را در این بخش قرار دهند (بارگذاری فایل زیپ اختیاری است)
          </p>
        </div>
      )}

      {/* Upload/Create Modal */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="افزودن فایل یا بسته آموزشی جدید"
        maxWidth="lg"
      >
        <form onSubmit={handleUpload} className="space-y-4 text-right">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">انتخاب کلاس *</label>
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
            <label className="block text-xs font-bold text-slate-700 mb-1">عنوان فایل یا بسته آموزشی *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="مثال: جزوه درس ۳ مشتق یا بسته جامع آموزش فصل دوم"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات و راهنمای مطالعه</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="توضیحاتی برای مطالعه و نحوه استفاده دانش‌آموزان..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Optional File Upload */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                پیوست فایل (اختیاری - PDF, Word, PowerPoint, ZIP, Excel, عکس، مدیا)
              </label>
              {fileToUpload && (
                <button
                  type="button"
                  onClick={() => setFileToUpload(null)}
                  className="text-[11px] text-rose-500 hover:text-rose-700 flex items-center gap-0.5 font-bold"
                >
                  <X className="w-3 h-3" />
                  حذف فایل
                </button>
              )}
            </div>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-indigo-500 transition-colors bg-slate-50/50">
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.7z,.jpg,.jpeg,.png,.mp4,.mp3"
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />
              {fileToUpload ? (
                <div className="mt-2 text-xs text-emerald-600 font-bold flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  فایل انتخاب شد: {fileToUpload.name} ({(fileToUpload.size / (1024 * 1024)).toFixed(2)} مگابایت)
                </div>
              ) : (
                <p className="mt-1.5 text-[11px] text-slate-400">
                  بارگذاری فایل یا بسته زیپ اجباری نیست؛ می‌توانید صرفاً عنوان، توضیحات یا لینک آموزشی ثبت کنید.
                </p>
              )}
            </div>
          </div>

          {/* Optional External Link */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              پیوند اینترنتی یا منبع خارجی (اختیاری)
            </label>
            <input
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://example.com/resources/lesson-1"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-left font-mono"
              dir="ltr"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isPackage}
              onChange={(e) => setIsPackage(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <span className="text-xs font-bold text-slate-700">
              علامت‌گذاری به عنوان «بسته جامع آموزشی» (شامل چند بخش درسی یا مبحث)
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsUploadOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
            >
              {isSubmitting ? 'در حال ثبت...' : (fileToUpload ? 'بارگذاری و ذخیره' : 'ذخیره بسته آموزشی')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={!!deletingFile}
        onClose={() => setDeletingFile(null)}
        title="تایید حذف فایل یا بسته آموزشی"
        maxWidth="sm"
      >
        <div className="space-y-4 text-right">
          <p className="text-xs text-slate-600">
            آیا از حذف «{deletingFile?.title}» اطمینان دارید؟ این عملیات قابل بازگشت نخواهد بود.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDeletingFile(null)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              انصراف
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
            >
              حذف قطعی
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
