import {
  User,
  ClassSession,
  Major,
  Course,
  EducationalFile,
  Assignment,
  AssignmentSubmission,
  DailyGradeRecord,
  GradeAuditLog,
  MonthlyReport,
  InAppNotification,
  LiveSessionState,
} from '../types';

class ApiClient {
  private getHeaders(): HeadersInit {
    const userStr = localStorage.getItem('maktab_current_user');
    const token = localStorage.getItem('maktab_auth_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (u && u.id) {
          headers['x-user-id'] = u.id;
        }
      } catch (e) {
        // ignore
      }
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // Auth
  async login(username: string, password?: string): Promise<{ token: string; user: User }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: password || 'password123' }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'خطا در ورود به سامانه' }));
      throw new Error(err.error || 'ورود ناموفق بود');
    }
    return res.json();
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<any> {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId, oldPassword, newPassword }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'خطا در تغییر رمز عبور' }));
      throw new Error(err.error || 'خطا در تغییر رمز عبور');
    }
    return res.json();
  }

  async resetPassword(email: string): Promise<any> {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'ایمیل یافت نشد' }));
      throw new Error(err.error || 'خطا در ارسال بازیابی');
    }
    return res.json();
  }

  // Users
  async getUsers(params?: { role?: string; search?: string; status?: string }): Promise<User[]> {
    const q = new URLSearchParams();
    if (params?.role) q.set('role', params.role);
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    const res = await fetch(`/api/users?${q.toString()}`, { headers: this.getHeaders() });
    return res.json();
  }

  async createUser(userData: Partial<User> & { password?: string }): Promise<User> {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'خطا در ایجاد کاربر' }));
      throw new Error(err.error || 'خطا در ثبت کاربر');
    }
    return res.json();
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('خطا در به‌روزرسانی کاربر');
    return res.json();
  }

  async deleteUser(id: string): Promise<any> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'خطا در حذف کاربر' }));
      throw new Error(err.error || 'خطا در حذف کاربر');
    }
    return res.json();
  }

  // Classes
  async getClasses(params?: { teacherId?: string; studentId?: string }): Promise<ClassSession[]> {
    const q = new URLSearchParams();
    if (params?.teacherId) q.set('teacherId', params.teacherId);
    if (params?.studentId) q.set('studentId', params.studentId);
    const res = await fetch(`/api/classes?${q.toString()}`, { headers: this.getHeaders() });
    return res.json();
  }

  async createClass(classData: Partial<ClassSession>): Promise<ClassSession> {
    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(classData),
    });
    if (!res.ok) throw new Error('خطا در تعریف کلاس');
    return res.json();
  }

  async updateClass(id: string, updates: Partial<ClassSession>): Promise<ClassSession> {
    const res = await fetch(`/api/classes/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
    });
    return res.json();
  }

  async deleteClass(id: string): Promise<any> {
    const res = await fetch(`/api/classes/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return res.json();
  }

  // Educational Files
  async getFiles(params?: { classId?: string; teacherId?: string }): Promise<EducationalFile[]> {
    const q = new URLSearchParams();
    if (params?.classId) q.set('classId', params.classId);
    if (params?.teacherId) q.set('teacherId', params.teacherId);
    const res = await fetch(`/api/files?${q.toString()}`, { headers: this.getHeaders() });
    return res.json();
  }

  async uploadEducationalFile(formData: FormData): Promise<EducationalFile> {
    const userStr = localStorage.getItem('maktab_current_user');
    const headers: Record<string, string> = {};
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (u?.id) headers['x-user-id'] = u.id;
      } catch (e) {}
    }
    const res = await fetch('/api/files/upload', {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'خطا در بارگذاری فایل' }));
      throw new Error(err.error || 'بارگذاری ناموفق بود');
    }
    return res.json();
  }

  // Assignments
  async getAssignments(params?: { classId?: string; teacherId?: string }): Promise<Assignment[]> {
    const q = new URLSearchParams();
    if (params?.classId) q.set('classId', params.classId);
    if (params?.teacherId) q.set('teacherId', params.teacherId);
    const res = await fetch(`/api/assignments?${q.toString()}`, { headers: this.getHeaders() });
    return res.json();
  }

  async createAssignment(formData: FormData): Promise<Assignment> {
    const res = await fetch('/api/assignments', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('خطا در ثبت تکلیف');
    return res.json();
  }

  // Submissions
  async getSubmissions(params?: {
    assignmentId?: string;
    classId?: string;
    studentId?: string;
    teacherId?: string;
  }): Promise<AssignmentSubmission[]> {
    const q = new URLSearchParams();
    if (params?.assignmentId) q.set('assignmentId', params.assignmentId);
    if (params?.classId) q.set('classId', params.classId);
    if (params?.studentId) q.set('studentId', params.studentId);
    if (params?.teacherId) q.set('teacherId', params.teacherId);
    const res = await fetch(`/api/submissions?${q.toString()}`, { headers: this.getHeaders() });
    return res.json();
  }

  async submitAssignment(formData: FormData): Promise<AssignmentSubmission> {
    const res = await fetch('/api/submissions/upload', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('خطا در ارسال پاسخ تکلیف');
    return res.json();
  }

  async reviewSubmission(
    submissionId: string,
    grade: number,
    feedback: string
  ): Promise<AssignmentSubmission> {
    const res = await fetch(`/api/submissions/${submissionId}/review`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ grade, feedback }),
    });
    if (!res.ok) throw new Error('خطا در ثبت بازخورد و نمره');
    return res.json();
  }

  // Grades & Audit
  async getGrades(params?: {
    classId?: string;
    studentId?: string;
    teacherId?: string;
    date?: string;
  }): Promise<DailyGradeRecord[]> {
    const q = new URLSearchParams();
    if (params?.classId) q.set('classId', params.classId);
    if (params?.studentId) q.set('studentId', params.studentId);
    if (params?.teacherId) q.set('teacherId', params.teacherId);
    if (params?.date) q.set('date', params.date);
    const res = await fetch(`/api/grades?${q.toString()}`, { headers: this.getHeaders() });
    return res.json();
  }

  async saveGrade(gradeRecord: Partial<DailyGradeRecord>): Promise<DailyGradeRecord> {
    const res = await fetch('/api/grades', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(gradeRecord),
    });
    if (!res.ok) throw new Error('خطا در ذخیره نمره');
    return res.json();
  }

  async updateGrade(id: string, gradeData: Partial<DailyGradeRecord> & { operatorName?: string; reason?: string }): Promise<DailyGradeRecord> {
    const res = await fetch(`/api/grades/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(gradeData),
    });
    if (!res.ok) throw new Error('خطا در ویرایش نمره و وضعیت حضور');
    return res.json();
  }

  // Majors Management
  async getMajors(): Promise<Major[]> {
    const res = await fetch('/api/majors', { headers: this.getHeaders() });
    return res.json();
  }

  async createMajor(majorData: Partial<Major>): Promise<Major> {
    const res = await fetch('/api/majors', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(majorData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'خطا در تعریف رشته جدید' }));
      throw new Error(err.error || 'خطا در ثبت رشته');
    }
    return res.json();
  }

  async updateMajor(id: string, majorData: Partial<Major>): Promise<Major> {
    const res = await fetch(`/api/majors/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(majorData),
    });
    if (!res.ok) throw new Error('خطا در ویرایش رشته');
    return res.json();
  }

  async deleteMajor(id: string): Promise<any> {
    const res = await fetch(`/api/majors/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('خطا در حذف رشته تحصیلی');
    return res.json();
  }

  // Courses Management
  async getCourses(params?: { majorId?: string; gradeLevel?: string; search?: string }): Promise<Course[]> {
    const q = new URLSearchParams();
    if (params?.majorId) q.set('majorId', params.majorId);
    if (params?.gradeLevel) q.set('gradeLevel', params.gradeLevel);
    if (params?.search) q.set('search', params.search);
    const res = await fetch(`/api/courses?${q.toString()}`, { headers: this.getHeaders() });
    return res.json();
  }

  async createCourse(courseData: Partial<Course>): Promise<Course> {
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(courseData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'خطا در تعریف درس جدید' }));
      throw new Error(err.error || 'خطا در ثبت درس');
    }
    return res.json();
  }

  async updateCourse(id: string, courseData: Partial<Course>): Promise<Course> {
    const res = await fetch(`/api/courses/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(courseData),
    });
    if (!res.ok) throw new Error('خطا در ویرایش درس');
    return res.json();
  }

  async deleteCourse(id: string): Promise<any> {
    const res = await fetch(`/api/courses/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('خطا در حذف درس');
    return res.json();
  }

  async getAuditLogs(): Promise<GradeAuditLog[]> {
    const res = await fetch('/api/audit-logs', { headers: this.getHeaders() });
    return res.json();
  }

  async logAuditEvent(data: { action: string; fieldChanged?: string; previousValue?: any; newValue?: any; reason?: string; operatorName?: string }): Promise<any> {
    const res = await fetch('/api/audit-logs', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  }

  // Monthly Reports
  async getMonthlyReports(studentId?: string): Promise<MonthlyReport[] | MonthlyReport> {
    const q = studentId ? `?studentId=${studentId}` : '';
    const res = await fetch(`/api/reports/monthly${q}`, { headers: this.getHeaders() });
    return res.json();
  }

  // Notifications
  async getNotifications(): Promise<InAppNotification[]> {
    const res = await fetch('/api/notifications', { headers: this.getHeaders() });
    return res.json();
  }

  async markAllNotificationsRead(): Promise<any> {
    const res = await fetch('/api/notifications/read-all', {
      method: 'PUT',
      headers: this.getHeaders(),
    });
    return res.json();
  }

  // Live Session
  async getLiveSession(classId: string): Promise<LiveSessionState> {
    const res = await fetch(`/api/live-sessions/${classId}`, { headers: this.getHeaders() });
    return res.json();
  }

  async startLiveSession(classId: string, teacherId: string, teacherName: string): Promise<LiveSessionState> {
    const res = await fetch(`/api/live-sessions/${classId}/start`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ teacherId, teacherName }),
    });
    return res.json();
  }

  async endLiveSession(classId: string): Promise<any> {
    const res = await fetch(`/api/live-sessions/${classId}/end`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return res.json();
  }

  async joinLiveSession(classId: string, userId: string, userName: string, role: string): Promise<LiveSessionState> {
    const res = await fetch(`/api/live-sessions/${classId}/join`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId, userName, role }),
    });
    return res.json();
  }

  async leaveLiveSession(classId: string, userId: string): Promise<any> {
    const res = await fetch(`/api/live-sessions/${classId}/leave`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId }),
    });
    return res.json();
  }

  async toggleLiveControls(
    classId: string,
    controls: { isCameraOn?: boolean; isMicOn?: boolean; isScreenSharing?: boolean }
  ): Promise<LiveSessionState> {
    const res = await fetch(`/api/live-sessions/${classId}/toggle`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(controls),
    });
    return res.json();
  }

  // WebRTC Isolated Signaling Methods
  async sendOffer(classId: string, studentId: string, offer: RTCSessionDescriptionInit): Promise<any> {
    const res = await fetch(`/api/live-sessions/${classId}/offer`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ studentId, offer }),
    });
    return res.json();
  }

  async sendAnswer(classId: string, studentId: string, answer: RTCSessionDescriptionInit): Promise<any> {
    const res = await fetch(`/api/live-sessions/${classId}/answer`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ studentId, answer }),
    });
    return res.json();
  }

  async sendTeacherCandidate(classId: string, candidate: RTCIceCandidateInit): Promise<any> {
    const res = await fetch(`/api/live-sessions/${classId}/teacher-candidate`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ candidate }),
    });
    return res.json();
  }

  async getTeacherCandidates(classId: string): Promise<any[]> {
    const res = await fetch(`/api/live-sessions/${classId}/teacher-candidates`, {
      headers: this.getHeaders(),
    });
    return res.json();
  }

  async sendStudentCandidate(classId: string, studentId: string, candidate: RTCIceCandidateInit): Promise<any> {
    const res = await fetch(`/api/live-sessions/${classId}/student-candidate`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ studentId, candidate }),
    });
    return res.json();
  }

  async getStudentCandidates(classId: string, studentId: string): Promise<any[]> {
    const res = await fetch(`/api/live-sessions/${classId}/student-candidates/${studentId}`, {
      headers: this.getHeaders(),
    });
    return res.json();
  }

  async getStudentConnection(classId: string, studentId: string): Promise<any> {
    const res = await fetch(`/api/live-sessions/${classId}/student-connection/${studentId}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) return null;
    return res.json();
  }

  async sendLiveChatMessage(classId: string, senderId: string, senderName: string, role: string, text: string): Promise<any> {
    const res = await fetch(`/api/live-sessions/${classId}/chat`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ senderId, senderName, role, text }),
    });
    return res.json();
  }

  async raiseHand(classId: string, userId: string): Promise<any> {
    const res = await fetch(`/api/live-sessions/${classId}/raise-hand`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId }),
    });
    return res.json();
  }
}

export const api = new ApiClient();
