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
  employmentType?: '在编' | '外聘' | '兼职';
  positionType?: '专任教师' | '教辅职员' | '兼课教师';
  defaultWeeklyHours?: number;
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
  gradeHours?: Record<string, number>;
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
  isPreset?: boolean; // Flag to indicate if the class is a preset draft
  relationType?: 'normal' | 'merged' | 'split'; // 班级关系类型
  associatedClassIds?: string[]; // 关联的行政班级ID
}

export interface Schedule {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  hours: number;
  assistantTeacherId?: string; // 双师课堂：第二教师/助理教师ID
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

export interface TalentProgramCourse {
  subjectId: string;
  weeklyHours: number;
  term: number; // 1-6 学期
  isCore?: boolean; // 是否核心课程
}

export interface TalentProgram {
  id: string;
  majorId: string;
  gradeId: string;
  name: string;
  totalHours?: number; // 总学时
  totalCredits?: number; // 总学分
  courses: TalentProgramCourse[];
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
  talentPrograms?: TalentProgram[]; // 人才培养方案库
}
