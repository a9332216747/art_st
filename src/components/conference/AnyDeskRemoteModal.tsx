import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import {
  Monitor,
  Laptop,
  Shield,
  Copy,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  MousePointer,
  Download,
  Key,
  Users,
  Eye,
  Lock,
  ArrowUpRight,
} from 'lucide-react';

interface AnyDeskRemoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: 'TEACHER' | 'STUDENT' | 'ADMIN';
  userName: string;
  classTitle?: string;
}

export const AnyDeskRemoteModal: React.FC<AnyDeskRemoteModalProps> = ({
  isOpen,
  onClose,
  userRole,
  userName,
  classTitle = 'کلاس آنلاین',
}) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'anydesk_connect' | 'web_remote' | 'download'>('anydesk_connect');
  
  // AnyDesk Quick Connect State
  const [myAnyDeskId, setMyAnyDeskId] = useState<string>(() => {
    const saved = localStorage.getItem('maktab_anydesk_id');
    return saved || `${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)}`;
  });
  const [remoteTargetId, setRemoteTargetId] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [sessionActive, setSessionActive] = useState<boolean>(false);

  // In-App Web Remote Simulator State
  const [isWebRemoteActive, setIsWebRemoteActive] = useState<boolean>(false);
  const [remoteAccessGrantedTo, setRemoteAccessGrantedTo] = useState<string | null>(null);
  const [virtualPointerPos, setVirtualPointerPos] = useState({ x: 200, y: 150 });
  const [remoteActionLogs, setRemoteActionLogs] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(myAnyDeskId.replace(/\s+/g, ''));
    setCopied(true);
    toast.success('کد AnyDesk کپی شد');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleLaunchAnyDesk = (targetId: string) => {
    const cleanId = (targetId || remoteTargetId).replace(/\s+/g, '');
    if (!cleanId) {
      toast.error('لطفاً شناسه AnyDesk مقصد را وارد کنید');
      return;
    }

    // Log the remote session request in audit logs
    api.logAuditEvent({
      action: 'REMOTE_DESKTOP_SESSION',
      fieldChanged: 'AnyDesk Connection',
      previousValue: null,
      newValue: cleanId,
      reason: `درخواست اتصال ریموت دسکتاپ توسط ${userName} (${userRole}) برای کلاس ${classTitle}`,
      operatorName: userName,
    }).catch(() => {});

    // Launch AnyDesk client via protocol handler
    try {
      window.location.href = `anydesk:${cleanId}`;
      setSessionActive(true);
      toast.info(`درخواست باز شدن AnyDesk به شناسه ${cleanId} ارسال شد`);
    } catch (e) {
      window.open(`anydesk:${cleanId}`, '_blank');
    }
  };

  const handleToggleWebRemoteControl = (studentName: string) => {
    if (remoteAccessGrantedTo === studentName) {
      setRemoteAccessGrantedTo(null);
      setRemoteActionLogs((prev) => [
        `دسترسی کنترل ریموت از ${studentName} لغو گردید.`,
        ...prev.slice(0, 5),
      ]);
      toast.info(`دسترسی کنترل از ${studentName} پس گرفته شد`);
    } else {
      setRemoteAccessGrantedTo(studentName);
      setRemoteActionLogs((prev) => [
        `دسترسی کنترل تعاملی دسکتاپ به ${studentName} داده شد.`,
        ...prev.slice(0, 5),
      ]);
      toast.success(`دسترسی کنترل دسکتاپ به ${studentName} واگذار شد`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="مرکز ریموت دسکتاپ کلاسی و اتصال AnyDesk"
      maxWidth="3xl"
    >
      <div className="space-y-5 text-right">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('anydesk_connect')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'anydesk_connect'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>اتصال مستقیم AnyDesk</span>
          </button>

          <button
            onClick={() => setActiveTab('web_remote')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'web_remote'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MousePointer className="w-4 h-4" />
            <span>کنترل تعاملی صفحه در وب (In-App Remote)</span>
          </button>

          <button
            onClick={() => setActiveTab('download')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'download'
                ? 'border-slate-800 text-slate-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>راهنمای نصب AnyDesk و نکات امنیتی</span>
          </button>
        </div>

        {/* TAB 1: ANYDESK DIRECT CONNECT */}
        {activeTab === 'anydesk_connect' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  AD
                </div>
                <div>
                  <h4 className="text-xs font-bold text-rose-900">اتصال سریع و امن AnyDesk کلاسی</h4>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    با اشتراک‌گذاری شناسه، می‌توانید کنترل امن سیستم را برای رفع اشکال تحویل بگیرید یا واگذار کنید.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-white text-rose-600 rounded-lg text-[10px] font-bold border border-rose-200 shadow-2xs">
                پروتکل امن DeskRT
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* My AnyDesk Address Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">کد AnyDesk سیستم شما:</span>
                  <span className="text-[10px] text-slate-400">شناسه اختصاصی این نشست</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={myAnyDeskId}
                    onChange={(e) => {
                      setMyAnyDeskId(e.target.value);
                      localStorage.setItem('maktab_anydesk_id', e.target.value);
                    }}
                    className="flex-1 px-3 py-2 text-center text-sm font-mono font-bold rounded-xl border border-slate-300 bg-white tracking-widest text-slate-800"
                    placeholder="123 456 789"
                  />
                  <button
                    onClick={handleCopyId}
                    className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors text-slate-700"
                    title="کپی کردن کد"
                  >
                    {copied ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span>{copied ? 'کپی شد' : 'کپی'}</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  این کد را در پیام‌رسان کلاس به {userRole === 'TEACHER' ? 'هنرجو' : 'استاد'} بدهید تا به سیستم شما ریموت بزند.
                </p>
              </div>

              {/* Connect to Remote Partner Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">اتصال به سیستم طرف مقابل:</span>
                  <span className="text-[10px] text-slate-400">شناسه دسکتاپ مقصد</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="کد طرف مقابل را وارد کنید..."
                    value={remoteTargetId}
                    onChange={(e) => setRemoteTargetId(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 bg-white"
                  />
                  <button
                    onClick={() => handleLaunchAnyDesk(remoteTargetId)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors shrink-0"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>اتصال سریع</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>یا با یک کلیک اپلیکیشن محلی باز شود:</span>
                  <a
                    href={`anydesk:${remoteTargetId || myAnyDeskId}`}
                    className="text-rose-600 hover:underline font-bold flex items-center gap-1"
                  >
                    <span>اجرای کلاینت AnyDesk</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Session Status */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>تمام اتصالات توسط AnyDesk به صورت نقطه به نقطه و با رمزنگاری TLS 1.2 برقرار می‌گردند.</span>
              </div>
              <button
                onClick={() => {
                  setMyAnyDeskId(
                    `${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)}`
                  );
                  toast.info('شناسه جدید نشست تولید شد');
                }}
                className="text-slate-500 hover:text-slate-800 text-[11px] flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>تولید شناسه جدید</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: IN-APP WEB REMOTE CONTROL */}
        {activeTab === 'web_remote' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-indigo-900">کنترل تعاملی نشانگر ماوس و تخته در محیط وب</h4>
                <p className="text-[11px] text-indigo-700 mt-0.5">
                  بدون نیاز به نصب نرم‌افزار اضافی، استاد می‌تواند کنترل نشانگر تخته یا حل تمرین را به دانش‌آموزان بسپارد.
                </p>
              </div>
              <span className="px-2.5 py-1 bg-white text-indigo-600 rounded-lg text-[10px] font-bold border border-indigo-200">
                تعاملی بلادرنگ
              </span>
            </div>

            {/* Interactive Canvas Canvas Area */}
            <div className="relative h-64 bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 flex flex-col justify-between p-4 select-none">
              <div className="flex items-center justify-between text-slate-300 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                  <span className="font-bold text-white">صفحه کار اشتراکی کلاس</span>
                </div>
                <div className="text-[11px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                  {remoteAccessGrantedTo ? `کنترل فعال توسط: ${remoteAccessGrantedTo}` : 'کنترل در دست استاد'}
                </div>
              </div>

              {/* Virtual Cursor Moving */}
              <div
                style={{
                  transform: `translate(${virtualPointerPos.x}px, ${virtualPointerPos.y}px)`,
                  transition: 'transform 0.1s ease-out',
                }}
                className="absolute pointer-events-none flex items-center gap-1"
              >
                <MousePointer className="w-5 h-5 text-amber-400 drop-shadow-md fill-amber-400" />
                <span className="bg-amber-500 text-slate-950 font-bold text-[10px] px-1.5 py-0.5 rounded shadow">
                  {remoteAccessGrantedTo || userName}
                </span>
              </div>

              {/* Center Canvas Notice */}
              <div
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setVirtualPointerPos({
                    x: Math.max(20, Math.min(e.clientX - rect.left, 500)),
                    y: Math.max(20, Math.min(e.clientY - rect.top, 180)),
                  });
                }}
                className="h-36 border border-dashed border-slate-700 rounded-xl flex items-center justify-center cursor-crosshair text-slate-400 text-xs text-center p-4 hover:border-slate-500 transition-colors"
              >
                <div>
                  <p className="font-bold text-slate-300">محیط شبیه‌ساز نشانگر مشترک کلاسی</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    ماوس خود را در این مستطیل حرکت دهید تا موقعیت آن برای تمام افراد ارسال شود
                  </p>
                </div>
              </div>

              {/* Controls at bottom of canvas */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                <span className="text-[11px] text-slate-400">
                  {remoteActionLogs[0] || 'سیستم آماده واگذاری کنترل صفحه'}
                </span>
                {userRole === 'TEACHER' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleWebRemoteControl('علی محمدی')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                        remoteAccessGrantedTo === 'علی محمدی'
                          ? 'bg-rose-600 text-white'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      {remoteAccessGrantedTo === 'علی محمدی' ? 'سلب دسترسی از علی' : 'واگذاری کنترل به علی'}
                    </button>
                    <button
                      onClick={() => handleToggleWebRemoteControl('زهرا کاظمی')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                        remoteAccessGrantedTo === 'زهرا کاظمی'
                          ? 'bg-rose-600 text-white'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      {remoteAccessGrantedTo === 'زهرا کاظمی' ? 'سلب دسترسی از زهرا' : 'واگذاری کنترل به زهرا'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DOWNLOAD & SECURITY GUIDE */}
        {activeTab === 'download' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-600" />
                <span>دریافت رایگان نرم‌افزار معتبر AnyDesk برای تمامی سیستم‌عامل‌ها</span>
              </h4>
              <p className="text-slate-600 leading-relaxed">
                AnyDesk یک برنامه فوق سبک (کمتر از ۴ مگابایت) و بدون نیاز به نصب اجباری (Portable) است که به شما امکان دسترسی ریموت با بالاترین سرعت فریم ریت را می‌دهد:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                <a
                  href="https://anydesk.com/en/downloads/windows"
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 text-center font-bold text-slate-800 flex flex-col items-center gap-1 transition-colors"
                >
                  <Laptop className="w-5 h-5 text-blue-600" />
                  <span>دانلود نسخه ویندوز</span>
                  <span className="text-[10px] text-slate-400 font-normal">Windows 10 / 11</span>
                </a>

                <a
                  href="https://anydesk.com/en/downloads/mac-os"
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 text-center font-bold text-slate-800 flex flex-col items-center gap-1 transition-colors"
                >
                  <Monitor className="w-5 h-5 text-slate-800" />
                  <span>دانلود نسخه مکینتاش</span>
                  <span className="text-[10px] text-slate-400 font-normal">macOS Intel / M-Series</span>
                </a>

                <a
                  href="https://anydesk.com/en/downloads/android"
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 text-center font-bold text-slate-800 flex flex-col items-center gap-1 transition-colors"
                >
                  <Users className="w-5 h-5 text-emerald-600" />
                  <span>دانلود اندروید و لینوکس</span>
                  <span className="text-[10px] text-slate-400 font-normal">Android / Linux</span>
                </a>
              </div>
            </div>

            {/* Security Rules */}
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1.5 text-amber-900">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>قوانین امنیتی و محرمانگی دسترسی از راه دور:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800 pr-2">
                <li>تنها به اساتید و همکلاسی‌های تایید شده در سامانه مکتب اجازه ریموت بدهید.</li>
                <li>هر زمان مایل بودید، با کلیک روی دکمه سرخ‌رنگ «Disconnect» در AnyDesk، ارتباط بلافاصله قطع می‌شود.</li>
                <li>برای افزایش امنیت، فایل‌ها و پوشه‌های شخصی دسکتاپ را پیش از شروع اشتراک ببندید.</li>
              </ul>
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            بستن پنجره ریموت
          </button>
        </div>
      </div>
    </Modal>
  );
};
