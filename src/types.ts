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
  employeeId?: string;
  department?: string;
  primarySubject?: string;
  gender?: '男' | '女';
  idCard?: string;
}

export interface Subject {
  id: string;
  name: string;
  type: '公共课' | '专业课';
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

export interface AppState {
  departments: Department[];
  majors: Major[];
  grades: Grade[];
  classes: Class[];
  teachers: Teacher[];
  subjects: Subject[];
  schedules: Schedule[];
  classCategories: ClassCategory[];
}
