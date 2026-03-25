export interface Department {
  id: string;
  name: string;
}

export interface Major {
  id: string;
  departmentId: string;
  name: string;
}

export interface Grade {
  id: string;
  name: string;
}

export interface Teacher {
  id: string;
  name: string;
  department?: string;
  primarySubject?: string;
  gender?: '男' | '女';
  idCard?: string;
}

export type SubjectType = '中职公共基础课' | '中职专业课' | '综合高中文化课' | '综合高中技能课';

export interface Subject {
  id: string;
  name: string;
  type: SubjectType;
  departmentId?: string;
  majorId?: string;
}

export interface ClassCategory {
  id: string;
  name: string;
}

export interface Class {
  id: string;
  majorId: string;
  gradeId: string;
  name: string;
  type: string; // References ClassCategory.name
  classroom: string;
  studentCount: number;
  headTeacherId: string;
}

export interface Schedule {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  hours: number;
}

export interface Archive {
  id: string;
  departmentId: string;
  name: string;
  timestamp: string;
  schedules: Schedule[];
}

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  departmentIds?: string[]; // For 'USER' role to limit access to multiple departments
}

export interface AppState {
  departments: Department[];
  majors: Major[];
  grades: Grade[];
  classes: Class[];
  teachers: Teacher[];
  subjects: Subject[];
  schedules: Schedule[];
  archives: Archive[];
  classCategories: ClassCategory[];
  users: User[];
}
