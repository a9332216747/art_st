export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface User {
  id: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  mobile: string;
  avatar?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  // Teacher specific
  subject?: string;
  // Student specific
  studentId?: string;
  gradeLevel?: string;
  assignedTeacherId?: string;
}

export interface ClassSession {
  id: string;
  title: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  studentIds: string[];
  scheduleDay: string;
  startTime: string;
  endTime: string;
  date: string;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
  roomKey?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EducationalFile {
  id: string;
  title: string;
  description: string;
  classId: string;
  className: string;
  teacherId: string;
  teacherName: string;
  date: string;
  relatedLesson: string;
  assignmentDeadline?: string;
  fileName?: string;
  fileSize?: number;
  fileType: string;
  fileUrl?: string;
  isZipPackage?: boolean;
  isPackage?: boolean;
  hasFile?: boolean;
  externalUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  classId: string;
  className: string;
  teacherId: string;
  deadline: string;
  maxScore: number;
  attachmentUrl?: string;
  attachmentName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  classId: string;
  studentId: string;
  studentName: string;
  studentAvatar?: string;
  teacherId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  submittedAt: string;
  status: 'PENDING' | 'REVIEWED';
  grade?: number;
  feedback?: string;
  reviewedAt?: string;
}

export interface DailyGradeRecord {
  id: string;
  classId: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  date: string; // YYYY-MM-DD
  dailyGrade: number; // 0 - 20
  participationGrade: number; // 0 - 20
  assignmentGrade: number; // 0 - 20
  attendanceStatus: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  teacherNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Major {
  id: string;
  code: string;
  name: string;
  category: 'THEORETICAL' | 'VOCATIONAL' | 'TECHNICAL'; // نظری / فنی‌حرفه‌ای / کاردانش
  gradeLevels: string[]; // e.g. ['دهم', 'یازدهم', 'دوازدهم']
  description?: string;
  coursesCount?: number;
  studentsCount?: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  majorId: string; // or 'ALL' for general courses
  majorName: string;
  gradeLevel: string; // e.g. "دهم", "یازدهم", "دوازدهم"
  units: number; // e.g. 2, 3, 4
  type: 'SPECIALIZED' | 'GENERAL' | 'WORKSHOP'; // تخصصی / عمومی / کارگاهی
  passingGrade: number;
  defaultTeacherId?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface GradeAuditLog {
  id: string;
  date: string;
  teacherId?: string;
  teacherName?: string;
  changedByName?: string;
  studentId?: string;
  studentName?: string;
  fieldChanged?: string;
  action?: string;
  previousValue?: string | number | null;
  oldValue?: string | number | null;
  newValue?: string | number | null;
  reason?: string;
  timestamp: string;
}

export interface MonthlyReport {
  studentId: string;
  studentName: string;
  studentCode: string;
  gradeLevel: string;
  monthName: string;
  month?: string;
  year: number;
  dailyGradeAverage: number;
  monthlyAverage: number;
  assignmentCompletionPercentage: number;
  assignmentCompletionRate?: number;
  attendancePercentage: number;
  attendanceRate?: number;
  totalClasses: number;
  attendedClasses: number;
  totalAssignments: number;
  submittedAssignments: number;
  teacherComments: string;
  teacherNotes?: string;
  generatedDate: string;
  generatedAt?: string;
  attendanceSummary: {
    present: number;
    absent: number;
    late: number;
    total: number;
  };
  dailyGrades: DailyGradeRecord[];
}

export interface InAppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'ASSIGNMENT' | 'MATERIAL' | 'GRADE' | 'FEEDBACK' | 'SUBMISSION' | 'CONFERENCE';
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface LiveSessionState {
  classId: string;
  isActive: boolean;
  teacherId: string;
  teacherName: string;
  title: string;
  isCameraOn: boolean;
  isMicOn: boolean;
  isScreenSharing: boolean;
  startedAt?: string;
  participants: {
    userId: string;
    userName: string;
    role: UserRole;
    joinedAt: string;
    isMuted: boolean;
    hasRaisedHand: boolean;
  }[];
  messages: {
    id: string;
    senderId: string;
    senderName: string;
    role: UserRole;
    text: string;
    timestamp: string;
  }[];
}

// Configurable maximum direct peer-to-peer students for Version 1
export const MAX_DIRECT_WEBRTC_STUDENTS = 10;

export type LiveSessionStatus = 'scheduled' | 'starting' | 'live' | 'ended';

export interface LiveSessionDocument {
  sessionId: string;
  classId: string;
  teacherId: string;
  teacherName?: string;
  status: LiveSessionStatus;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isScreenSharing?: boolean;
  isCameraOn?: boolean;
  isMicOn?: boolean;
}

export interface LiveParticipant {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  joinedAt: string;
  status: 'active' | 'left';
}

export interface StudentConnectionDoc {
  studentId: string;
  studentName: string;
  offer: RTCSessionDescriptionInit | null;
  answer: RTCSessionDescriptionInit | null;
  status: 'waiting' | 'offered' | 'connected' | 'disconnected';
  createdAt: string;
  updatedAt: string;
}

export interface IceCandidateDoc {
  id: string;
  candidate: RTCIceCandidateInit;
  senderId: string;
  createdAt: string;
}

export type WebRTCConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'weak'
  | 'disconnected'
  | 'reconnecting'
  | 'failed';

