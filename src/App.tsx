/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LoginPage } from './components/auth/LoginPage';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { StudentDashboard } from './components/student/StudentDashboard';
import { ProfileModal } from './components/profile/ProfileModal';

const MainAppContent: React.FC = () => {
  const { user, role, isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Reset tab when role changes
  React.useEffect(() => {
    setCurrentTab('overview');
  }, [role]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center text-white space-y-4 font-sans">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-sm font-bold text-slate-300">در حال راه‌اندازی سامانه آموزش آنلاین...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col md:flex-row font-sans" dir="rtl">
      {/* Dark Sidebar on Right */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Main Workspace Column on Left */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          onOpenProfile={() => setIsProfileOpen(true)}
          onSelectTab={setCurrentTab}
        />

        {/* Scrollable Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {role === 'ADMIN' && (
            <AdminDashboard currentTab={currentTab} onSelectTab={setCurrentTab} />
          )}
          {role === 'TEACHER' && (
            <TeacherDashboard currentTab={currentTab} onSelectTab={setCurrentTab} />
          )}
          {role === 'STUDENT' && (
            <StudentDashboard currentTab={currentTab} onSelectTab={setCurrentTab} />
          )}
        </main>
      </div>

      {/* User Profile / Password Modal */}
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainAppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
