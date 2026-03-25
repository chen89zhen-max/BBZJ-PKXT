import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { AppState, Schedule, Department, Teacher, Major, Grade, Class, Subject, ClassCategory, SubjectType, User, Archive } from './types';
import { v4 as uuidv4 } from 'uuid';

interface AppContextType {
  state: AppState;
  user: Partial<User> | null;
  updateSchedule: (classId: string, subjectId: string, teacherId: string, hours: number) => void;
  batchUpdateSchedules: (updates: { classId: string, subjectId: string, teacherId: string, hours: number }[]) => void;
  
  // Departments
  addDepartment: (name: string) => void;
  updateDepartment: (id: string, name: string) => void;
  deleteDepartment: (id: string) => void;
  
  // Majors
  addMajor: (departmentId: string, name: string) => void;
  updateMajor: (id: string, name: string) => void;
  deleteMajor: (id: string) => void;
  
  // Grades
  addGrade: (name: string) => void;
  deleteGrade: (id: string) => void;
  
  // Classes
  addClass: (cls: Omit<Class, 'id'>) => void;
  updateClass: (cls: Class) => void;
  deleteClass: (id: string) => void;
  deleteClasses: (ids: string[]) => void;
  clearClasses: () => void;
  importClasses: (classes: Omit<Class, 'id'>[]) => { added: number, updated: number, failed: number };
  importMajors: (majors: { name: string, departmentName: string }[]) => { added: number, updated: number, failed: number };
  
  // Teachers
  addTeacher: (teacher: Omit<Teacher, 'id'>) => void;
  addTeachers: (teachers: Omit<Teacher, 'id'>[]) => void;
  updateTeacher: (teacher: Teacher) => void;
  deleteTeacher: (id: string) => void;
  deleteTeachers: (ids: string[]) => void;
  
  // Subjects
  addSubject: (name: string, type: SubjectType, departmentId?: string, majorId?: string) => void;
  addSubjects: (subjects: Omit<Subject, 'id'>[]) => void;
  updateSubject: (subject: Subject) => void;
  deleteSubject: (id: string) => void;
  deleteSubjects: (ids: string[]) => void;
  reorderSubject: (id: string, direction: 'up' | 'down') => void;
  updateSubjectsOrder: (subjects: Subject[]) => void;
  
  // Class Categories
  addClassCategory: (name: string) => void;
  deleteClassCategory: (id: string) => void;
  
  // Schedules
  clearSchedules: () => void;
  clearDepartmentSchedules: (departmentId: string) => void;
  
  // Archives
  createArchive: (departmentId: string, name: string) => void;
  restoreArchive: (archiveId: string) => void;
  deleteArchive: (archiveId: string) => void;
  
  connected: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode, user: Partial<User> | null }> = ({ children, user }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<AppState>({
    departments: [],
    majors: [],
    grades: [],
    classes: [],
    teachers: [],
    subjects: [],
    schedules: [],
    archives: [],
    classCategories: [],
    users: [],
  });

  useEffect(() => {
    // Connect to the same host/port
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('state:sync', (newState: AppState) => {
      setState(newState);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const broadcastState = (newState: AppState) => {
    setState(newState);
    if (socket) {
      socket.emit('state:update', newState);
    }
  };

  const updateSchedule = (classId: string, subjectId: string, teacherId: string, hours: number) => {
    const existingIndex = state.schedules.findIndex(s => s.classId === classId && s.subjectId === subjectId);
    let newSchedules = [...state.schedules];
    
    if (existingIndex >= 0) {
      if (!teacherId || hours <= 0) {
        newSchedules.splice(existingIndex, 1);
      } else {
        newSchedules[existingIndex] = { ...newSchedules[existingIndex], teacherId, hours };
      }
    } else if (teacherId && hours > 0) {
      newSchedules.push({ id: uuidv4(), classId, subjectId, teacherId, hours });
    }

    broadcastState({ ...state, schedules: newSchedules });
  };

  const batchUpdateSchedules = (updates: { classId: string, subjectId: string, teacherId: string, hours: number }[]) => {
    let newSchedules = [...state.schedules];
    
    updates.forEach(update => {
      const { classId, subjectId, teacherId, hours } = update;
      const existingIndex = newSchedules.findIndex(s => s.classId === classId && s.subjectId === subjectId);
      
      if (existingIndex >= 0) {
        if (!teacherId || hours <= 0) {
          newSchedules.splice(existingIndex, 1);
        } else {
          newSchedules[existingIndex] = { ...newSchedules[existingIndex], teacherId, hours };
        }
      } else if (teacherId && hours > 0) {
        newSchedules.push({ id: uuidv4(), classId, subjectId, teacherId, hours });
      }
    });

    broadcastState({ ...state, schedules: newSchedules });
  };

  const clearSchedules = () => {
    broadcastState({ ...state, schedules: [] });
  };

  const clearDepartmentSchedules = (departmentId: string) => {
    const deptMajors = state.majors.filter(m => m.departmentId === departmentId);
    const deptMajorIds = new Set(deptMajors.map(m => m.id));
    const deptClassIds = new Set(state.classes.filter(c => deptMajorIds.has(c.majorId)).map(c => c.id));
    
    // Also remove any schedules that point to non-existent classes or subjects
    const validClassIds = new Set(state.classes.map(c => c.id));
    const validSubjectIds = new Set(state.subjects.map(s => s.id));
    const validTeacherIds = new Set(state.teachers.map(t => t.id));

    broadcastState({
      ...state,
      schedules: state.schedules.filter(s => {
        // Remove if it belongs to this department
        if (deptClassIds.has(s.classId)) return false;
        
        // Remove if it's orphaned (points to non-existent class, subject, or teacher)
        if (!validClassIds.has(s.classId) || !validSubjectIds.has(s.subjectId) || !validTeacherIds.has(s.teacherId)) return false;
        
        return true;
      })
    });
  };

  // Departments
  const addDepartment = (name: string) => {
    broadcastState({ ...state, departments: [...state.departments, { id: uuidv4(), name }] });
  };
  const updateDepartment = (id: string, name: string) => {
    broadcastState({ ...state, departments: state.departments.map(d => d.id === id ? { ...d, name } : d) });
  };
  const deleteDepartment = (id: string) => {
    const remainingMajors = state.majors.filter(m => m.departmentId !== id);
    const remainingMajorIds = new Set(remainingMajors.map(m => m.id));
    const remainingClasses = state.classes.filter(c => remainingMajorIds.has(c.majorId));
    const remainingClassIds = new Set(remainingClasses.map(c => c.id));
    const remainingSubjectIds = new Set(state.subjects.filter(s => s.departmentId !== id).map(s => s.id));
    const remainingTeacherIds = new Set(state.teachers.map(t => t.id));

    broadcastState({ 
      ...state, 
      departments: state.departments.filter(d => d.id !== id),
      majors: remainingMajors,
      classes: remainingClasses,
      subjects: state.subjects.filter(s => s.departmentId !== id),
      schedules: state.schedules.filter(s => 
        remainingClassIds.has(s.classId) && 
        remainingSubjectIds.has(s.subjectId) && 
        remainingTeacherIds.has(s.teacherId)
      )
    });
  };

  // Majors
  const addMajor = (departmentId: string, name: string) => {
    broadcastState({ ...state, majors: [...state.majors, { id: uuidv4(), departmentId, name }] });
  };
  const updateMajor = (id: string, name: string) => {
    broadcastState({ ...state, majors: state.majors.map(m => m.id === id ? { ...m, name } : m) });
  };
  const deleteMajor = (id: string) => {
    const remainingClasses = state.classes.filter(c => c.majorId !== id);
    const remainingClassIds = new Set(remainingClasses.map(c => c.id));
    const remainingSubjectIds = new Set(state.subjects.filter(s => s.majorId !== id).map(s => s.id));
    const remainingTeacherIds = new Set(state.teachers.map(t => t.id));

    broadcastState({ 
      ...state, 
      majors: state.majors.filter(m => m.id !== id),
      classes: remainingClasses,
      subjects: state.subjects.filter(s => s.majorId !== id),
      schedules: state.schedules.filter(s => 
        remainingClassIds.has(s.classId) && 
        remainingSubjectIds.has(s.subjectId) && 
        remainingTeacherIds.has(s.teacherId)
      )
    });
  };

  // Grades
  const addGrade = (name: string) => {
    broadcastState({ ...state, grades: [...state.grades, { id: uuidv4(), name }] });
  };
  const deleteGrade = (id: string) => {
    broadcastState({ ...state, grades: state.grades.filter(g => g.id !== id) });
  };

  // Classes
  const addClass = (cls: Omit<Class, 'id'>) => {
    broadcastState({ ...state, classes: [...state.classes, { ...cls, id: uuidv4() }] });
  };
  const updateClass = (cls: Class) => {
    broadcastState({ ...state, classes: state.classes.map(c => c.id === cls.id ? cls : c) });
  };
  const deleteClass = (id: string) => {
    const remainingClasses = state.classes.filter(c => c.id !== id);
    const remainingClassIds = new Set(remainingClasses.map(c => c.id));
    const remainingSubjectIds = new Set(state.subjects.map(s => s.id));
    const remainingTeacherIds = new Set(state.teachers.map(t => t.id));

    broadcastState({ 
      ...state, 
      classes: remainingClasses,
      schedules: state.schedules.filter(s => 
        remainingClassIds.has(s.classId) && 
        remainingSubjectIds.has(s.subjectId) && 
        remainingTeacherIds.has(s.teacherId)
      )
    });
  };
  const deleteClasses = (ids: string[]) => {
    const idSet = new Set(ids);
    const remainingClasses = state.classes.filter(c => !idSet.has(c.id));
    const remainingClassIds = new Set(remainingClasses.map(c => c.id));
    const remainingSubjectIds = new Set(state.subjects.map(s => s.id));
    const remainingTeacherIds = new Set(state.teachers.map(t => t.id));

    broadcastState({ 
      ...state, 
      classes: remainingClasses,
      schedules: state.schedules.filter(s => 
        remainingClassIds.has(s.classId) && 
        remainingSubjectIds.has(s.subjectId) && 
        remainingTeacherIds.has(s.teacherId)
      )
    });
  };
  const clearClasses = () => {
    broadcastState({ ...state, classes: [], schedules: [] });
  };
  const importClasses = (classesToAdd: Omit<Class, 'id'>[]) => {
    let added = 0;
    let updated = 0;
    let failed = 0;
    
    const newClasses = [...state.classes];
    
    classesToAdd.forEach(cls => {
      if (!cls.name || !cls.majorId || !cls.gradeId) {
        failed++;
        return;
      }
      
      const existingIndex = newClasses.findIndex(c => c.name === cls.name && c.majorId === cls.majorId && c.gradeId === cls.gradeId);
      if (existingIndex >= 0) {
        newClasses[existingIndex] = { ...newClasses[existingIndex], ...cls };
        updated++;
      } else {
        newClasses.push({ ...cls, id: uuidv4() });
        added++;
      }
    });
    
    broadcastState({ ...state, classes: newClasses });
    return { added, updated, failed };
  };

  const importMajors = (majorsToAdd: { name: string, departmentName: string }[]) => {
    let added = 0;
    let updated = 0;
    let failed = 0;
    
    const newMajors = [...state.majors];
    
    majorsToAdd.forEach(m => {
      if (!m.name || !m.departmentName) {
        failed++;
        return;
      }
      
      const dept = state.departments.find(d => d.name === m.departmentName);
      if (!dept) {
        failed++;
        return;
      }
      
      const existingIndex = newMajors.findIndex(major => major.name === m.name && major.departmentId === dept.id);
      if (existingIndex >= 0) {
        newMajors[existingIndex] = { ...newMajors[existingIndex], name: m.name, departmentId: dept.id };
        updated++;
      } else {
        newMajors.push({ id: uuidv4(), name: m.name, departmentId: dept.id });
        added++;
      }
    });
    
    broadcastState({ ...state, majors: newMajors });
    return { added, updated, failed };
  };

  // Teachers
  const addTeacher = (teacher: Omit<Teacher, 'id'>) => {
    const existingIndex = state.teachers.findIndex(t => {
      if (teacher.idCard && t.idCard) {
        return t.idCard === teacher.idCard;
      }
      return t.name === teacher.name;
    });

    if (existingIndex >= 0) {
      const updatedTeachers = [...state.teachers];
      updatedTeachers[existingIndex] = {
        ...updatedTeachers[existingIndex],
        ...teacher,
        id: updatedTeachers[existingIndex].id
      };
      broadcastState({ ...state, teachers: updatedTeachers });
    } else {
      broadcastState({ ...state, teachers: [...state.teachers, { ...teacher, id: uuidv4() }] });
    }
  };
  const addTeachers = (newTeachers: Omit<Teacher, 'id'>[]) => {
    let updatedTeachers = [...state.teachers];
    
    newTeachers.forEach(newT => {
      // Find existing teacher by idCard (if provided) or by name
      const existingIndex = updatedTeachers.findIndex(t => {
        if (newT.idCard && t.idCard) {
          return t.idCard === newT.idCard;
        }
        return t.name === newT.name;
      });

      if (existingIndex >= 0) {
        // Update existing
        updatedTeachers[existingIndex] = {
          ...updatedTeachers[existingIndex],
          ...newT,
          // Preserve the original ID
          id: updatedTeachers[existingIndex].id
        };
      } else {
        // Add new
        updatedTeachers.push({ ...newT, id: uuidv4() });
      }
    });

    broadcastState({ ...state, teachers: updatedTeachers });
  };
  const updateTeacher = (teacher: Teacher) => {
    broadcastState({ ...state, teachers: state.teachers.map(t => t.id === teacher.id ? teacher : t) });
  };
  const deleteTeacher = (id: string) => {
    const remainingTeachers = state.teachers.filter(t => t.id !== id);
    const remainingTeacherIds = new Set(remainingTeachers.map(t => t.id));
    const remainingClassIds = new Set(state.classes.map(c => c.id));
    const remainingSubjectIds = new Set(state.subjects.map(s => s.id));

    broadcastState({ 
      ...state, 
      teachers: remainingTeachers,
      schedules: state.schedules.filter(s => 
        remainingTeacherIds.has(s.teacherId) && 
        remainingClassIds.has(s.classId) && 
        remainingSubjectIds.has(s.subjectId)
      )
    });
  };
  const deleteTeachers = (ids: string[]) => {
    const idSet = new Set(ids);
    const remainingTeachers = state.teachers.filter(t => !idSet.has(t.id));
    const remainingTeacherIds = new Set(remainingTeachers.map(t => t.id));
    const remainingClassIds = new Set(state.classes.map(c => c.id));
    const remainingSubjectIds = new Set(state.subjects.map(s => s.id));

    broadcastState({ 
      ...state, 
      teachers: remainingTeachers,
      schedules: state.schedules.filter(s => 
        remainingTeacherIds.has(s.teacherId) && 
        remainingClassIds.has(s.classId) && 
        remainingSubjectIds.has(s.subjectId)
      )
    });
  };

  // Subjects
  const addSubject = (name: string, type: SubjectType, departmentId?: string, majorId?: string) => {
    const exists = state.subjects.some(s => 
      s.name === name && 
      s.departmentId === departmentId && 
      s.majorId === majorId
    );
    if (exists) return;
    broadcastState({ ...state, subjects: [...state.subjects, { id: uuidv4(), name, type, departmentId, majorId }] });
  };
  const addSubjects = (newSubjects: Omit<Subject, 'id'>[]) => {
    const existingSubjects = [...state.subjects];
    const subjectsToAdd: Subject[] = [];
    
    newSubjects.forEach(s => {
      const exists = existingSubjects.some(ex => 
        ex.name === s.name && 
        ex.departmentId === s.departmentId && 
        ex.majorId === s.majorId
      ) || subjectsToAdd.some(ad => 
        ad.name === s.name && 
        ad.departmentId === s.departmentId && 
        ad.majorId === s.majorId
      );
      
      if (!exists) {
        subjectsToAdd.push({ ...s, id: uuidv4() });
      }
    });
    
    broadcastState({ ...state, subjects: [...state.subjects, ...subjectsToAdd] });
  };
  const updateSubject = (subject: Subject) => {
    broadcastState({ ...state, subjects: state.subjects.map(s => s.id === subject.id ? subject : s) });
  };
  const deleteSubject = (id: string) => {
    const remainingSubjects = state.subjects.filter(s => s.id !== id);
    const remainingSubjectIds = new Set(remainingSubjects.map(s => s.id));
    const remainingClassIds = new Set(state.classes.map(c => c.id));
    const remainingTeacherIds = new Set(state.teachers.map(t => t.id));

    broadcastState({ 
      ...state, 
      subjects: remainingSubjects,
      schedules: state.schedules.filter(s => 
        remainingSubjectIds.has(s.subjectId) && 
        remainingClassIds.has(s.classId) && 
        remainingTeacherIds.has(s.teacherId)
      )
    });
  };
  const deleteSubjects = (ids: string[]) => {
    const idSet = new Set(ids);
    const remainingSubjects = state.subjects.filter(s => !idSet.has(s.id));
    const remainingSubjectIds = new Set(remainingSubjects.map(s => s.id));
    const remainingClassIds = new Set(state.classes.map(c => c.id));
    const remainingTeacherIds = new Set(state.teachers.map(t => t.id));

    broadcastState({ 
      ...state, 
      subjects: remainingSubjects,
      schedules: state.schedules.filter(s => 
        remainingSubjectIds.has(s.subjectId) && 
        remainingClassIds.has(s.classId) && 
        remainingTeacherIds.has(s.teacherId)
      )
    });
  };

  const reorderSubject = (id: string, direction: 'up' | 'down') => {
    const index = state.subjects.findIndex(s => s.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === state.subjects.length - 1) return;

    const newSubjects = [...state.subjects];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSubjects[index], newSubjects[targetIndex]] = [newSubjects[targetIndex], newSubjects[index]];

    broadcastState({ ...state, subjects: newSubjects });
  };

  const updateSubjectsOrder = (subjects: Subject[]) => {
    broadcastState({ ...state, subjects });
  };

  // Class Categories
  const addClassCategory = (name: string) => {
    broadcastState({ ...state, classCategories: [...state.classCategories, { id: uuidv4(), name }] });
  };
  const deleteClassCategory = (id: string) => {
    broadcastState({ ...state, classCategories: state.classCategories.filter(c => c.id !== id) });
  };

  // Archives
  const createArchive = (departmentId: string, name: string) => {
    // A department's schedules are those where the class belongs to a major in that department
    const deptMajors = state.majors.filter(m => m.departmentId === departmentId);
    const deptMajorIds = new Set(deptMajors.map(m => m.id));
    const deptClassIds = new Set(state.classes.filter(c => deptMajorIds.has(c.majorId)).map(c => c.id));
    
    // Also include schedules where the subject belongs to the department (for cross-department teaching)
    // Actually, the requirement says "只存档和恢复各自产业部的排课数据" (only archive/restore this department's schedule data).
    // The matrix schedule shows classes belonging to the department. So we archive schedules for these classes.
    const schedulesToArchive = state.schedules.filter(s => deptClassIds.has(s.classId));
    
    const newArchive: Archive = {
      id: uuidv4(),
      departmentId,
      name,
      timestamp: new Date().toISOString(),
      schedules: schedulesToArchive
    };

    let newArchives = [...(state.archives || [])];
    const deptArchives = newArchives.filter(a => a.departmentId === departmentId);
    
    if (deptArchives.length >= 10) {
      // Find the oldest one for this department
      const oldest = [...deptArchives].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0];
      newArchives = newArchives.filter(a => a.id !== oldest.id);
    }
    
    newArchives.push(newArchive);
    broadcastState({ ...state, archives: newArchives });
  };

  const restoreArchive = (archiveId: string) => {
    const archive = state.archives.find(a => a.id === archiveId);
    if (!archive) return;

    const departmentId = archive.departmentId;
    const deptMajors = state.majors.filter(m => m.departmentId === departmentId);
    const deptMajorIds = new Set(deptMajors.map(m => m.id));
    const deptClassIds = new Set(state.classes.filter(c => deptMajorIds.has(c.majorId)).map(c => c.id));

    // Remove current schedules for this department's classes
    const otherSchedules = state.schedules.filter(s => !deptClassIds.has(s.classId));
    
    // Add archived schedules (generate new IDs to avoid conflicts)
    const restoredSchedules = archive.schedules.map(s => ({ ...s, id: uuidv4() }));

    broadcastState({
      ...state,
      schedules: [...otherSchedules, ...restoredSchedules]
    });
  };

  const deleteArchive = (archiveId: string) => {
    broadcastState({
      ...state,
      archives: state.archives.filter(a => a.id !== archiveId)
    });
  };

  return (
    <AppContext.Provider
      value={{
        state,
        user,
        updateSchedule,
        batchUpdateSchedules,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        addMajor,
        updateMajor,
        deleteMajor,
        addGrade,
        deleteGrade,
        addClass,
        updateClass,
        deleteClass,
        deleteClasses,
        clearClasses,
        importClasses,
        importMajors,
        addTeacher,
        addTeachers,
        updateTeacher,
        deleteTeacher,
        deleteTeachers,
        addSubject,
        addSubjects,
        updateSubject,
        deleteSubject,
        deleteSubjects,
        reorderSubject,
        updateSubjectsOrder,
        addClassCategory,
        deleteClassCategory,
        clearSchedules,
        clearDepartmentSchedules,
        createArchive,
        restoreArchive,
        deleteArchive,
        connected,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
