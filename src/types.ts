export interface Department {
  id: string;
  name: string;
}

export interface Major {
  id: string;
  departmentId: string;
  name: string;
  enrollmentTarget?: number; // Optional planned enrollment target
}

export interface Grade {
  id: string;
  name: string;
}

export interface ClassroomDef {
  id: string;
  name: string;
  classId?: string; // Currently assigned class ID
}

export interface Floor {
  id: string;
  level: string; // e.g., "1层", "2层"
  classrooms: ClassroomDef[];
}

export interface Building {
  id: string;
  name: string;
  floors: Floor[];
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
  weeklyHours?: number;
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
  status?: '正常在校' | '外出实习' | '实习返校' | '已毕业' | '合并解散';
  stage?: '高一' | '高二' | '高三' | '已毕业';
  isPreset?: boolean; // Flag to indicate if the class is a preset draft
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
  buildings: Building[];
}
