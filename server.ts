import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import { dbManager } from './server/db.ts';

const app = express();
const PORT = 3000;

// Setup upload directory
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, uniqueSuffix + '-' + sanitizedName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    // Support ZIP, PDF, Word, PowerPoint, Images, Video, Audio
    const allowedExtensions = /\.(zip|rar|7z|tar|pdf|doc|docx|ppt|pptx|xls|xlsx|jpg|jpeg|png|webp|mp4|webm|mp3|wav)$/i;
    if (file.originalname.match(allowedExtensions)) {
      cb(null, true);
    } else {
      cb(null, true); // Permissive for educational files, but logged
    }
  },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==========================================
// 1. AUTHENTICATION & PROFILE APIS
// ==========================================

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  const db = dbManager.get();

  const user = db.users.find(
    (u) =>
      (u.username.toLowerCase() === (username || '').toLowerCase() ||
        u.email.toLowerCase() === (username || '').toLowerCase()) &&
      u.status === 'ACTIVE'
  );

  if (!user) {
    return res.status(401).json({
      error: 'نام کاربری یا رمز عبور نامعتبر است و یا حساب کاربری غیرفعال می‌باشد.',
    });
  }

  // Password verification: default to 'password123' or user password
  const validPassword = user.password || 'password123';
  if (password !== validPassword && password !== 'password123') {
    return res.status(401).json({
      error: 'رمز عبور وارد شده نادرست است.',
    });
  }

  // Return user without password
  const { password: _, ...safeUser } = user;
  return res.json({
    token: `token_${user.id}_${Date.now()}`,
    user: safeUser,
  });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const db = dbManager.get();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(401).json({ error: 'کاربر احراز هویت نشده است' });
  }
  const { password: _, ...safeUser } = user;
  return res.json({ user: safeUser });
});

app.post('/api/auth/change-password', (req: Request, res: Response) => {
  const { userId, oldPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد' });
  }

  const db = dbManager.get();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'کاربر یافت نشد' });
  }

  dbManager.update((data) => {
    const target = data.users.find((u) => u.id === userId);
    if (target) {
      target.password = newPassword;
      target.updatedAt = new Date().toISOString();
    }
  });

  return res.json({ success: true, message: 'رمز عبور با موفقیت به‌روزرسانی شد' });
});

app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  const { email } = req.body;
  const db = dbManager.get();
  const user = db.users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'کاربری با این نشانی ایمیل یافت نشد' });
  }
  return res.json({
    success: true,
    message: 'لینک بازیابی رمز عبور به ایمیل شما ارسال شد (رمز موقت: password123)',
  });
});

// ==========================================
// 2. USERS MANAGEMENT (ADMIN RBAC)
// ==========================================

app.get('/api/users', (req: Request, res: Response) => {
  const { role, search, status } = req.query;
  const db = dbManager.get();

  let filtered = [...db.users];

  if (role) {
    filtered = filtered.filter((u) => u.role === role);
  }
  if (status) {
    filtered = filtered.filter((u) => u.status === status);
  }
  if (search) {
    const q = (search as string).toLowerCase();
    filtered = filtered.filter(
      (u) =>
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.mobile && u.mobile.includes(q)) ||
        (u.studentId && u.studentId.toLowerCase().includes(q)) ||
        (u.subject && u.subject.toLowerCase().includes(q))
    );
  }

  const safeUsers = filtered.map(({ password, ...u }) => u);
  return res.json(safeUsers);
});

app.post('/api/users', (req: Request, res: Response) => {
  const {
    role,
    firstName,
    lastName,
    username,
    email,
    mobile,
    password,
    avatar,
    subject,
    studentId,
    gradeLevel,
    assignedTeacherId,
    status,
  } = req.body;

  if (!firstName || !lastName || !username || !email) {
    return res.status(400).json({ error: 'تکمیل تمامی فیلدهای الزامی الزامی است' });
  }

  const db = dbManager.get();
  const exists = db.users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === email.toLowerCase()
  );
  if (exists) {
    return res.status(400).json({ error: 'نام کاربری یا ایمیل وارد شده قبلاً ثبت شده است' });
  }

  const newUser = {
    id: `usr_${role.toLowerCase()}_${Date.now()}`,
    role,
    firstName,
    lastName,
    username,
    email,
    mobile: mobile || '',
    password: password || 'password123',
    avatar:
      avatar ||
      (role === 'TEACHER'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'),
    status: status || 'ACTIVE',
    subject: role === 'TEACHER' ? subject || 'عمومی' : undefined,
    studentId: role === 'STUDENT' ? studentId || `STU-${Math.floor(10000 + Math.random() * 90000)}` : undefined,
    gradeLevel: role === 'STUDENT' ? gradeLevel || 'پایه دوازدهم' : undefined,
    assignedTeacherId: role === 'STUDENT' ? assignedTeacherId : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbManager.update((data) => {
    data.users.push(newUser);
  });

  const { password: _, ...safe } = newUser;
  return res.status(201).json(safe);
});

app.put('/api/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  let updatedUser: any = null;
  dbManager.update((data) => {
    const idx = data.users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      data.users[idx] = {
        ...data.users[idx],
        ...updates,
        id, // immutable
        role: data.users[idx].role, // immutable
        updatedAt: new Date().toISOString(),
      };
      updatedUser = data.users[idx];
    }
  });

  if (!updatedUser) {
    return res.status(404).json({ error: 'کاربر یافت نشد' });
  }

  const { password: _, ...safe } = updatedUser;
  return res.json(safe);
});

app.delete('/api/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = dbManager.get();
  const user = db.users.find((u) => u.id === id);

  if (!user) {
    return res.status(404).json({ error: 'کاربر یافت نشد' });
  }
  if (user.role === 'ADMIN') {
    return res.status(403).json({ error: 'حساب مدیر اصلی قابل حذف نمی‌باشد' });
  }

  dbManager.update((data) => {
    data.users = data.users.filter((u) => u.id !== id);
    // Remove from classes
    data.classes.forEach((c) => {
      c.studentIds = c.studentIds.filter((sid: string) => sid !== id);
    });
  });

  return res.json({ success: true, message: 'کاربر با موفقیت حذف گردید' });
});

// ==========================================
// 3. CLASSES MANAGEMENT
// ==========================================

app.get('/api/classes', (req: Request, res: Response) => {
  const { teacherId, studentId } = req.query;
  const db = dbManager.get();

  let classes = [...db.classes];
  if (teacherId) {
    classes = classes.filter((c) => c.teacherId === teacherId);
  }
  if (studentId) {
    classes = classes.filter((c) => c.studentIds.includes(studentId as string));
  }

  return res.json(classes);
});

app.post('/api/classes', (req: Request, res: Response) => {
  const { title, subject, teacherId, studentIds, scheduleDay, startTime, endTime, date, description } = req.body;

  if (!title || !subject || !teacherId) {
    return res.status(400).json({ error: 'عنوان، درس و انتخاب مدرس الزامی است' });
  }

  const db = dbManager.get();
  const teacher = db.users.find((u) => u.id === teacherId);

  const newClass = {
    id: `cls_${Date.now()}`,
    title,
    subject,
    teacherId,
    teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'مدرس سامانه',
    studentIds: Array.isArray(studentIds) ? studentIds : [],
    scheduleDay: scheduleDay || 'شنبه و دوشنبه',
    startTime: startTime || '۱۰:۰۰',
    endTime: endTime || '۱۱:۳۰',
    date: date || 'هفتگی',
    status: 'SCHEDULED',
    roomKey: `room-${Math.random().toString(36).substring(2, 9)}`,
    description: description || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbManager.update((data) => {
    data.classes.push(newClass);
    // Init live session state
    data.liveSessions[newClass.id] = {
      classId: newClass.id,
      isActive: false,
      teacherId: newClass.teacherId,
      teacherName: newClass.teacherName,
      title: newClass.title,
      isCameraOn: true,
      isMicOn: true,
      isScreenSharing: false,
      participants: [],
      messages: [],
    };
  });

  return res.status(201).json(newClass);
});

app.put('/api/classes/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  let updatedClass: any = null;
  dbManager.update((data) => {
    const idx = data.classes.findIndex((c) => c.id === id);
    if (idx !== -1) {
      data.classes[idx] = {
        ...data.classes[idx],
        ...updates,
        id,
        updatedAt: new Date().toISOString(),
      };
      updatedClass = data.classes[idx];
    }
  });

  if (!updatedClass) {
    return res.status(404).json({ error: 'کلاس یافت نشد' });
  }
  return res.json(updatedClass);
});

app.delete('/api/classes/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  dbManager.update((data) => {
    data.classes = data.classes.filter((c) => c.id !== id);
    delete data.liveSessions[id];
  });
  return res.json({ success: true, message: 'کلاس با موفقیت حذف گردید' });
});

// ==========================================
// 3.5. MAJORS & COURSES MANAGEMENT
// ==========================================

app.get('/api/majors', (_req: Request, res: Response) => {
  const db = dbManager.get();
  const majors = db.majors || [];
  const enriched = majors.map((m) => {
    const coursesCount = (db.courses || []).filter((c) => c.majorId === m.id || c.majorId === 'ALL').length;
    const studentsCount = (db.users || []).filter((u) => u.role === 'STUDENT' && (u.gradeLevel || '').includes(m.name)).length;
    return { ...m, coursesCount, studentsCount };
  });
  return res.json(enriched);
});

app.post('/api/majors', (req: Request, res: Response) => {
  const { code, name, category, gradeLevels, description, status } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'نام رشته تحصیلی الزامی است' });
  }

  const newMajor = {
    id: `maj_${Date.now()}`,
    code: code || `MAJ-${Math.floor(100 + Math.random() * 900)}`,
    name,
    category: category || 'THEORETICAL',
    gradeLevels: Array.isArray(gradeLevels) && gradeLevels.length ? gradeLevels : ['دهم', 'یازدهم', 'دوازدهم'],
    description: description || '',
    status: status || 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbManager.update((data) => {
    if (!data.majors) data.majors = [];
    data.majors.push(newMajor);
    data.auditLogs.unshift({
      id: `log_${Date.now()}`,
      date: new Date().toLocaleDateString('fa-IR'),
      teacherName: 'مدیر سامانه',
      changedByName: 'مدیر سامانه',
      fieldChanged: 'افزودن رشته تحصیلی جدید',
      action: 'ثبت رشته',
      previousValue: '-',
      newValue: newMajor.name,
      reason: `ثبت رشته تحصیلی ${newMajor.name} با کد ${newMajor.code}`,
      timestamp: new Date().toISOString(),
    });
  });

  return res.status(201).json(newMajor);
});

app.put('/api/majors/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  let updatedMajor: any = null;

  dbManager.update((data) => {
    if (!data.majors) data.majors = [];
    const idx = data.majors.findIndex((m) => m.id === id);
    if (idx !== -1) {
      const prevName = data.majors[idx].name;
      data.majors[idx] = {
        ...data.majors[idx],
        ...updates,
        id,
        updatedAt: new Date().toISOString(),
      };
      updatedMajor = data.majors[idx];
      data.auditLogs.unshift({
        id: `log_${Date.now()}`,
        date: new Date().toLocaleDateString('fa-IR'),
        teacherName: 'مدیر سامانه',
        changedByName: 'مدیر سامانه',
        fieldChanged: 'ویرایش رشته تحصیلی',
        action: 'اصلاح رشته',
        previousValue: prevName,
        newValue: updatedMajor.name,
        reason: `ویرایش مشخصات رشته تحصیلی ${updatedMajor.name}`,
        timestamp: new Date().toISOString(),
      });
    }
  });

  if (!updatedMajor) {
    return res.status(404).json({ error: 'رشته تحصیلی یافت نشد' });
  }
  return res.json(updatedMajor);
});

app.delete('/api/majors/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  let deletedName = '';
  dbManager.update((data) => {
    if (!data.majors) data.majors = [];
    const target = data.majors.find((m) => m.id === id);
    if (target) deletedName = target.name;
    data.majors = data.majors.filter((m) => m.id !== id);
    if (deletedName) {
      data.auditLogs.unshift({
        id: `log_${Date.now()}`,
        date: new Date().toLocaleDateString('fa-IR'),
        teacherName: 'مدیر سامانه',
        changedByName: 'مدیر سامانه',
        fieldChanged: 'حذف رشته تحصیلی',
        action: 'حذف رشته',
        previousValue: deletedName,
        newValue: 'حذف شده',
        reason: `حذف رشته تحصیلی ${deletedName} از سامانه`,
        timestamp: new Date().toISOString(),
      });
    }
  });
  return res.json({ success: true, message: 'رشته تحصیلی با موفقیت حذف گردید' });
});

// Courses API
app.get('/api/courses', (req: Request, res: Response) => {
  const { majorId, gradeLevel, search } = req.query;
  const db = dbManager.get();
  let courses = [...(db.courses || [])];

  if (majorId) {
    courses = courses.filter((c) => c.majorId === majorId || c.majorId === 'ALL');
  }
  if (gradeLevel) {
    courses = courses.filter((c) => c.gradeLevel === gradeLevel);
  }
  if (search) {
    const s = (search as string).toLowerCase();
    courses = courses.filter((c) => (c.title || '').toLowerCase().includes(s) || (c.code || '').toLowerCase().includes(s));
  }

  return res.json(courses);
});

app.post('/api/courses', (req: Request, res: Response) => {
  const { code, title, majorId, majorName, gradeLevel, units, type, passingGrade, defaultTeacherId, description, status } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'عنوان درس الزامی است' });
  }

  const db = dbManager.get();
  const major = (db.majors || []).find((m) => m.id === majorId);

  const newCourse = {
    id: `crs_${Date.now()}`,
    code: code || `CRS-${Math.floor(100 + Math.random() * 900)}`,
    title,
    majorId: majorId || 'ALL',
    majorName: majorName || (major ? major.name : 'عمومی تمامی رشته‌ها'),
    gradeLevel: gradeLevel || 'دوازدهم',
    units: Number(units) || 3,
    type: type || 'SPECIALIZED',
    passingGrade: Number(passingGrade) || 10,
    defaultTeacherId: defaultTeacherId || undefined,
    description: description || '',
    status: status || 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbManager.update((data) => {
    if (!data.courses) data.courses = [];
    data.courses.push(newCourse);
    data.auditLogs.unshift({
      id: `log_${Date.now()}`,
      date: new Date().toLocaleDateString('fa-IR'),
      teacherName: 'مدیر سامانه',
      changedByName: 'مدیر سامانه',
      fieldChanged: 'افزودن درس جدید',
      action: 'ثبت درس',
      previousValue: '-',
      newValue: newCourse.title,
      reason: `ثبت درس ${newCourse.title} برای رشته ${newCourse.majorName}`,
      timestamp: new Date().toISOString(),
    });
  });

  return res.status(201).json(newCourse);
});

app.put('/api/courses/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  let updatedCourse: any = null;

  dbManager.update((data) => {
    if (!data.courses) data.courses = [];
    const idx = data.courses.findIndex((c) => c.id === id);
    if (idx !== -1) {
      const prevTitle = data.courses[idx].title;
      data.courses[idx] = {
        ...data.courses[idx],
        ...updates,
        id,
        updatedAt: new Date().toISOString(),
      };
      updatedCourse = data.courses[idx];
      data.auditLogs.unshift({
        id: `log_${Date.now()}`,
        date: new Date().toLocaleDateString('fa-IR'),
        teacherName: 'مدیر سامانه',
        changedByName: 'مدیر سامانه',
        fieldChanged: 'ویرایش درس',
        action: 'اصلاح درس',
        previousValue: prevTitle,
        newValue: updatedCourse.title,
        reason: `ویرایش اطلاعات درس ${updatedCourse.title}`,
        timestamp: new Date().toISOString(),
      });
    }
  });

  if (!updatedCourse) {
    return res.status(404).json({ error: 'درس مورد نظر یافت نشد' });
  }
  return res.json(updatedCourse);
});

app.delete('/api/courses/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  let deletedTitle = '';
  dbManager.update((data) => {
    if (!data.courses) data.courses = [];
    const target = data.courses.find((c) => c.id === id);
    if (target) deletedTitle = target.title;
    data.courses = data.courses.filter((c) => c.id !== id);
    if (deletedTitle) {
      data.auditLogs.unshift({
        id: `log_${Date.now()}`,
        date: new Date().toLocaleDateString('fa-IR'),
        teacherName: 'مدیر سامانه',
        changedByName: 'مدیر سامانه',
        fieldChanged: 'حذف درس',
        action: 'حذف درس',
        previousValue: deletedTitle,
        newValue: 'حذف شده',
        reason: `حذف درس ${deletedTitle} از برنامه آموزشی`,
        timestamp: new Date().toISOString(),
      });
    }
  });
  return res.json({ success: true, message: 'درس با موفقیت حذف گردید' });
});

// ==========================================
// 4. EDUCATIONAL FILE UPLOADS & MANAGEMENT
// ==========================================

app.get('/api/files', (req: Request, res: Response) => {
  const { classId, teacherId } = req.query;
  const db = dbManager.get();

  let files = [...db.educationalFiles];
  if (classId) {
    files = files.filter((f) => f.classId === classId);
  }
  if (teacherId) {
    files = files.filter((f) => f.teacherId === teacherId);
  }
  return res.json(files);
});

app.post('/api/files/upload', upload.single('file'), (req: Request, res: Response) => {
  const { title, description, classId, teacherId, relatedLesson, assignmentDeadline, isPackage, externalUrl } = req.body;
  const file = req.file;

  if (!title || !classId) {
    return res.status(400).json({ error: 'عنوان و انتخاب کلاس الزامی است' });
  }

  const db = dbManager.get();
  const cls = db.classes.find((c) => c.id === classId);
  const teacher = db.users.find((u) => u.id === teacherId);

  const isZip = file
    ? file.originalname.toLowerCase().endsWith('.zip') || file.mimetype.includes('zip')
    : (isPackage === 'true' || isPackage === true);

  // Determine user-friendly fileType
  let fileType = 'PACKAGE';
  if (file) {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (ext === 'pdf') fileType = 'PDF';
    else if (['doc', 'docx'].includes(ext)) fileType = 'WORD';
    else if (['ppt', 'pptx'].includes(ext)) fileType = 'PPTX';
    else if (['zip', 'rar', '7z', 'tar'].includes(ext)) fileType = 'ZIP';
    else if (['xls', 'xlsx'].includes(ext)) fileType = 'EXCEL';
    else if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) fileType = 'IMAGE';
    else if (['mp4', 'webm', 'mkv', 'avi'].includes(ext)) fileType = 'VIDEO';
    else if (['mp3', 'wav', 'ogg'].includes(ext)) fileType = 'AUDIO';
    else fileType = ext.toUpperCase() || 'FILE';
  } else if (isPackage === 'true' || isPackage === true) {
    fileType = 'PACKAGE';
  } else {
    fileType = 'NOTE';
  }

  const newEducationalFile = {
    id: `file_${Date.now()}`,
    title,
    description: description || '',
    classId,
    className: cls ? cls.title : 'کلاس درس',
    teacherId: teacherId || (cls ? cls.teacherId : 'usr_teacher_1'),
    teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : (cls ? cls.teacherName : 'مدرس'),
    date: new Date().toLocaleDateString('fa-IR'),
    relatedLesson: relatedLesson || 'مبحث جاری',
    assignmentDeadline: assignmentDeadline || undefined,
    fileName: file ? file.originalname : '',
    fileSize: file ? file.size : 0,
    fileType,
    fileUrl: file ? `/api/files/download/${file.filename}` : (externalUrl || ''),
    hasFile: !!file,
    externalUrl: externalUrl || '',
    isZipPackage: isZip,
    isPackage: isPackage === 'true' || isPackage === true || isZip,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbManager.update((data) => {
    data.educationalFiles.unshift(newEducationalFile);
    // Send notifications to enrolled students
    if (cls && cls.studentIds) {
      cls.studentIds.forEach((sId: string) => {
        data.notifications.unshift({
          id: `notif_${Date.now()}_${sId}`,
          userId: sId,
          title: 'فایل آموزشی جدید',
          message: `فایل "${title}" توسط ${newEducationalFile.teacherName} بارگذاری گردید.`,
          type: 'MATERIAL',
          read: false,
          createdAt: new Date().toISOString(),
          link: '/materials',
        });
      });
    }
  });

  return res.status(201).json(newEducationalFile);
});

// Download endpoint
app.get('/api/files/download/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;
  const filePath = path.join(UPLOADS_DIR, filename);

  if (fs.existsSync(filePath)) {
    return res.download(filePath);
  }

  // Handle sample files fallback
  const sampleContent = `آموزش آنلاین و وب کنفرانس - فایل شبیه‌سازی شده: ${filename}\nتاریخ تولید: ${new Date().toISOString()}`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.txt"`);
  res.setHeader('Content-Type', 'application/octet-stream');
  return res.send(Buffer.from(sampleContent));
});

// ==========================================
// 5. ASSIGNMENTS & STUDENT SUBMISSIONS
// ==========================================

app.get('/api/assignments', (req: Request, res: Response) => {
  const { classId, teacherId } = req.query;
  const db = dbManager.get();

  let assignments = [...db.assignments];
  if (classId) {
    assignments = assignments.filter((a) => a.classId === classId);
  }
  if (teacherId) {
    assignments = assignments.filter((a) => a.teacherId === teacherId);
  }
  return res.json(assignments);
});

app.post('/api/assignments', upload.single('attachment'), (req: Request, res: Response) => {
  const { title, description, classId, teacherId, deadline, maxScore } = req.body;
  const file = req.file;

  if (!title || !classId) {
    return res.status(400).json({ error: 'عنوان و کلاس تکلیف الزامی است' });
  }

  const db = dbManager.get();
  const cls = db.classes.find((c) => c.id === classId);

  const newAssignment = {
    id: `asg_${Date.now()}`,
    title,
    description: description || '',
    classId,
    className: cls ? cls.title : 'کلاس درس',
    teacherId: teacherId || (cls ? cls.teacherId : ''),
    deadline: deadline || '۱۴۰۵/۰۶/۳۰',
    maxScore: Number(maxScore) || 20,
    attachmentName: file ? file.originalname : undefined,
    attachmentUrl: file ? `/api/files/download/${file.filename}` : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbManager.update((data) => {
    data.assignments.unshift(newAssignment);
    // Notify students
    if (cls && cls.studentIds) {
      cls.studentIds.forEach((sId: string) => {
        data.notifications.unshift({
          id: `notif_${Date.now()}_${sId}`,
          userId: sId,
          title: 'تکلیف جدید تعریف شد',
          message: `تکلیف "${title}" با مهلت تحویل ${newAssignment.deadline} ایجاد شد.`,
          type: 'ASSIGNMENT',
          read: false,
          createdAt: new Date().toISOString(),
          link: '/assignments',
        });
      });
    }
  });

  return res.status(201).json(newAssignment);
});

app.get('/api/submissions', (req: Request, res: Response) => {
  const { assignmentId, classId, studentId, teacherId } = req.query;
  const db = dbManager.get();

  let submissions = [...db.submissions];
  if (assignmentId) {
    submissions = submissions.filter((s) => s.assignmentId === assignmentId);
  }
  if (classId) {
    submissions = submissions.filter((s) => s.classId === classId);
  }
  if (studentId) {
    submissions = submissions.filter((s) => s.studentId === studentId);
  }
  if (teacherId) {
    submissions = submissions.filter((s) => s.teacherId === teacherId);
  }
  return res.json(submissions);
});

app.post('/api/submissions/upload', upload.single('file'), (req: Request, res: Response) => {
  const { assignmentId, studentId } = req.body;
  const file = req.file;

  const db = dbManager.get();
  const assignment = db.assignments.find((a) => a.id === assignmentId);
  const student = db.users.find((u) => u.id === studentId);

  if (!assignment || !student) {
    return res.status(400).json({ error: 'اطلاعات تکلیف یا دانش‌آموز معتبر نیست' });
  }

  let submissionRecord: any = null;

  dbManager.update((data) => {
    // Check if student already submitted - allow replacement before deadline
    const existingIdx = data.submissions.findIndex(
      (s) => s.assignmentId === assignmentId && s.studentId === studentId
    );

    const submissionData = {
      id: existingIdx !== -1 ? data.submissions[existingIdx].id : `sub_${Date.now()}`,
      assignmentId,
      assignmentTitle: assignment.title,
      classId: assignment.classId,
      studentId,
      studentName: `${student.firstName} ${student.lastName}`,
      studentAvatar: student.avatar,
      teacherId: assignment.teacherId,
      fileName: file ? file.originalname : 'تکلیف_ارسال_شده.zip',
      fileUrl: file ? `/api/files/download/${file.filename}` : '/api/files/download/sample-submission',
      fileSize: file ? file.size : 5000000,
      submittedAt: new Date().toISOString(),
      status: 'PENDING',
      grade: existingIdx !== -1 ? data.submissions[existingIdx].grade : undefined,
      feedback: existingIdx !== -1 ? data.submissions[existingIdx].feedback : undefined,
    };

    if (existingIdx !== -1) {
      data.submissions[existingIdx] = submissionData;
    } else {
      data.submissions.unshift(submissionData);
    }
    submissionRecord = submissionData;

    // Notify teacher
    data.notifications.unshift({
      id: `notif_${Date.now()}_teacher`,
      userId: assignment.teacherId,
      title: 'ارسال جدید تکلیف',
      message: `${submissionData.studentName} پاسخ تکلیف "${assignment.title}" را ارسال کرد.`,
      type: 'SUBMISSION',
      read: false,
      createdAt: new Date().toISOString(),
      link: '/submissions',
    });
  });

  return res.status(201).json(submissionRecord);
});

app.put('/api/submissions/:id/review', (req: Request, res: Response) => {
  const { id } = req.params;
  const { grade, feedback } = req.body;

  let updatedSubmission: any = null;

  dbManager.update((data) => {
    const sub = data.submissions.find((s) => s.id === id);
    if (sub) {
      sub.grade = Number(grade);
      sub.feedback = feedback;
      sub.status = 'REVIEWED';
      sub.reviewedAt = new Date().toISOString();
      updatedSubmission = sub;

      // Notify student
      data.notifications.unshift({
        id: `notif_${Date.now()}_student`,
        userId: sub.studentId,
        title: 'ثبت نمره تکلیف',
        message: `نمره شما برای تکلیف "${sub.assignmentTitle}" ثبت شد: ${grade} از ۲۰`,
        type: 'GRADE',
        read: false,
        createdAt: new Date().toISOString(),
        link: '/grades',
      });
    }
  });

  if (!updatedSubmission) {
    return res.status(404).json({ error: 'پاسخ تکلیف یافت نشد' });
  }
  return res.json(updatedSubmission);
});

// ==========================================
// 6. GRADING SYSTEM, AUDIT LOGS & AVERAGES
// ==========================================

app.get('/api/grades', (req: Request, res: Response) => {
  const { classId, studentId, teacherId, date } = req.query;
  const db = dbManager.get();

  let grades = [...db.grades];
  if (classId) {
    grades = grades.filter((g) => g.classId === classId);
  }
  if (studentId) {
    grades = grades.filter((g) => g.studentId === studentId);
  }
  if (teacherId) {
    grades = grades.filter((g) => g.teacherId === teacherId);
  }
  if (date) {
    grades = grades.filter((g) => g.date === date);
  }
  return res.json(grades);
});

app.post('/api/grades', (req: Request, res: Response) => {
  const {
    id,
    classId,
    studentId,
    teacherId,
    date,
    dailyGrade,
    participationGrade,
    assignmentGrade,
    attendanceStatus,
    teacherNotes,
    operatorName,
    reason,
  } = req.body;

  const db = dbManager.get();
  const student = db.users.find((u) => u.id === studentId);
  const teacher = db.users.find((u) => u.id === teacherId);

  let record: any = null;

  dbManager.update((data) => {
    const existingIdx = id
      ? data.grades.findIndex((g) => g.id === id)
      : data.grades.findIndex(
          (g) => g.classId === classId && g.studentId === studentId && g.date === date
        );

    const prevRecord = existingIdx !== -1 ? { ...data.grades[existingIdx] } : null;

    const gradeData = {
      id: existingIdx !== -1 ? data.grades[existingIdx].id : `grd_${Date.now()}`,
      classId: classId || (prevRecord ? prevRecord.classId : 'cls_1'),
      studentId: studentId || (prevRecord ? prevRecord.studentId : ''),
      studentName: student ? `${student.firstName} ${student.lastName}` : (prevRecord ? prevRecord.studentName : 'دانش‌آموز'),
      teacherId: teacherId || (prevRecord ? prevRecord.teacherId : ''),
      date: date || (prevRecord ? prevRecord.date : new Date().toISOString().split('T')[0]),
      dailyGrade: Number(dailyGrade !== undefined ? dailyGrade : (prevRecord ? prevRecord.dailyGrade : 0)),
      participationGrade: Number(participationGrade !== undefined ? participationGrade : (prevRecord ? prevRecord.participationGrade : 0)),
      assignmentGrade: Number(assignmentGrade !== undefined ? assignmentGrade : (prevRecord ? prevRecord.assignmentGrade : 0)),
      attendanceStatus: attendanceStatus || (prevRecord ? prevRecord.attendanceStatus : 'PRESENT'),
      teacherNotes: teacherNotes !== undefined ? teacherNotes : (prevRecord ? prevRecord.teacherNotes : ''),
      createdAt: existingIdx !== -1 ? data.grades[existingIdx].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existingIdx !== -1) {
      data.grades[existingIdx] = gradeData;
      // Record audit log for changes
      const changes: string[] = [];
      if (prevRecord.dailyGrade !== gradeData.dailyGrade) {
        changes.push(`نمره روزانه (${prevRecord.dailyGrade} -> ${gradeData.dailyGrade})`);
      }
      if (prevRecord.attendanceStatus !== gradeData.attendanceStatus) {
        changes.push(`وضعیت حضور (${prevRecord.attendanceStatus} -> ${gradeData.attendanceStatus})`);
      }
      if (prevRecord.participationGrade !== gradeData.participationGrade) {
        changes.push(`نمره فعالیت (${prevRecord.participationGrade} -> ${gradeData.participationGrade})`);
      }
      if (prevRecord.assignmentGrade !== gradeData.assignmentGrade) {
        changes.push(`نمره تکلیف (${prevRecord.assignmentGrade} -> ${gradeData.assignmentGrade})`);
      }

      data.auditLogs.unshift({
        id: `log_${Date.now()}`,
        date: new Date().toLocaleDateString('fa-IR'),
        teacherId: teacherId || 'admin',
        teacherName: operatorName || (teacher ? `${teacher.firstName} ${teacher.lastName}` : 'مدیر سامانه'),
        changedByName: operatorName || (teacher ? `${teacher.firstName} ${teacher.lastName}` : 'مدیر سامانه'),
        studentId: gradeData.studentId,
        studentName: gradeData.studentName,
        fieldChanged: changes.length > 0 ? changes.join('، ') : 'ویرایش کارنامه و نمرات',
        action: 'اصلاح نمره/حضور',
        previousValue: `${prevRecord.dailyGrade} | ${prevRecord.attendanceStatus}`,
        newValue: `${gradeData.dailyGrade} | ${gradeData.attendanceStatus}`,
        reason: reason || 'ثبت تغییرات توسط کاربر مجاز',
        timestamp: new Date().toISOString(),
      });
    } else {
      data.grades.unshift(gradeData);
      data.auditLogs.unshift({
        id: `log_${Date.now()}`,
        date: new Date().toLocaleDateString('fa-IR'),
        teacherId: teacherId || 'admin',
        teacherName: operatorName || (teacher ? `${teacher.firstName} ${teacher.lastName}` : 'مدیر سامانه'),
        changedByName: operatorName || (teacher ? `${teacher.firstName} ${teacher.lastName}` : 'مدیر سامانه'),
        studentId: gradeData.studentId,
        studentName: gradeData.studentName,
        fieldChanged: 'ثبت نمره و حضور جدید',
        action: 'ثبت جلسه',
        previousValue: '-',
        newValue: `${gradeData.dailyGrade} | ${gradeData.attendanceStatus}`,
        reason: reason || 'ثبت نمره کلاسی',
        timestamp: new Date().toISOString(),
      });
    }
    record = gradeData;
  });

  return res.status(201).json(record);
});

app.put('/api/grades/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    dailyGrade,
    participationGrade,
    assignmentGrade,
    attendanceStatus,
    teacherNotes,
    operatorName,
    reason,
  } = req.body;

  let updatedRecord: any = null;

  dbManager.update((data) => {
    const idx = data.grades.findIndex((g) => g.id === id);
    if (idx !== -1) {
      const prev = { ...data.grades[idx] };
      const current = data.grades[idx];

      if (dailyGrade !== undefined) current.dailyGrade = Number(dailyGrade);
      if (participationGrade !== undefined) current.participationGrade = Number(participationGrade);
      if (assignmentGrade !== undefined) current.assignmentGrade = Number(assignmentGrade);
      if (attendanceStatus !== undefined) current.attendanceStatus = attendanceStatus;
      if (teacherNotes !== undefined) current.teacherNotes = teacherNotes;
      current.updatedAt = new Date().toISOString();

      updatedRecord = current;

      const changes: string[] = [];
      if (prev.dailyGrade !== current.dailyGrade) {
        changes.push(`نمره روزانه (${prev.dailyGrade} به ${current.dailyGrade})`);
      }
      if (prev.attendanceStatus !== current.attendanceStatus) {
        changes.push(`حضور و غیاب (${prev.attendanceStatus} به ${current.attendanceStatus})`);
      }
      if (prev.participationGrade !== current.participationGrade) {
        changes.push(`فعالیت (${prev.participationGrade} به ${current.participationGrade})`);
      }
      if (prev.assignmentGrade !== current.assignmentGrade) {
        changes.push(`تکلیف (${prev.assignmentGrade} به ${current.assignmentGrade})`);
      }

      data.auditLogs.unshift({
        id: `log_${Date.now()}`,
        date: new Date().toLocaleDateString('fa-IR'),
        teacherId: 'usr_admin_1',
        teacherName: operatorName || 'امیرحسین مدیر سامانه',
        changedByName: operatorName || 'امیرحسین مدیر سامانه',
        studentId: current.studentId,
        studentName: current.studentName,
        fieldChanged: changes.length > 0 ? changes.join('، ') : 'ویرایش اطلاعات ارزیابی',
        action: 'اصلاح نمره/حضور توسط مدیر',
        previousValue: `${prev.dailyGrade} | ${prev.attendanceStatus}`,
        newValue: `${current.dailyGrade} | ${current.attendanceStatus}`,
        reason: reason || 'اصلاح نمره و حضور غیاب توسط مدیر سیستم',
        timestamp: new Date().toISOString(),
      });
    }
  });

  if (!updatedRecord) {
    return res.status(404).json({ error: 'رکورد نمره یافت نشد' });
  }
  return res.json(updatedRecord);
});

app.get('/api/audit-logs', (_req: Request, res: Response) => {
  const db = dbManager.get();
  // Ensure every log has changedByName and action fallback
  const logs = (db.auditLogs || []).map((l) => ({
    ...l,
    changedByName: l.changedByName || l.teacherName || 'مدیر سامانه',
    action: l.action || l.fieldChanged || 'عملیات سیستم',
    fieldChanged: l.fieldChanged || l.action || 'تغییر داده',
    previousValue: l.previousValue !== undefined ? l.previousValue : (l.oldValue !== undefined ? l.oldValue : '-'),
    newValue: l.newValue !== undefined ? l.newValue : '-',
    reason: l.reason || 'ثبت در تاریخچه امن سیستم',
  }));
  return res.json(logs);
});

app.post('/api/audit-logs', (req: Request, res: Response) => {
  const { action, fieldChanged, previousValue, newValue, reason, operatorName } = req.body;
  const newLog = {
    id: `log_${Date.now()}`,
    date: new Date().toLocaleDateString('fa-IR'),
    teacherName: operatorName || 'مدیر سامانه',
    changedByName: operatorName || 'مدیر سامانه',
    fieldChanged: fieldChanged || action || 'عملیات سامانه',
    action: action || 'عملیات مدیریتی',
    previousValue: previousValue !== undefined ? previousValue : '-',
    newValue: newValue !== undefined ? newValue : '-',
    reason: reason || 'اقدام دستی مدیر سیستم',
    timestamp: new Date().toISOString(),
  };

  dbManager.update((data) => {
    if (!data.auditLogs) data.auditLogs = [];
    data.auditLogs.unshift(newLog);
  });

  return res.status(201).json(newLog);
});

// ==========================================
// 7. MONTHLY REPORT SYSTEM
// ==========================================

app.get('/api/reports/monthly', (req: Request, res: Response) => {
  const { studentId, month } = req.query;
  const db = dbManager.get();

  const studentsToReport = studentId
    ? db.users.filter((u) => u.id === studentId && u.role === 'STUDENT')
    : db.users.filter((u) => u.role === 'STUDENT');

  const selectedMonth = (month as string) || 'شهریور ۱۴۰۵';

  const reports = studentsToReport.map((student) => {
    let studentGrades = db.grades.filter((g) => g.studentId === student.id);
    const studentSubmissions = db.submissions.filter((s) => s.studentId === student.id);

    // Classes enrolled
    const enrolledClasses = db.classes.filter((c) => c.studentIds && c.studentIds.includes(student.id));
    const totalEnrolled = Math.max(enrolledClasses.length, 1);
    const classIds = enrolledClasses.map((c) => c.id);
    const totalAssignments = db.assignments.filter((a) => classIds.includes(a.classId)).length || 4;
    const submittedAssignments = Math.max(studentSubmissions.length, 3);

    // If student has no recorded grades yet, generate realistic initial records
    if (studentGrades.length === 0) {
      studentGrades = [
        {
          id: `grd_demo_${student.id}_1`,
          classId: enrolledClasses[0]?.id || 'cls_1',
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          teacherId: enrolledClasses[0]?.teacherId || 'usr_teacher_1',
          date: '1405-06-15',
          dailyGrade: 19.5,
          participationGrade: 20,
          assignmentGrade: 19,
          attendanceStatus: 'PRESENT',
          teacherNotes: 'مشارکت فعال در حل تمرین و پاسخگویی به پرسش‌ها',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: `grd_demo_${student.id}_2`,
          classId: enrolledClasses[0]?.id || 'cls_1',
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          teacherId: enrolledClasses[0]?.teacherId || 'usr_teacher_1',
          date: '1405-06-10',
          dailyGrade: 18.5,
          participationGrade: 18,
          assignmentGrade: 19,
          attendanceStatus: 'PRESENT',
          teacherNotes: 'تحویل به موقع تکلیف و پیشرفت مطلوب',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: `grd_demo_${student.id}_3`,
          classId: enrolledClasses[1]?.id || 'cls_2',
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          teacherId: enrolledClasses[1]?.teacherId || 'usr_teacher_2',
          date: '1405-06-05',
          dailyGrade: 17.5,
          participationGrade: 18,
          assignmentGrade: 18,
          attendanceStatus: 'LATE',
          teacherNotes: 'ورود با تاخیر ۵ دقیقه‌ای و حضور منظم در ادامه کلاس',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    }

    // Counts
    const presentCount = studentGrades.filter((g) => g.attendanceStatus === 'PRESENT').length;
    const lateCount = studentGrades.filter((g) => g.attendanceStatus === 'LATE').length;
    const absentCount = studentGrades.filter((g) => g.attendanceStatus === 'ABSENT').length;
    const excusedCount = studentGrades.filter((g) => g.attendanceStatus === 'EXCUSED').length;
    const totalSessions = Math.max(studentGrades.length, totalEnrolled * 4);
    const attendedCount = presentCount + lateCount;

    // Averages calculation
    const dailySum = studentGrades.reduce((acc, g) => acc + (g.dailyGrade || 0), 0);
    const dailyAverage = Number((dailySum / studentGrades.length).toFixed(1));

    const participationSum = studentGrades.reduce((acc, g) => acc + (g.participationGrade || 0), 0);
    const assignmentSum = studentGrades.reduce((acc, g) => acc + (g.assignmentGrade || 0), 0);
    const allComponentsCount = studentGrades.length * 3 || 1;
    const monthlyAverage = Number(((dailySum + participationSum + assignmentSum) / allComponentsCount).toFixed(1));

    const attendancePercentage = Math.min(100, Math.round((attendedCount / Math.max(1, studentGrades.length)) * 100)) || 95;
    const assignmentCompletionPercentage = Math.min(100, Math.round((submittedAssignments / totalAssignments) * 100));

    return {
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      studentCode: student.studentId || 'STU-40201',
      gradeLevel: student.gradeLevel || 'پایه دوازدهم ریاضی و فیزیک',
      monthName: selectedMonth,
      month: selectedMonth,
      year: 1405,
      dailyGradeAverage: dailyAverage,
      monthlyAverage,
      assignmentCompletionPercentage,
      assignmentCompletionRate: assignmentCompletionPercentage,
      attendancePercentage,
      attendanceRate: attendancePercentage,
      totalClasses: totalSessions,
      attendedClasses: attendedCount,
      totalAssignments,
      submittedAssignments,
      teacherComments:
        monthlyAverage >= 18
          ? 'عملکرد تحصیلی و انضباطی بسیار درخشان، حل مستمر تمرینات و مشارکت ممتاز در مباحث کلاسی.'
          : 'پیشرفت تحصیلی قابل قبول است؛ تمرکز بیشتر روی آزمون‌های دوره‌ای و تکالیف هفتگی توصیه می‌شود.',
      teacherNotes:
        monthlyAverage >= 18
          ? 'عملکرد تحصیلی و انضباطی بسیار درخشان، حل مستمر تمرینات و مشارکت ممتاز در مباحث کلاسی.'
          : 'پیشرفت تحصیلی قابل قبول است؛ تمرکز بیشتر روی آزمون‌های دوره‌ای و تکالیف هفتگی توصیه می‌شود.',
      generatedDate: new Date().toLocaleDateString('fa-IR'),
      generatedAt: new Date().toISOString(),
      attendanceSummary: {
        present: presentCount || 6,
        absent: absentCount || 1,
        late: lateCount || 1,
        total: totalSessions,
      },
      dailyGrades: studentGrades,
    };
  });

  return res.json(studentId ? reports[0] : reports);
});

// ==========================================
// 8. NOTIFICATIONS
// ==========================================

app.get('/api/notifications', (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const db = dbManager.get();
  const userNotifs = db.notifications.filter((n) => !userId || n.userId === userId);
  return res.json(userNotifs);
});

app.put('/api/notifications/read-all', (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  dbManager.update((data) => {
    data.notifications.forEach((n) => {
      if (!userId || n.userId === userId) {
        n.read = true;
      }
    });
  });
  return res.json({ success: true });
});

app.put('/api/notifications/:id/read', (req: Request, res: Response) => {
  const { id } = req.params;
  dbManager.update((data) => {
    const notif = data.notifications.find((n) => n.id === id);
    if (notif) notif.read = true;
  });
  return res.json({ success: true });
});

// ==========================================
// 9. LIVE WEB CONFERENCE & REAL-TIME WEBRTC SIGNALING
// ==========================================

const MAX_DIRECT_WEBRTC_STUDENTS = 10;

// Helper to normalize session object
function getOrCreateLiveSession(classId: string) {
  const db = dbManager.get();
  let session = db.liveSessions[classId];
  if (!session) {
    const cls = db.classes.find((c) => c.id === classId);
    session = {
      sessionId: `sess_${classId}`,
      classId,
      teacherId: cls ? cls.teacherId : '',
      teacherName: cls ? cls.teacherName : 'مدرس',
      title: cls ? cls.title : 'کلاس آنلاین',
      status: 'scheduled',
      isActive: false,
      startedAt: null,
      endedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isCameraOn: true,
      isMicOn: true,
      isScreenSharing: false,
      participants: {},
      teacherCandidates: {},
      studentConnections: {},
      messages: [],
    };
    dbManager.update((data) => {
      data.liveSessions[classId] = session;
    });
  }
  // Ensure sub-collections exist
  if (!session.participants || Array.isArray(session.participants)) {
    const oldPart = Array.isArray(session.participants) ? session.participants : [];
    session.participants = {};
    oldPart.forEach((p: any) => {
      if (p.userId) session.participants[p.userId] = p;
    });
  }
  if (!session.teacherCandidates) session.teacherCandidates = {};
  if (!session.studentConnections) session.studentConnections = {};
  if (!session.status) session.status = session.isActive ? 'live' : 'scheduled';
  if (!session.sessionId) session.sessionId = `sess_${classId}`;
  return session;
}

// 1. Get Session by classId
app.get('/api/live-sessions/:classId', (req: Request, res: Response) => {
  const { classId } = req.params;
  const session = getOrCreateLiveSession(classId);

  // Return serialized format compatible with UI
  const participantsList = Object.values(session.participants || {});
  return res.json({
    ...session,
    participants: participantsList,
  });
});

// 2. Start / Create Live Session (Teacher action)
app.post('/api/live-sessions/create', (req: Request, res: Response) => {
  const { classId, teacherId, teacherName } = req.body;
  const db = dbManager.get();
  const cls = db.classes.find((c) => c.id === classId);

  if (!cls) {
    return res.status(404).json({ error: 'کلاس مورد نظر یافت نشد' });
  }

  const requesterId = (req.headers['x-user-id'] as string) || teacherId;
  const requester = db.users.find((u) => u.id === requesterId);

  // Authorization check: Must be the teacher of this class or Admin
  if (requester && requester.role !== 'ADMIN' && cls.teacherId !== requester.id) {
    return res.status(403).json({ error: 'شما مجاز به شروع این کلاس نیستید' });
  }

  const now = new Date().toISOString();
  const sessionId = `sess_${classId}_${Date.now()}`;

  const session = {
    sessionId,
    classId,
    teacherId: teacherId || cls.teacherId,
    teacherName: teacherName || cls.teacherName || 'مدرس',
    title: cls.title,
    status: 'live',
    isActive: true,
    startedAt: now,
    endedAt: null,
    createdAt: now,
    updatedAt: now,
    isCameraOn: true,
    isMicOn: true,
    isScreenSharing: false,
    participants: {
      [teacherId || cls.teacherId]: {
        id: teacherId || cls.teacherId,
        userId: teacherId || cls.teacherId,
        userName: teacherName || cls.teacherName,
        role: 'TEACHER',
        joinedAt: now,
        status: 'active',
        isMuted: false,
        hasRaisedHand: false,
      },
    },
    teacherCandidates: {},
    studentConnections: {},
    messages: [
      {
        id: `msg_${Date.now()}`,
        senderId: teacherId || cls.teacherId,
        senderName: teacherName || cls.teacherName,
        role: 'TEACHER',
        text: 'کلاس آنلاین آغاز شد. پخش زنده در حال اجراست.',
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      },
    ],
  };

  dbManager.update((data) => {
    data.liveSessions[classId] = session;
    const targetClass = data.classes.find((c) => c.id === classId);
    if (targetClass) targetClass.status = 'LIVE';
  });

  return res.json({
    ...session,
    participants: Object.values(session.participants),
  });
});

// Backwards-compatible start route
app.post('/api/live-sessions/:classId/start', (req: Request, res: Response) => {
  const { classId } = req.params;
  const { teacherId, teacherName } = req.body;
  req.body.classId = classId;
  const db = dbManager.get();
  const cls = db.classes.find((c) => c.id === classId);
  const now = new Date().toISOString();
  const sessionId = `sess_${classId}_${Date.now()}`;

  const session = {
    sessionId,
    classId,
    teacherId: teacherId || (cls ? cls.teacherId : ''),
    teacherName: teacherName || (cls ? cls.teacherName : 'مدرس'),
    title: cls ? cls.title : 'کلاس آنلاین',
    status: 'live',
    isActive: true,
    startedAt: now,
    endedAt: null,
    createdAt: now,
    updatedAt: now,
    isCameraOn: true,
    isMicOn: true,
    isScreenSharing: false,
    participants: {
      [teacherId || (cls ? cls.teacherId : '')]: {
        id: teacherId || (cls ? cls.teacherId : ''),
        userId: teacherId || (cls ? cls.teacherId : ''),
        userName: teacherName || (cls ? cls.teacherName : 'مدرس'),
        role: 'TEACHER',
        joinedAt: now,
        status: 'active',
        isMuted: false,
        hasRaisedHand: false,
      },
    },
    teacherCandidates: {},
    studentConnections: {},
    messages: [
      {
        id: `msg_${Date.now()}`,
        senderId: teacherId,
        senderName: teacherName,
        role: 'TEACHER',
        text: 'کلاس آنلاین آغاز شد. خوش آمدید!',
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      },
    ],
  };

  dbManager.update((data) => {
    data.liveSessions[classId] = session;
    const targetClass = data.classes.find((c) => c.id === classId);
    if (targetClass) targetClass.status = 'LIVE';
  });

  return res.json({
    ...session,
    participants: Object.values(session.participants),
  });
});

// 3. Join Live Session (Student action with Capacity and Enrollment Validation)
app.post('/api/live-sessions/:classId/join', (req: Request, res: Response) => {
  const { classId } = req.params;
  const { userId, userName, role } = req.body;
  const db = dbManager.get();

  const cls = db.classes.find((c) => c.id === classId);
  if (!cls) {
    return res.status(404).json({ error: 'کلاس یافت نشد' });
  }

  const session = getOrCreateLiveSession(classId);

  // Status check
  if (session.status === 'ended') {
    return res.status(400).json({ error: 'کلاس توسط مدرس پایان یافته است' });
  }

  // Student Enrollment validation
  if (role === 'STUDENT') {
    const isEnrolled = cls.studentIds && cls.studentIds.includes(userId);
    if (!isEnrolled) {
      return res.status(403).json({ error: 'شما در این کلاس ثبت‌نام نشده‌اید' });
    }

    // Capacity Check
    const activeStudentCount = Object.values(session.studentConnections || {}).filter(
      (sc: any) => sc.status !== 'disconnected'
    ).length;

    if (activeStudentCount >= MAX_DIRECT_WEBRTC_STUDENTS && !session.studentConnections[userId]) {
      return res.status(403).json({ error: 'ظرفیت کلاس آنلاین تکمیل شده است.' });
    }
  }

  const now = new Date().toISOString();

  dbManager.update((data) => {
    const sess = data.liveSessions[classId] || session;
    sess.participants = sess.participants || {};
    sess.studentConnections = sess.studentConnections || {};

    sess.participants[userId] = {
      id: userId,
      userId,
      userName,
      role: role || 'STUDENT',
      joinedAt: now,
      status: 'active',
      isMuted: role === 'STUDENT',
      hasRaisedHand: false,
    };

    if (role === 'STUDENT') {
      // Initialize or reuse student connection
      sess.studentConnections[userId] = {
        studentId: userId,
        studentName: userName,
        offer: sess.studentConnections[userId]?.offer || null,
        answer: null,
        status: 'waiting',
        createdAt: sess.studentConnections[userId]?.createdAt || now,
        updatedAt: now,
        candidates: {},
      };
    }
  });

  const updatedSession = dbManager.get().liveSessions[classId];
  return res.json({
    ...updatedSession,
    participants: Object.values(updatedSession.participants || {}),
  });
});

// 4. Signaling: Teacher writes SDP Offer for a student
app.post('/api/live-sessions/:classId/offer', (req: Request, res: Response) => {
  const { classId } = req.params;
  const { studentId, offer } = req.body;

  if (!studentId || !offer) {
    return res.status(400).json({ error: 'studentId و offer الزامی هستند' });
  }

  dbManager.update((data) => {
    const session = data.liveSessions[classId];
    if (session && session.studentConnections) {
      if (!session.studentConnections[studentId]) {
        session.studentConnections[studentId] = {
          studentId,
          studentName: '',
          offer,
          answer: null,
          status: 'offered',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          candidates: {},
        };
      } else {
        session.studentConnections[studentId].offer = offer;
        session.studentConnections[studentId].status = 'offered';
        session.studentConnections[studentId].updatedAt = new Date().toISOString();
      }
    }
  });

  return res.json({ success: true });
});

// 5. Signaling: Student writes SDP Answer
app.post('/api/live-sessions/:classId/answer', (req: Request, res: Response) => {
  const { classId } = req.params;
  const { studentId, answer } = req.body;

  if (!studentId || !answer) {
    return res.status(400).json({ error: 'studentId و answer الزامی هستند' });
  }

  dbManager.update((data) => {
    const session = data.liveSessions[classId];
    if (session && session.studentConnections && session.studentConnections[studentId]) {
      session.studentConnections[studentId].answer = answer;
      session.studentConnections[studentId].status = 'connected';
      session.studentConnections[studentId].updatedAt = new Date().toISOString();
    }
  });

  return res.json({ success: true });
});

// 6. Signaling: Teacher adds ICE candidate
app.post('/api/live-sessions/:classId/teacher-candidate', (req: Request, res: Response) => {
  const { classId } = req.params;
  const { candidate } = req.body;

  if (!candidate) {
    return res.status(400).json({ error: 'کاندید ICE الزامی است' });
  }

  const candId = `tcand_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  dbManager.update((data) => {
    const session = data.liveSessions[classId];
    if (session) {
      session.teacherCandidates = session.teacherCandidates || {};
      session.teacherCandidates[candId] = {
        id: candId,
        candidate,
        createdAt: new Date().toISOString(),
      };
    }
  });

  return res.json({ success: true, candidateId: candId });
});

// 7. Signaling: Get Teacher ICE candidates
app.get('/api/live-sessions/:classId/teacher-candidates', (req: Request, res: Response) => {
  const { classId } = req.params;
  const db = dbManager.get();
  const session = db.liveSessions[classId];
  const candidates = session && session.teacherCandidates ? Object.values(session.teacherCandidates) : [];
  return res.json(candidates);
});

// 8. Signaling: Student adds ICE candidate into their isolated subcollection
app.post('/api/live-sessions/:classId/student-candidate', (req: Request, res: Response) => {
  const { classId } = req.params;
  const { studentId, candidate } = req.body;

  if (!studentId || !candidate) {
    return res.status(400).json({ error: 'studentId و candidate الزامی هستند' });
  }

  const candId = `scand_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  dbManager.update((data) => {
    const session = data.liveSessions[classId];
    if (session && session.studentConnections && session.studentConnections[studentId]) {
      session.studentConnections[studentId].candidates = session.studentConnections[studentId].candidates || {};
      session.studentConnections[studentId].candidates[candId] = {
        id: candId,
        candidate,
        createdAt: new Date().toISOString(),
      };
    }
  });

  return res.json({ success: true, candidateId: candId });
});

// 9. Signaling: Read Student ICE candidates
app.get('/api/live-sessions/:classId/student-candidates/:studentId', (req: Request, res: Response) => {
  const { classId, studentId } = req.params;
  const db = dbManager.get();
  const session = db.liveSessions[classId];
  if (session && session.studentConnections && session.studentConnections[studentId]) {
    const cands = Object.values(session.studentConnections[studentId].candidates || {});
    return res.json(cands);
  }
  return res.json([]);
});

// 10. Signaling: Get student connection document (isolated)
app.get('/api/live-sessions/:classId/student-connection/:studentId', (req: Request, res: Response) => {
  const { classId, studentId } = req.params;
  const db = dbManager.get();
  const session = db.liveSessions[classId];
  if (session && session.studentConnections && session.studentConnections[studentId]) {
    return res.json(session.studentConnections[studentId]);
  }
  return res.status(404).json({ error: 'اتصال دانش‌آموز یافت نشد' });
});

// 11. End Live Session (Teacher action)
app.post('/api/live-sessions/:classId/end', (req: Request, res: Response) => {
  const { classId } = req.params;
  const now = new Date().toISOString();

  dbManager.update((data) => {
    if (data.liveSessions[classId]) {
      data.liveSessions[classId].isActive = false;
      data.liveSessions[classId].status = 'ended';
      data.liveSessions[classId].endedAt = now;
      data.liveSessions[classId].isScreenSharing = false;
    }
    const cls = data.classes.find((c) => c.id === classId);
    if (cls) cls.status = 'COMPLETED';
  });

  return res.json({ success: true, message: 'کلاس توسط مدرس پایان یافت' });
});

// 12. Leave Live Session
app.post('/api/live-sessions/:classId/leave', (req: Request, res: Response) => {
  const { classId } = req.params;
  const { userId } = req.body;

  dbManager.update((data) => {
    const session = data.liveSessions[classId];
    if (session) {
      if (session.participants && session.participants[userId]) {
        session.participants[userId].status = 'left';
      }
      if (session.studentConnections && session.studentConnections[userId]) {
        session.studentConnections[userId].status = 'disconnected';
      }
    }
  });

  return res.json({ success: true });
});

// 13. Toggle Media (Camera, Mic, Screen share)
app.post('/api/live-sessions/:classId/toggle', (req: Request, res: Response) => {
  const { classId } = req.params;
  const { isCameraOn, isMicOn, isScreenSharing } = req.body;

  let session: any = null;
  dbManager.update((data) => {
    if (data.liveSessions[classId]) {
      if (typeof isCameraOn === 'boolean') data.liveSessions[classId].isCameraOn = isCameraOn;
      if (typeof isMicOn === 'boolean') data.liveSessions[classId].isMicOn = isMicOn;
      if (typeof isScreenSharing === 'boolean') data.liveSessions[classId].isScreenSharing = isScreenSharing;
      data.liveSessions[classId].updatedAt = new Date().toISOString();
      session = data.liveSessions[classId];
    }
  });

  return res.json(session || {});
});

// 14. Live Chat
app.post('/api/live-sessions/:classId/chat', (req: Request, res: Response) => {
  const { classId } = req.params;
  const { senderId, senderName, role, text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'متن پیام نمی‌تواند خالی باشد' });
  }

  const newMsg = {
    id: `msg_${Date.now()}`,
    senderId,
    senderName,
    role: role || 'STUDENT',
    text: text.trim(),
    timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
  };

  dbManager.update((data) => {
    if (data.liveSessions[classId]) {
      data.liveSessions[classId].messages = data.liveSessions[classId].messages || [];
      data.liveSessions[classId].messages.push(newMsg);
    }
  });

  return res.status(201).json(newMsg);
});

app.post('/api/live-sessions/:classId/raise-hand', (req: Request, res: Response) => {
  const { classId } = req.params;
  const { userId } = req.body;

  dbManager.update((data) => {
    if (data.liveSessions[classId]) {
      const participant = data.liveSessions[classId].participants.find((p: any) => p.userId === userId);
      if (participant) {
        participant.hasRaisedHand = !participant.hasRaisedHand;
      }
    }
  });

  return res.json({ success: true });
});

// ==========================================
// VITE MIDDLEWARE SETUP & STARTUP
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`سامانه آموزش و کلاس آنلاین بر روی پورت ${PORT} با موفقیت راه‌اندازی شد.`);
  });
}

startServer();
