import fs from 'fs';
import path from 'path';

export interface DBData {
  users: any[];
  classes: any[];
  majors: any[];
  courses: any[];
  educationalFiles: any[];
  assignments: any[];
  submissions: any[];
  grades: any[];
  auditLogs: any[];
  notifications: any[];
  liveSessions: Record<string, any>;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

const INITIAL_DATA: DBData = {
  users: [
    {
      id: 'usr_admin_1',
      role: 'ADMIN',
      firstName: 'امیرحسین',
      lastName: 'مدیر سامانه',
      username: 'admin',
      email: 'admin@maktab.ir',
      mobile: '09123456789',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      status: 'ACTIVE',
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'usr_teacher_1',
      role: 'TEACHER',
      firstName: 'سید محمد',
      lastName: 'علوی',
      username: 'dr.alavi',
      email: 'alavi@maktab.ir',
      mobile: '09121112233',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      subject: 'ریاضیات و حسابان پیشرفته',
      status: 'ACTIVE',
      createdAt: '2026-09-01T08:30:00.000Z',
      updatedAt: '2026-09-01T08:30:00.000Z',
    },
    {
      id: 'usr_teacher_2',
      role: 'TEACHER',
      firstName: 'فاطمه',
      lastName: 'احمدی',
      username: 'mrs.ahmadi',
      email: 'ahmadi@maktab.ir',
      mobile: '09129998877',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      subject: 'فیزیک و آزمایشگاه',
      status: 'ACTIVE',
      createdAt: '2026-09-01T09:00:00.000Z',
      updatedAt: '2026-09-01T09:00:00.000Z',
    },
    {
      id: 'usr_student_1',
      role: 'STUDENT',
      firstName: 'سارا',
      lastName: 'رضایی',
      username: 'sara.rezaei',
      email: 'sara@student.ir',
      mobile: '09351112233',
      studentId: 'STU-40201',
      gradeLevel: 'پایه دوازدهم ریاضی و فیزیک',
      assignedTeacherId: 'usr_teacher_1',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      status: 'ACTIVE',
      createdAt: '2026-09-02T10:00:00.000Z',
      updatedAt: '2026-09-02T10:00:00.000Z',
    },
    {
      id: 'usr_student_2',
      role: 'STUDENT',
      firstName: 'علی',
      lastName: 'محمدی',
      username: 'ali.mohammadi',
      email: 'ali@student.ir',
      mobile: '09362223344',
      studentId: 'STU-40202',
      gradeLevel: 'پایه دوازدهم ریاضی و فیزیک',
      assignedTeacherId: 'usr_teacher_1',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      status: 'ACTIVE',
      createdAt: '2026-09-02T10:30:00.000Z',
      updatedAt: '2026-09-02T10:30:00.000Z',
    },
    {
      id: 'usr_student_3',
      role: 'STUDENT',
      firstName: 'زهرا',
      lastName: 'مرادی',
      username: 'zahra.moradi',
      email: 'zahra@student.ir',
      mobile: '09373334455',
      studentId: 'STU-40203',
      gradeLevel: 'پایه دوازدهم تجربی',
      assignedTeacherId: 'usr_teacher_2',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      status: 'ACTIVE',
      createdAt: '2026-09-02T11:00:00.000Z',
      updatedAt: '2026-09-02T11:00:00.000Z',
    },
  ],
  classes: [
    {
      id: 'cls_1',
      title: 'حسابان ۲ و دیفرانسیل پیشرفته',
      subject: 'ریاضیات تخصصی',
      teacherId: 'usr_teacher_1',
      teacherName: 'دکتر سید محمد علوی',
      studentIds: ['usr_student_1', 'usr_student_2'],
      scheduleDay: 'شنبه و دوشنبه',
      startTime: '۱۰:۰۰',
      endTime: '۱۱:۳۰',
      date: 'امروز',
      status: 'SCHEDULED',
      roomKey: 'hesaban-402',
      description: 'مباحث مشتق، قضیه رول، مقدار میانگین و رسم نمودار توابع چندجمله‌ای',
      createdAt: '2026-09-02T08:00:00.000Z',
      updatedAt: '2026-09-02T08:00:00.000Z',
    },
    {
      id: 'cls_2',
      title: 'فیزیک جامع - الکتریسیته و مغناطیس',
      subject: 'فیزیک',
      teacherId: 'usr_teacher_2',
      teacherName: 'استاد فاطمه احمدی',
      studentIds: ['usr_student_1', 'usr_student_2', 'usr_student_3'],
      scheduleDay: 'یکشنبه و چهارشنبه',
      startTime: '۱۴:۰۰',
      endTime: '۱۵:۳۰',
      date: 'فردا',
      status: 'SCHEDULED',
      roomKey: 'physics-magnet',
      description: 'بررسی مدار‌های الکتریکی، قانون اهم و میدان‌های مغناطیسی یکنواخت',
      createdAt: '2026-09-02T08:30:00.000Z',
      updatedAt: '2026-09-02T08:30:00.000Z',
    },
    {
      id: 'cls_3',
      title: 'هندسه تحلیلی و جبر برداری',
      subject: 'هندسه',
      teacherId: 'usr_teacher_1',
      teacherName: 'دکتر سید محمد علوی',
      studentIds: ['usr_student_1', 'usr_student_3'],
      scheduleDay: 'سه‌شنبه‌ها',
      startTime: '۰۸:۳۰',
      endTime: '۱۰:۰۰',
      date: 'سه‌شنبه',
      status: 'SCHEDULED',
      roomKey: 'geometry-vectors',
      description: 'ضرب خارجی بردارها و معادلات خط و صفحه در فضا',
      createdAt: '2026-09-02T09:00:00.000Z',
      updatedAt: '2026-09-02T09:00:00.000Z',
    },
  ],
  majors: [
    {
      id: 'maj_1',
      code: 'MATH-PHYS',
      name: 'ریاضی و فیزیک',
      category: 'THEORETICAL',
      gradeLevels: ['دهم', 'یازدهم', 'دوازدهم'],
      description: 'شامل ریاضیات محض، حسابان، جبر و احتمال، هندسه و فیزیک تخصصی',
      status: 'ACTIVE',
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'maj_2',
      code: 'EXP-SCI',
      name: 'علوم تجربی',
      category: 'THEORETICAL',
      gradeLevels: ['دهم', 'یازدهم', 'دوازدهم'],
      description: 'شامل زیست‌شناسی، شیمی کاربردی، فیزیک و زمین‌شناسی',
      status: 'ACTIVE',
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'maj_3',
      code: 'HUMANITIES',
      name: 'ادبیات و علوم انسانی',
      category: 'THEORETICAL',
      gradeLevels: ['دهم', 'یازدهم', 'دوازدهم'],
      description: 'شامل فلسفه، منطق، جامعه‌شناسی، تاریخ، جغرافیا و ادبیات تخصصی',
      status: 'ACTIVE',
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'maj_4',
      code: 'COMP-NETWORK',
      name: 'شبکه و نرم‌افزار رایانه (کامپیوتر)',
      category: 'TECHNICAL',
      gradeLevels: ['دهم', 'یازدهم', 'دوازدهم'],
      description: 'رشته فنی و حرفه‌ای شامل برنامه‌نویسی، پایگاه داده، شبکه و طراحی وب',
      status: 'ACTIVE',
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'maj_5',
      code: 'GRAPHIC-ART',
      name: 'گرافیک و هنرهای دیجیتال',
      category: 'VOCATIONAL',
      gradeLevels: ['دهم', 'یازدهم', 'دوازدهم'],
      description: 'طراحی دیجیتال، تصویرسازی، عکاسی و تدوین',
      status: 'ACTIVE',
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T08:00:00.000Z',
    },
  ],
  courses: [
    {
      id: 'crs_1',
      code: 'HESABAN-2',
      title: 'حسابان ۲ و دیفرانسیل پیشرفته',
      majorId: 'maj_1',
      majorName: 'ریاضی و فیزیک',
      gradeLevel: 'دوازدهم',
      units: 4,
      type: 'SPECIALIZED',
      passingGrade: 10,
      defaultTeacherId: 'usr_teacher_1',
      description: 'توابع، حد و پیوستگی، مشتق، کاربرد مشتق و رسم نمودارها',
      status: 'ACTIVE',
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'crs_2',
      code: 'PHYS-3',
      title: 'فیزیک ۳ و آزمایشگاه تخصصی',
      majorId: 'maj_1',
      majorName: 'ریاضی و فیزیک',
      gradeLevel: 'دوازدهم',
      units: 4,
      type: 'SPECIALIZED',
      passingGrade: 10,
      defaultTeacherId: 'usr_teacher_2',
      description: 'حرکت بر خط راست، دینامیک، نوسان و موج، فیزیک اتمی و هسته‌ای',
      status: 'ACTIVE',
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'crs_3',
      code: 'GEOM-3',
      title: 'هندسه ۳ و جبر خطی',
      majorId: 'maj_1',
      majorName: 'ریاضی و فیزیک',
      gradeLevel: 'دوازدهم',
      units: 3,
      type: 'SPECIALIZED',
      passingGrade: 10,
      defaultTeacherId: 'usr_teacher_1',
      description: 'ماتریس و دترمینان، مقاطع مخروطی، بردارها در فضای سه‌بعدی',
      status: 'ACTIVE',
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'crs_4',
      code: 'BIO-3',
      title: 'زیست‌شناسی ۳ تخصصی',
      majorId: 'maj_2',
      majorName: 'علوم تجربی',
      gradeLevel: 'دوازدهم',
      units: 4,
      type: 'SPECIALIZED',
      passingGrade: 10,
      defaultTeacherId: 'usr_teacher_2',
      description: 'مولکول‌های اطلاعاتی، انتقال اطلاعات در یاخته‌ها، تولید انرژی و تغییر در اطلاعات وراثتی',
      status: 'ACTIVE',
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'crs_5',
      code: 'CHEM-3',
      title: 'شیمی ۳ و آزمایشگاه',
      majorId: 'maj_2',
      majorName: 'علوم تجربی',
      gradeLevel: 'دوازدهم',
      units: 3,
      type: 'SPECIALIZED',
      passingGrade: 10,
      defaultTeacherId: 'usr_teacher_2',
      description: 'شیمی آلی، تعادل‌های شیمیایی، اسیدها و بازها، الکتروشیمی',
      status: 'ACTIVE',
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'crs_6',
      code: 'COMP-WEB',
      title: 'پیاده‌سازی سیستم‌های اطلاعاتی و طراحی وب',
      majorId: 'maj_4',
      majorName: 'شبکه و نرم‌افزار رایانه (کامپیوتر)',
      gradeLevel: 'دوازدهم',
      units: 8,
      type: 'WORKSHOP',
      passingGrade: 12,
      defaultTeacherId: 'usr_teacher_1',
      description: 'کارگاه عملی توسعه وب‌سایت، ارتباط با پایگاه داده و جاوا اسکریپت',
      status: 'ACTIVE',
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'crs_7',
      code: 'ENG-3',
      title: 'زبان انگلیسی تخصصی ۳',
      majorId: 'ALL',
      majorName: 'عمومی تمامی رشته‌ها',
      gradeLevel: 'دوازدهم',
      units: 2,
      type: 'GENERAL',
      passingGrade: 10,
      defaultTeacherId: 'usr_teacher_1',
      description: 'مهارت‌های درک مطلب، واژگان تخصصی، لیسنینگ و نگارش',
      status: 'ACTIVE',
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'crs_8',
      code: 'PERS-3',
      title: 'فارسی و نگارش تخصصی ۳',
      majorId: 'ALL',
      majorName: 'عمومی تمامی رشته‌ها',
      gradeLevel: 'دوازدهم',
      units: 2,
      type: 'GENERAL',
      passingGrade: 10,
      defaultTeacherId: 'usr_teacher_1',
      description: 'متون کهن و معاصر، قواعد دستوری، آرایه‌های ادبی و مقاله‌نویسی',
      status: 'ACTIVE',
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T08:00:00.000Z',
    },
  ],
  educationalFiles: [
    {
      id: 'file_1',
      title: 'پکیج آموزشی جامع فصل مشتق و کاربردها (فایل‌های تدریس و تست)',
      description: 'شامل اسلایدهای پاورپوینت، فایل PDF تدریس و ویدیو حل مسائل برگزیده آزمون‌های سراسری',
      classId: 'cls_1',
      className: 'حسابان ۲ و دیفرانسیل پیشرفته',
      teacherId: 'usr_teacher_1',
      teacherName: 'دکتر سید محمد علوی',
      date: '۱۴۰۵/۰۶/۱۵',
      relatedLesson: 'فصل ۳: مشتق توابع کسری و رادیکالی',
      assignmentDeadline: '۱۴۰۵/۰۶/۲۵',
      fileName: 'Hesaban_Derivatives_Pack_Complete.zip',
      fileSize: 18450000,
      fileType: 'application/zip',
      fileUrl: '/api/files/download/sample-zip',
      isZipPackage: true,
      createdAt: '2026-09-03T12:00:00.000Z',
      updatedAt: '2026-09-03T12:00:00.000Z',
    },
    {
      id: 'file_2',
      title: 'خلاصه نکات کلیدی مغناطیس و القای الکترومغناطیسی',
      description: 'فرمول‌نامه کامل و دسته‌بندی مسائل تیپ‌بندی شده برای کنکور',
      classId: 'cls_2',
      className: 'فیزیک جامع - الکتریسیته و مغناطیس',
      teacherId: 'usr_teacher_2',
      teacherName: 'استاد فاطمه احمدی',
      date: '۱۴۰۵/۰۶/۱۴',
      relatedLesson: 'فصل ۴ فیزیک ۳',
      assignmentDeadline: '۱۴۰۵/۰۶/۲۲',
      fileName: 'Physics_Electromagnetism_Summary.pdf',
      fileSize: 4200000,
      fileType: 'application/pdf',
      fileUrl: '/api/files/download/sample-pdf',
      isZipPackage: false,
      createdAt: '2026-09-03T14:30:00.000Z',
      updatedAt: '2026-09-03T14:30:00.000Z',
    },
  ],
  assignments: [
    {
      id: 'asg_1',
      title: 'تکلیف شماره ۴: بررسی نقاط عطف و اکسترمم‌های نسبی',
      description: 'حل تمرین‌های انتهای فصل صفحه ۸۵ تا ۹۰ کتاب درسی به همراه رسم نمودارهای مشتق اول و دوم',
      classId: 'cls_1',
      className: 'حسابان ۲ و دیفرانسیل پیشرفته',
      teacherId: 'usr_teacher_1',
      deadline: '۱۴۰۵/۰۶/۲۰',
      maxScore: 20,
      attachmentName: 'Assignment_4_Derivatives.pdf',
      attachmentUrl: '/api/files/download/sample-assignment',
      createdAt: '2026-09-03T10:00:00.000Z',
      updatedAt: '2026-09-03T10:00:00.000Z',
    },
    {
      id: 'asg_2',
      title: 'گزارش کار آزمایشگاه: قانون لنز و میدان سیم‌لوله',
      description: 'ارائه تحلیل داده‌های ثبت شده در شبیه‌ساز و رسم خطوط شار مغناطیسی',
      classId: 'cls_2',
      className: 'فیزیک جامع - الکتریسیته و مغناطیس',
      teacherId: 'usr_teacher_2',
      deadline: '۱۴۰۵/۰۶/۲۲',
      maxScore: 20,
      attachmentName: 'Physics_Lab_Worksheet.pdf',
      attachmentUrl: '/api/files/download/sample-assignment-physics',
      createdAt: '2026-09-04T09:00:00.000Z',
      updatedAt: '2026-09-04T09:00:00.000Z',
    },
  ],
  submissions: [
    {
      id: 'sub_1',
      assignmentId: 'asg_1',
      assignmentTitle: 'تکلیف شماره ۴: بررسی نقاط عطف و اکسترمم‌های نسبی',
      classId: 'cls_1',
      studentId: 'usr_student_1',
      studentName: 'سارا رضایی',
      studentAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      teacherId: 'usr_teacher_1',
      fileName: 'Sara_Rezaei_Assignment4_Completed.zip',
      fileUrl: '/api/files/download/sample-submission',
      fileSize: 8400000,
      submittedAt: '2026-09-04T18:45:00.000Z',
      status: 'REVIEWED',
      grade: 19.5,
      feedback: 'پاسخ‌ها بسیار دقیق و تحلیل نقاط عطف عالی بود. تنها در سوال ۳ علامت مشتق دوم باید بررسی مضاعف شود.',
      reviewedAt: '2026-09-05T10:15:00.000Z',
    },
    {
      id: 'sub_2',
      assignmentId: 'asg_1',
      assignmentTitle: 'تکلیف شماره ۴: بررسی نقاط عطف و اکسترمم‌های نسبی',
      classId: 'cls_1',
      studentId: 'usr_student_2',
      studentName: 'علی محمدی',
      studentAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      teacherId: 'usr_teacher_1',
      fileName: 'Ali_Mohammadi_Homework4.pdf',
      fileUrl: '/api/files/download/sample-submission-2',
      fileSize: 3100000,
      submittedAt: '2026-09-05T16:20:00.000Z',
      status: 'PENDING',
      grade: undefined,
      feedback: undefined,
      reviewedAt: undefined,
    },
  ],
  grades: [
    {
      id: 'grd_1',
      classId: 'cls_1',
      studentId: 'usr_student_1',
      studentName: 'سارا رضایی',
      teacherId: 'usr_teacher_1',
      date: '1405-06-15',
      dailyGrade: 19.5,
      participationGrade: 20,
      assignmentGrade: 19.5,
      attendanceStatus: 'PRESENT',
      teacherNotes: 'حضور به موقع و مشارکت فعال در اثبات قضایا',
      createdAt: '2026-09-05T11:00:00.000Z',
      updatedAt: '2026-09-05T11:00:00.000Z',
    },
    {
      id: 'grd_2',
      classId: 'cls_1',
      studentId: 'usr_student_2',
      studentName: 'علی محمدی',
      teacherId: 'usr_teacher_1',
      date: '1405-06-15',
      dailyGrade: 17.5,
      participationGrade: 18,
      assignmentGrade: 17,
      attendanceStatus: 'PRESENT',
      teacherNotes: 'نیاز به تمرین بیشتر در ساده‌سازی عبارات جبری',
      createdAt: '2026-09-05T11:05:00.000Z',
      updatedAt: '2026-09-05T11:05:00.000Z',
    },
    {
      id: 'grd_3',
      classId: 'cls_1',
      studentId: 'usr_student_1',
      studentName: 'سارا رضایی',
      teacherId: 'usr_teacher_1',
      date: '1405-06-12',
      dailyGrade: 20,
      participationGrade: 20,
      assignmentGrade: 20,
      attendanceStatus: 'PRESENT',
      teacherNotes: 'تسلط فوق‌العاده بر مباحث تدریس شده',
      createdAt: '2026-09-02T11:00:00.000Z',
      updatedAt: '2026-09-02T11:00:00.000Z',
    },
    {
      id: 'grd_4',
      classId: 'cls_1',
      studentId: 'usr_student_2',
      studentName: 'علی محمدی',
      teacherId: 'usr_teacher_1',
      date: '1405-06-12',
      dailyGrade: 18,
      participationGrade: 17,
      assignmentGrade: 18.5,
      attendanceStatus: 'LATE',
      teacherNotes: 'با ۵ دقیقه تاخیر وارد کلاس شد',
      createdAt: '2026-09-02T11:05:00.000Z',
      updatedAt: '2026-09-02T11:05:00.000Z',
    },
  ],
  auditLogs: [
    {
      id: 'log_1',
      date: '۱۴۰۵/۰۶/۱۵',
      teacherId: 'usr_teacher_1',
      teacherName: 'دکتر سید محمد علوی',
      studentId: 'usr_student_1',
      studentName: 'سارا رضایی',
      fieldChanged: 'نمره کلاسی',
      previousValue: 19,
      newValue: 19.5,
      timestamp: '2026-09-05T11:02:00.000Z',
    },
    {
      id: 'log_2',
      date: '۱۴۰۵/۰۶/۱۴',
      teacherId: 'usr_admin_1',
      teacherName: 'امیرحسین مدیر سامانه',
      studentId: 'usr_student_3',
      studentName: 'زهرا مرادی',
      fieldChanged: 'تخصیص به کلاس فیزیک جامع',
      previousValue: 'غیرعضو',
      newValue: 'ثبت‌نام شده',
      timestamp: '2026-09-04T09:30:00.000Z',
    },
  ],
  notifications: [
    {
      id: 'notif_1',
      userId: 'usr_student_1',
      title: 'تکلیف جدید ثبت شد',
      message: 'استاد دکتر علوی تکلیف شماره ۴ حسابان را بارگذاری نمودند.',
      type: 'ASSIGNMENT',
      read: false,
      createdAt: '2026-09-05T09:00:00.000Z',
      link: '/assignments',
    },
    {
      id: 'notif_2',
      userId: 'usr_student_1',
      title: 'ثبت نمره و بازخورد استاد',
      message: 'نمره تکلیف ۴ شما توسط استاد علوی ثبت شد: ۱۹.۵ از ۲۰',
      type: 'GRADE',
      read: false,
      createdAt: '2026-09-05T10:20:00.000Z',
      link: '/grades',
    },
    {
      id: 'notif_3',
      userId: 'usr_teacher_1',
      title: 'ارسال پاسخ تکلیف توسط دانش‌آموز',
      message: 'سارا رضایی فایل تکلیف شماره ۴ را ارسال کرد.',
      type: 'SUBMISSION',
      read: false,
      createdAt: '2026-09-04T18:46:00.000Z',
      link: '/submissions',
    },
    {
      id: 'notif_4',
      userId: 'usr_student_1',
      title: 'پکیج آموزشی جدید در دسترس است',
      message: 'پکیج آموزشی جامع فصل مشتق (فایل ZIP) بارگذاری گردید.',
      type: 'MATERIAL',
      read: true,
      createdAt: '2026-09-03T12:05:00.000Z',
      link: '/materials',
    },
  ],
  liveSessions: {
    cls_1: {
      classId: 'cls_1',
      isActive: false,
      teacherId: 'usr_teacher_1',
      teacherName: 'دکتر سید محمد علوی',
      title: 'حسابان ۲ و دیفرانسیل پیشرفته',
      isCameraOn: true,
      isMicOn: true,
      isScreenSharing: false,
      startedAt: undefined,
      participants: [
        {
          userId: 'usr_teacher_1',
          userName: 'دکتر سید محمد علوی',
          role: 'TEACHER',
          joinedAt: '2026-09-06T10:00:00.000Z',
          isMuted: false,
          hasRaisedHand: false,
        },
      ],
      messages: [
        {
          id: 'msg_1',
          senderId: 'usr_teacher_1',
          senderName: 'دکتر علوی',
          role: 'TEACHER',
          text: 'سلام به همه دانش‌آموزان عزیز. لطفا صدا و تصویر را چک کنید.',
          timestamp: '۱۰:۰۲',
        },
      ],
    },
  },
};

class DBManager {
  private data: DBData;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DBData {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_PATH)) {
        const fileContent = fs.readFileSync(DB_PATH, 'utf-8');
        const parsed = JSON.parse(fileContent);
        if (!parsed.majors || !Array.isArray(parsed.majors) || parsed.majors.length === 0) {
          parsed.majors = INITIAL_DATA.majors;
        }
        if (!parsed.courses || !Array.isArray(parsed.courses) || parsed.courses.length === 0) {
          parsed.courses = INITIAL_DATA.courses;
        }
        if (!parsed.auditLogs || !Array.isArray(parsed.auditLogs)) {
          parsed.auditLogs = INITIAL_DATA.auditLogs;
        }
        return parsed;
      } else {
        this.saveData(INITIAL_DATA);
        return JSON.parse(JSON.stringify(INITIAL_DATA));
      }
    } catch (err) {
      console.warn('Could not read persistent DB, using in-memory data:', err);
      return JSON.parse(JSON.stringify(INITIAL_DATA));
    }
  }

  public saveData(dataToSave?: DBData): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const data = dataToSave || this.data;
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Could not write to persistent DB:', err);
    }
  }

  public get(): DBData {
    return this.data;
  }

  public update(updater: (data: DBData) => void): DBData {
    updater(this.data);
    this.saveData();
    return this.data;
  }
}

export const dbManager = new DBManager();
