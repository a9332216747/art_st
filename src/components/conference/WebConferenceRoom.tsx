import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ClassSession } from '../../types';
import { TeacherClassroom } from './TeacherClassroom';
import { StudentClassroom } from './StudentClassroom';
import { ShieldAlert, ArrowRight } from 'lucide-react';

interface WebConferenceRoomProps {
  currentClass: ClassSession;
  onExit: () => void;
}

export const WebConferenceRoom: React.FC<WebConferenceRoomProps> = ({ currentClass, onExit }) => {
  const { user, role } = useAuth();

  if (!user) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-300 space-y-4">
        <p className="text-sm">برای ورود به کلاس آنلاین ابتدا وارد حساب کاربری خود شوید.</p>
        <button
          onClick={onExit}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition"
        >
          بازگشت
        </button>
      </div>
    );
  }

  // Teacher or Admin broadcaster access
  const isTeacherOrAdmin = role === 'TEACHER' || role === 'ADMIN';

  // Authorization Check: Student Enrollment
  if (role === 'STUDENT') {
    const isEnrolled = currentClass.studentIds && currentClass.studentIds.includes(user.id);
    if (!isEnrolled) {
      return (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-10 text-center space-y-4 max-w-lg mx-auto my-12">
          <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white">عدم دسترسی به کلاس آنلاین</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            شما در کلاس «{currentClass.title}» ثبت‌نام نشده‌اید و مجوز حضور در پخش زنده این کلاس را ندارید. در صورت لزوم با واحد آموزش یا مدیر سامانه تماس حاصل فرمایید.
          </p>
          <button
            onClick={onExit}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
          >
            <ArrowRight className="w-4 h-4" />
            <span>بازگشت به پنل کاربری</span>
          </button>
        </div>
      );
    }

    return <StudentClassroom currentClass={currentClass} onExit={onExit} />;
  }

  if (isTeacherOrAdmin) {
    return <TeacherClassroom currentClass={currentClass} onExit={onExit} />;
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
      نقش کاربری نامعتبر برای کلاس آنلاین.
    </div>
  );
};
