import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../api/client';
import { Modal } from '../common/Modal';
import { GraduationCap, Shield, BookOpen, UserCheck, Lock, User, KeyRound, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, switchDemoUser } = useAuth();
  const toast = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Forgot password modal
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('لطفاً نام کاربری و رمز عبور را وارد نمایید');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      await login(username.trim(), password.trim());
      toast.success('ورود با موفقیت انجام شد. خوش آمدید!');
    } catch (err: any) {
      setErrorMsg(err.message || 'نام کاربری یا رمز عبور اشتباه است');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'ADMIN' | 'TEACHER' | 'STUDENT') => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await switchDemoUser(role);
      toast.success('ورود سریع آزمایشی انجام شد');
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ورود سریع');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    try {
      const res = await api.resetPassword(resetEmail.trim());
      toast.success(res.message || 'لینک بازیابی ارسال شد');
      setIsResetOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'خطا در ارسال بازیابی');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-16 h-16 rounded-2xl bg-indigo-600 text-white items-center justify-center shadow-xl shadow-indigo-600/30 mb-4">
          <GraduationCap className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          سامانه آموزش و کلاس آنلاین
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          سامانه جامع مدیریت آموزش، کنفرانس زنده وب و ثبت تکالیف
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/80 rounded-3xl border border-slate-200">
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium leading-relaxed">
              {errorMsg}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                نام کاربری یا ایمیل
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="مثال: admin یا dr.alavi"
                  className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
                  required
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">رمز عبور</label>
                <button
                  type="button"
                  onClick={() => setIsResetOpen(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  رمز عبور را فراموش کرده‌اید؟
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
                  required
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <span>در حال ورود...</span>
              ) : (
                <>
                  <span>ورود به سامانه</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Bar */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="text-center text-xs font-bold text-slate-500 mb-3">
              ورود سریع آزمایشی با یک کلیک:
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('ADMIN')}
                disabled={isLoading}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-800 transition-colors text-xs font-semibold"
              >
                <Shield className="w-5 h-5 mb-1 text-rose-600" />
                مدیر کل
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('TEACHER')}
                disabled={isLoading}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 text-emerald-800 transition-colors text-xs font-semibold"
              >
                <BookOpen className="w-5 h-5 mb-1 text-emerald-600" />
                مدرس
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('STUDENT')}
                disabled={isLoading}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-800 transition-colors text-xs font-semibold"
              >
                <UserCheck className="w-5 h-5 mb-1 text-indigo-600" />
                دانش‌آموز
              </button>
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-3">
              رمز پیش‌فرض تمام کاربران آزمایشی: <span className="font-mono text-slate-600">password123</span>
            </p>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      <Modal
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        title="بازیابی رمز عبور"
        maxWidth="md"
      >
        <form onSubmit={handleResetSubmit} className="space-y-4 text-right">
          <p className="text-xs text-slate-600 leading-relaxed">
            نشانی ایمیل ثبت شده در حساب کاربری خود را وارد فرمایید تا راهنمای بازنشانی کلمه عبور ارسال گردد.
          </p>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">نشانی ایمیل</label>
            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="admin@maktab.ir"
              required
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsResetOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={resetLoading}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50"
            >
              {resetLoading ? 'در حال ارسال...' : 'ارسال لینک بازیابی'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
